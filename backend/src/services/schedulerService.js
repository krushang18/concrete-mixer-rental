const { prisma } = require("../config/database");
const emailService = require("./emailService");
const Document = require("../models/Document");
const cron = require("cron");

class EmailSchedulerService {
  constructor() {
    this.documentExpiryJob = null;
    this.cleanupJob = null;
  }

  // =============================================================================
  // DOCUMENT EXPIRY EMAIL METHODS
  // =============================================================================

  // Add document expiry notification to queue (only queued emails)
  static async addDocumentExpiryJob(documentInfo) {
    try {
      // Validate input data
      if (
        !documentInfo ||
        !documentInfo.document_id ||
        !documentInfo.machine_number
      ) {
        throw new Error("Invalid document information provided");
      }

      const job = await prisma.emailJob.create({
        data: { type: "document_expiry", data: documentInfo, status: "pending", attempts: 0, maxAttempts: 3, scheduledFor: new Date() },
      });

      console.log(`➕ Document expiry job queued for machine ${documentInfo.machine_number}`);
      return { success: true, jobId: job.id, message: "Document expiry notification queued" };
    } catch (error) {
      console.error("❌ Error adding document expiry job:", error);
      throw error;
    }
  }

  // Send document expiry alert email
  static async sendDocumentExpiryAlert(documentInfo) {
    try {
      // Validate input
      if (
        !documentInfo ||
        !documentInfo.machine_number ||
        !documentInfo.document_type
      ) {
        return { success: false, error: "Invalid document information" };
      }

      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

      if (adminEmails.length === 0) {
        return { success: false, error: "No admin emails configured" };
      }

      const subject = `Document Expiry Alert - ${documentInfo.machine_number} (${documentInfo.document_type})`;

      const daysText =
        documentInfo.days_until_expiry <= 0
          ? "EXPIRED"
          : `${documentInfo.days_until_expiry} days`;

      const urgencyColor =
        documentInfo.days_until_expiry <= 0
          ? "red"
          : documentInfo.days_until_expiry <= 7
          ? "orange"
          : "blue";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0081C9;">Document Expiry Alert</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Machine:</strong> ${documentInfo.machine_number}</p>
            <p><strong>Machine Name:</strong> ${
              documentInfo.machine_name || "N/A"
            }</p>
            <p><strong>Document Type:</strong> ${documentInfo.document_type}</p>
            <p><strong>Expiry Date:</strong> ${new Date(
              documentInfo.expiry_date
            ).toLocaleDateString("en-IN")}</p>
          </div>
          
          <div style="background-color: ${
            urgencyColor === "red"
              ? "#fee"
              : urgencyColor === "orange"
              ? "#fff3cd"
              : "#e7f3ff"
          }; 
                      border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0;">
            <p style="color: ${urgencyColor}; font-weight: bold; margin: 0;">
              ${
                documentInfo.days_until_expiry <= 0
                  ? "⚠️ This document has EXPIRED!"
                  : `⚠️ This document expires in ${daysText}!`
              }
            </p>
          </div>
          
          <p>Please renew this document immediately to avoid compliance issues and ensure uninterrupted operations.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from your Concrete Mixer Rental Management System.
          </p>
        </div>
      `;

      const result = await emailService.sendCustomEmail(
        adminEmails,
        subject,
        htmlContent,
        { priority: "high" }
      );

      return result;
    } catch (error) {
      console.error("❌ Error sending document expiry alert:", error);
      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // MAIN PROCESSING METHOD - Enhanced to do BOTH checking and processing
  // =============================================================================

  // Enhanced processDocumentExpiryJobs - Processes scheduled jobs
  static async processDocumentExpiryJobs() {
    try {
      console.log("🔄 Processing scheduled document expiry jobs...");

      // ====================================================================
      // STEP 1: PROCESS PENDING JOBS THAT ARE DUE
      // ====================================================================

      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          type: "document_expiry",
          status: "pending",
          attempts: { lt: 3 },
          OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
        },
        orderBy: { scheduledFor: "asc" },
        take: 50,
      });

      console.log(
        `📬 Found ${pendingJobs.length} due email jobs to process`
      );

      let processedCount = 0;
      let completedCount = 0;
      let failedCount = 0;

      for (const job of pendingJobs) {
        if (!job || !job.id) {
          console.warn(`⚠️ Skipping invalid job:`, job);
          continue;
        }

        try {
          // Validate and parse job data
          if (!job.data) {
            throw new Error(`Job ${job.id} has no data`);
          }

          const documentInfo = job.data;

          if (!documentInfo?.document_id || !documentInfo?.machine_number) {
            throw new Error(`Job ${job.id} has incomplete document info`);
          }

          // Mark as processing
          await prisma.emailJob.update({ where: { id: job.id }, data: { status: "processing", attempts: { increment: 1 } } });

          const emailResult = await this.sendDocumentExpiryAlert(documentInfo);

          if (emailResult && emailResult.success) {
            await prisma.emailJob.update({ where: { id: job.id }, data: { status: "completed", processedAt: new Date(), error: null } });
            completedCount++;
            console.log(`✅ Email job ${job.id} completed successfully`);
          } else {
            const currentAttempts = (job.attempts || 0) + 1;
            const maxAttempts = job.maxAttempts || 3;

            if (currentAttempts >= maxAttempts) {
              await prisma.emailJob.update({ where: { id: job.id }, data: { status: "failed", error: emailResult?.error || "Max attempts reached" } });
              failedCount++;
              console.error(`❌ Job ${job.id} failed permanently: ${emailResult?.error || "Unknown error"}`);
            } else {
              await prisma.emailJob.update({ where: { id: job.id }, data: { status: "pending", error: emailResult?.error || "Email send failed" } });
              console.log(`🔄 Job ${job.id} reset for retry (${currentAttempts}/${maxAttempts})`);
            }
          }

          processedCount++;
        } catch (jobError) {
          console.error(`❌ Error processing job ${job.id}:`, jobError.message);
          try {
            const currentAttempts = (job.attempts || 0) + 1;
            const maxAttempts = job.maxAttempts || 3;
            if (currentAttempts >= maxAttempts) {
              await prisma.emailJob.update({ where: { id: job.id }, data: { status: "failed", error: jobError.message } });
              failedCount++;
            } else {
              await prisma.emailJob.update({ where: { id: job.id }, data: { status: "pending", error: jobError.message } });
            }
          } catch (updateError) {
            console.error(`❌ Critical: Failed to update job ${job.id}:`, updateError.message);
          }
        }
      }

      // ====================================================================
      // SUMMARY
      // ====================================================================

      console.log("\n" + "=".repeat(50));
      console.log("📊 DOCUMENT EXPIRY PROCESSING SUMMARY");
      console.log("=".repeat(50));
      console.log(`📬 Due jobs processed: ${processedCount}`);
      console.log(`✅ Jobs completed: ${completedCount}`);
      console.log(`❌ Jobs failed: ${failedCount}`);
      console.log("=".repeat(50));

      console.log("✅ Document expiry job processing completed");
    } catch (error) {
      console.error(
        "❌ Critical error in document expiry job processing:",
        error
      );
      throw error; // Re-throw to ensure proper error handling
    }
  }

  // =============================================================================
  // CRON JOB MANAGEMENT
  // =============================================================================

  // Initialize cron jobs
  static initializeCronJobs() {
    try {
      console.log("⚙️ Initializing email scheduler cron jobs...");

      // Process document expiry jobs every 4 hours: 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM IST
      this.documentExpiryJob = new cron.CronJob(
        "0 */4 * * *",
        () => {
          this.processDocumentExpiryJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      // Clean up old jobs weekly on Sunday at 2 AM
      this.cleanupJob = new cron.CronJob(
        "0 2 * * 0",
        () => {
          this.cleanupOldJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      console.log("✅ Email scheduler cron jobs initialized");
      console.log("📋 Document expiry check: every 4 hours (12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM IST)");
      console.log("🧹 Cleanup: Sunday 2 AM weekly");
    } catch (error) {
      console.error("❌ Error initializing cron jobs:", error);
    }
  }

  // Start cron jobs
  static startCronJobs() {
    try {
      if (!this.documentExpiryJob) {
        this.initializeCronJobs();
      }

      this.documentExpiryJob.start();
      if (this.cleanupJob) this.cleanupJob.start();

      console.log("✅ Email scheduler cron jobs started successfully");

      // Run immediately on server start so no jobs are missed
      console.log("🚀 Running initial document expiry check on startup...");
      this.processDocumentExpiryJobs().catch(err => {
        console.error("❌ Error during initial startup check:", err);
      });

    } catch (error) {
      console.error("❌ Error starting cron jobs:", error);
    }
  }

  // Stop cron jobs
  static stopCronJobs() {
    try {
      if (this.documentExpiryJob) this.documentExpiryJob.stop();
      if (this.cleanupJob) this.cleanupJob.stop();

      console.log("🛑 Email scheduler cron jobs stopped");
    } catch (error) {
      console.error("❌ Error stopping cron jobs:", error);
    }
  }

  // Aliases for compatibility
  static startScheduler() {
      return this.startCronJobs();
  }

  static stopScheduler() {
      return this.stopCronJobs();
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Clean up old completed/failed jobs
  static async cleanupOldJobs() {
    try {
      console.log("🧹 Cleaning up old email jobs...");

      const cutoff = new Date(Date.now() - 30 * 86400000);
      const result = await prisma.emailJob.deleteMany({
        where: { createdAt: { lt: cutoff }, status: { in: ["completed", "failed"] } },
      });

      console.log(`✅ Cleaned up ${result.count} old email jobs`);
    } catch (error) {
      console.error("❌ Error cleaning up old jobs:", error);
    }
  }
}

module.exports = EmailSchedulerService;
