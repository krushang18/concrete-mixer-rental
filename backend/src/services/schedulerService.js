const { executeQuery } = require("../config/database");
const emailService = require("./emailService");
const cron = require("cron");

class EmailSchedulerService {
  constructor() {
    // Initialize job properties
    this.documentExpiryMorningJob = null;
    this.documentExpiryAfternoonJob = null;
    this.documentExpiryEveningJob = null;
    this.cleanupJob = null;
  }

  // =============================================================================
  // CUSTOMER EMAIL METHODS (Immediate sending - no queueing)
  // =============================================================================

  // Send customer query emails immediately (no queueing needed)
  static async sendCustomerQueryEmails(customerData) {
    try {
      console.log("📧 Sending customer query emails...");
      const result = await emailService.sendNewQueryEmails(customerData);

      if (result.success) {
        console.log("✅ Customer query emails sent successfully");
      } else {
        console.error("❌ Failed to send customer query emails:", result.error);
      }

      return result;
    } catch (error) {
      console.error("❌ Error sending customer query emails:", error);
      return { success: false, error: error.message };
    }
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

      const query = `
        INSERT INTO email_jobs (
          type,
          data,
          status,
          attempts,
          max_attempts,
          created_at,
          scheduled_for
        ) VALUES ('document_expiry', ?, 'pending', 0, 3, NOW(), NOW())
      `;

      const result = await executeQuery(query, [JSON.stringify(documentInfo)]);

      console.log(
        `➕ Document expiry job queued for machine ${documentInfo.machine_number}`
      );

      return {
        success: true,
        jobId: result.insertId,
        message: "Document expiry notification queued",
      };
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

  // Enhanced processDocumentExpiryJobs - checks for new documents AND processes pending jobs
  static async processDocumentExpiryJobs() {
    try {
      console.log(
        "🔄 Processing document expiry jobs (checking new + processing pending)..."
      );

      // ====================================================================
      // STEP 1: CHECK FOR NEW EXPIRING DOCUMENTS AND QUEUE THEM
      // ====================================================================

      console.log("📋 Step 1: Checking for new expiring documents...");

      let newDocumentsQueued = 0;

      try {
        // Get documents expiring in next 14 days that haven't been notified today
        const expiringDocuments = await executeQuery(`
          SELECT 
            md.id,
            md.document_type,
            md.expiry_date,
            m.machine_number,
            m.name as machine_name,
            DATEDIFF(md.expiry_date, CURDATE()) as days_until_expiry
          FROM machine_documents md
          JOIN machines m ON md.machine_id = m.id
          WHERE m.is_active = 1 
          AND DATEDIFF(md.expiry_date, CURDATE()) <= 14
          AND NOT EXISTS (
            SELECT 1 FROM email_jobs ej 
            WHERE ej.type = 'document_expiry' 
            AND JSON_EXTRACT(ej.data, '$.document_id') = md.id
            AND ej.status = 'completed'
            AND DATE(ej.created_at) = CURDATE()
          )
          ORDER BY md.expiry_date ASC
          LIMIT 20
        `);

        console.log(
          `📊 Found ${expiringDocuments.length} new documents requiring notifications`
        );

        // Queue new expiring documents
        for (const doc of expiringDocuments) {
          if (!doc || !doc.id || !doc.machine_number) {
            console.warn(`⚠️ Skipping invalid document:`, doc);
            continue;
          }

          const documentInfo = {
            document_id: doc.id,
            machine_number: doc.machine_number,
            machine_name: doc.machine_name || "Unknown Machine",
            document_type: doc.document_type || "Unknown Document",
            expiry_date: doc.expiry_date,
            days_until_expiry: doc.days_until_expiry || 0,
          };

          try {
            await this.addDocumentExpiryJob(documentInfo);
            newDocumentsQueued++;
            console.log(
              `➕ Queued notification for ${doc.machine_number} - ${doc.document_type}`
            );
          } catch (queueError) {
            console.error(
              `❌ Failed to queue ${doc.machine_number}:`,
              queueError.message
            );
          }
        }
      } catch (checkError) {
        console.error(
          "❌ Error checking for new expiring documents:",
          checkError.message
        );
        // Continue to processing existing jobs even if this fails
      }

      // ====================================================================
      // STEP 2: PROCESS ALL PENDING JOBS (including newly queued ones)
      // ====================================================================

      console.log("📬 Step 2: Processing pending email jobs...");

      const pendingJobs = await executeQuery(`
        SELECT 
          id, 
          data, 
          attempts,
          max_attempts,
          created_at
        FROM email_jobs 
        WHERE type = 'document_expiry' 
        AND status = 'pending'
        AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 25
      `);

      console.log(
        `📬 Found ${pendingJobs.length} pending email jobs to process`
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

          let documentInfo;
          try {
            documentInfo = JSON.parse(job.data);
          } catch (parseError) {
            throw new Error(
              `Job ${job.id} has invalid JSON: ${parseError.message}`
            );
          }

          if (!documentInfo?.document_id || !documentInfo?.machine_number) {
            throw new Error(`Job ${job.id} has incomplete document info`);
          }

          // Mark as processing
          await executeQuery(
            'UPDATE email_jobs SET status = "processing", attempts = attempts + 1, updated_at = NOW() WHERE id = ?',
            [job.id]
          );

          // Try to send email
          const emailResult = await this.sendDocumentExpiryAlert(documentInfo);

          if (emailResult && emailResult.success) {
            // Success - mark as completed
            await executeQuery(
              'UPDATE email_jobs SET status = "completed", processed_at = NOW(), error = NULL, updated_at = NOW() WHERE id = ?',
              [job.id]
            );

            completedCount++;
            console.log(`✅ Email job ${job.id} completed successfully`);
          } else {
            // Failed - check if we should retry or mark as permanently failed
            const currentAttempts = (job.attempts || 0) + 1;
            const maxAttempts = job.max_attempts || 3;

            if (currentAttempts >= maxAttempts) {
              // Max attempts reached - permanent failure
              await executeQuery(
                'UPDATE email_jobs SET status = "failed", error = ?, updated_at = NOW() WHERE id = ?',
                [emailResult?.error || "Max attempts reached", job.id]
              );

              failedCount++;
              console.error(
                `❌ Job ${job.id} failed permanently: ${
                  emailResult?.error || "Unknown error"
                }`
              );
            } else {
              // Reset to pending for retry
              await executeQuery(
                'UPDATE email_jobs SET status = "pending", error = ?, updated_at = NOW() WHERE id = ?',
                [emailResult?.error || "Email send failed", job.id]
              );

              console.log(
                `🔄 Job ${job.id} reset for retry (${currentAttempts}/${maxAttempts})`
              );
            }
          }

          processedCount++;
        } catch (jobError) {
          console.error(`❌ Error processing job ${job.id}:`, jobError.message);

          try {
            // Handle job processing errors
            const currentAttempts = (job.attempts || 0) + 1;
            const maxAttempts = job.max_attempts || 3;

            if (currentAttempts >= maxAttempts) {
              await executeQuery(
                'UPDATE email_jobs SET status = "failed", error = ?, updated_at = NOW() WHERE id = ?',
                [jobError.message, job.id]
              );
              failedCount++;
            } else {
              await executeQuery(
                'UPDATE email_jobs SET status = "pending", error = ?, updated_at = NOW() WHERE id = ?',
                [jobError.message, job.id]
              );
            }
          } catch (updateError) {
            console.error(
              `❌ Critical: Failed to update job ${job.id}:`,
              updateError.message
            );
          }
        }
      }

      // ====================================================================
      // SUMMARY
      // ====================================================================

      console.log("\n" + "=".repeat(50));
      console.log("📊 DOCUMENT EXPIRY PROCESSING SUMMARY");
      console.log("=".repeat(50));
      console.log(`📋 New documents queued: ${newDocumentsQueued}`);
      console.log(`📬 Pending jobs processed: ${processedCount}`);
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
  // CRON JOB MANAGEMENT - Perfect Implementation
  // =============================================================================

  // Initialize cron jobs - PERFECT VERSION
  static initializeCronJobs() {
    try {
      console.log("⚙️ Initializing email scheduler cron jobs...");

      // Process document expiry jobs (enhanced version) - Morning
      this.documentExpiryMorningJob = new cron.CronJob(
        "0 8 * * *", // 8:00 AM
        () => {
          this.processDocumentExpiryJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      // Process document expiry jobs (enhanced version) - Afternoon
      this.documentExpiryAfternoonJob = new cron.CronJob(
        "0 15 * * *", // 3:00 PM
        () => {
          this.processDocumentExpiryJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      // Process document expiry jobs (enhanced version) - Evening
      this.documentExpiryEveningJob = new cron.CronJob(
        "0 19 * * *", // 7:00 PM
        () => {
          this.processDocumentExpiryJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      // Clean up old jobs weekly on Sunday at 2 AM
      this.cleanupJob = new cron.CronJob(
        "0 2 * * 0", // Weekly on Sunday at 2 AM
        () => {
          this.cleanupOldJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      console.log("✅ Email scheduler cron jobs initialized - 4 jobs total");
      console.log("📋 Document expiry: 8 AM, 3 PM, 7 PM daily");
      console.log("🧹 Cleanup: Sunday 2 AM weekly");
    } catch (error) {
      console.error("❌ Error initializing cron jobs:", error);
    }
  }

  // Start cron jobs - FIXED VERSION
  static startCronJobs() {
    try {
      if (!this.documentExpiryMorningJob) {
        this.initializeCronJobs();
      }

      this.documentExpiryMorningJob.start();
      this.documentExpiryAfternoonJob.start();
      this.documentExpiryEveningJob.start();
      this.cleanupJob.start();

      console.log("✅ Email scheduler cron jobs started successfully");
    } catch (error) {
      console.error("❌ Error starting cron jobs:", error);
    }
  }

  // Stop cron jobs - FIXED VERSION
  static stopCronJobs() {
    try {
      if (this.documentExpiryMorningJob) this.documentExpiryMorningJob.stop();
      if (this.documentExpiryAfternoonJob)
        this.documentExpiryAfternoonJob.stop();
      if (this.documentExpiryEveningJob) this.documentExpiryEveningJob.stop();
      if (this.cleanupJob) this.cleanupJob.stop();

      console.log("🛑 Email scheduler cron jobs stopped");
    } catch (error) {
      console.error("❌ Error stopping cron jobs:", error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Clean up old completed/failed jobs
  static async cleanupOldJobs() {
    try {
      console.log("🧹 Cleaning up old email jobs...");

      const result = await executeQuery(`
        DELETE FROM email_jobs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status IN ('completed', 'failed')
      `);

      console.log(`✅ Cleaned up ${result.affectedRows} old email jobs`);
    } catch (error) {
      console.error("❌ Error cleaning up old jobs:", error);
    }
  }

  // Get recent email jobs for admin monitoring
  static async getRecentJobs(limit = 20) {
    try {
      const jobs = await executeQuery(
        `
        SELECT 
          id,
          type,
          status,
          error,
          attempts,
          max_attempts,
          created_at,
          processed_at
        FROM email_jobs 
        ORDER BY created_at DESC
        LIMIT ?
      `,
        [limit]
      );

      return jobs;
    } catch (error) {
      console.error("❌ Error getting recent email jobs:", error);
      throw error;
    }
  }

  // Get email statistics
  static async getEmailStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as last_24h
        FROM email_jobs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      return (
        stats[0] || {
          total_jobs: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          last_24h: 0,
        }
      );
    } catch (error) {
      console.error("❌ Error getting email stats:", error);
      return {
        total_jobs: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        last_24h: 0,
      };
    }
  }

  // Retry failed email job (for admin management)
  static async retryFailedJob(jobId) {
    try {
      const result = await executeQuery(
        `
        UPDATE email_jobs 
        SET status = 'pending', attempts = 0, error = NULL, updated_at = NOW()
        WHERE id = ? AND status = 'failed'
      `,
        [jobId]
      );

      if (result.affectedRows > 0) {
        console.log(`🔄 Email job ${jobId} queued for retry`);
        return { success: true, message: "Job queued for retry" };
      } else {
        return {
          success: false,
          message: "Job not found or not in failed status",
        };
      }
    } catch (error) {
      console.error("❌ Error retrying email job:", error);
      throw error;
    }
  }

  // =============================================================================
  // LEGACY METHODS - Keep for backward compatibility (but don't use in cron)
  // =============================================================================

  // Legacy method - kept for backward compatibility but not used in cron jobs
  static async checkAndSendDocumentExpiryNotifications() {
    console.warn(
      "⚠️ checkAndSendDocumentExpiryNotifications is deprecated. Use processDocumentExpiryJobs instead."
    );
    return await this.processDocumentExpiryJobs();
  }
}

module.exports = EmailSchedulerService;
