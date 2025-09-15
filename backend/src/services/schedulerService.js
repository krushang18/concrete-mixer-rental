const { executeQuery } = require("../config/database");
const emailService = require("./emailService");
const cron = require("cron");

class EmailSchedulerService {
  constructor() {
    this.documentExpiryJob = null;
    this.cleanupJob = null;
  }

  // Send customer query emails immediately (no queueing needed)
  static async sendCustomerQueryEmails(customerData) {
    try {
      console.log("Sending customer query emails...");
      const result = await emailService.sendNewQueryEmails(customerData);

      if (result.success) {
        console.log("Customer query emails sent successfully");
      } else {
        console.error("Failed to send customer query emails:", result.error);
      }

      return result;
    } catch (error) {
      console.error("Error sending customer query emails:", error);
      return { success: false, error: error.message };
    }
  }

  // Add document expiry notification to queue (only queued emails)
  static async addDocumentExpiryJob(documentInfo) {
    try {
      const query = `
        INSERT INTO email_jobs (
          type,
          data,
          status,
          created_at,
          scheduled_for
        ) VALUES ('document_expiry', ?, 'pending', NOW(), NOW())
      `;

      const result = await executeQuery(query, [JSON.stringify(documentInfo)]);

      console.log(
        `Document expiry job queued for machine ${documentInfo.machine_number}`
      );

      return {
        success: true,
        jobId: result.insertId,
        message: "Document expiry notification queued",
      };
    } catch (error) {
      console.error("Error adding document expiry job:", error);
      throw error;
    }
  }

  // Send document expiry alert email
  static async sendDocumentExpiryAlert(documentInfo) {
    try {
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
      console.error("Error sending document expiry alert:", error);
      return { success: false, error: error.message };
    }
  }

  // Process queued document expiry jobs (runs periodically)
  static async processDocumentExpiryJobs() {
    try {
      console.log("Processing document expiry jobs...");

      const pendingJobs = await executeQuery(`
        SELECT * FROM email_jobs 
        WHERE type = 'document_expiry' 
        AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);

      console.log(`Found ${pendingJobs.length} pending document expiry jobs`);

      for (const job of pendingJobs) {
        try {
          // Mark as processing
          await executeQuery(
            'UPDATE email_jobs SET status = "processing" WHERE id = ?',
            [job.id]
          );

          const documentInfo = JSON.parse(job.data);
          const result = await this.sendDocumentExpiryAlert(documentInfo);

          if (result.success) {
            await executeQuery(
              'UPDATE email_jobs SET status = "completed", processed_at = NOW() WHERE id = ?',
              [job.id]
            );
            console.log(`Document expiry job ${job.id} completed successfully`);
          } else {
            await executeQuery(
              'UPDATE email_jobs SET status = "failed", error = ? WHERE id = ?',
              [result.error || "Unknown error", job.id]
            );
            console.error(
              `Document expiry job ${job.id} failed:`,
              result.error
            );
          }
        } catch (jobError) {
          console.error(`Error processing job ${job.id}:`, jobError);
          await executeQuery(
            'UPDATE email_jobs SET status = "failed", error = ? WHERE id = ?',
            [jobError.message, job.id]
          );
        }
      }

      console.log("Document expiry job processing completed");
    } catch (error) {
      console.error("Error processing document expiry jobs:", error);
    }
  }

  // Check for documents expiring and send notifications immediately (combined approach)
  static async checkAndSendDocumentExpiryNotifications() {
    try {
      console.log(
        "Checking for expiring documents and sending notifications..."
      );

      // Get documents expiring in next 14 days or already expired
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
      `);

      console.log(
        `Found ${expiringDocuments.length} documents requiring notifications`
      );

      let successCount = 0;
      let failureCount = 0;

      for (const doc of expiringDocuments) {
        const documentInfo = {
          document_id: doc.id,
          machine_number: doc.machine_number,
          machine_name: doc.machine_name,
          document_type: doc.document_type,
          expiry_date: doc.expiry_date,
          days_until_expiry: doc.days_until_expiry,
        };

        try {
          // Try to send email immediately
          const result = await this.sendDocumentExpiryAlert(documentInfo);

          if (result.success) {
            // Log successful email in database for tracking
            await executeQuery(
              `
              INSERT INTO email_jobs (
                type, data, status, attempts, max_attempts, 
                created_at, processed_at, scheduled_for
              ) VALUES ('document_expiry', ?, 'completed', 1, 1, NOW(), NOW(), NOW())
            `,
              [JSON.stringify(documentInfo)]
            );

            successCount++;
            console.log(
              `Document expiry notification sent for ${doc.machine_number} - ${doc.document_type}`
            );
          } else {
            // Queue for retry if immediate send fails
            await this.addDocumentExpiryJob(documentInfo);
            failureCount++;
            console.log(
              `Document expiry notification queued for retry: ${doc.machine_number} - ${doc.document_type}`
            );
          }
        } catch (error) {
          // Queue for retry on any error
          await this.addDocumentExpiryJob(documentInfo);
          failureCount++;
          console.error(
            `Error sending notification for ${doc.machine_number} - ${doc.document_type}:`,
            error.message
          );
        }
      }

      console.log(
        `Document expiry notifications: ${successCount} sent, ${failureCount} queued for retry`
      );

      // If there were failures, also process any existing pending jobs
      if (failureCount > 0) {
        await this.processDocumentExpiryJobs();
      }
    } catch (error) {
      console.error(
        "Error checking and sending document expiry notifications:",
        error
      );
    }
  }

  // Initialize cron jobs (simplified)
  static initializeCronJobs() {
    try {
      console.log("Initializing email scheduler cron jobs...");

      // Process document expiry jobs every 30 minutes
      this.documentExpiryJob = new cron.CronJob(
        "*/30 * * * *", // Every 30 minutes
        () => {
          this.processDocumentExpiryJobs();
        },
        null,
        false,
        "Asia/Kolkata"
      );

      // Check for new document expiry notifications daily at 9 AM
      this.documentCheckJob = new cron.CronJob(
        "0 9 * * *", // Daily at 9 AM
        () => {
          this.checkAndQueueDocumentExpiryNotifications();
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

      console.log("Email scheduler cron jobs initialized");
    } catch (error) {
      console.error("Error initializing cron jobs:", error);
    }
  }

  // Start cron jobs
  static startCronJobs() {
    try {
      if (!this.documentExpiryJob) {
        this.initializeCronJobs();
      }

      this.documentExpiryJob.start();
      this.documentCheckJob.start();
      this.cleanupJob.start();

      console.log("Email scheduler cron jobs started");
    } catch (error) {
      console.error("Error starting cron jobs:", error);
    }
  }

  // Stop cron jobs
  static stopCronJobs() {
    try {
      if (this.documentExpiryJob) this.documentExpiryJob.stop();
      if (this.documentCheckJob) this.documentCheckJob.stop();
      if (this.cleanupJob) this.cleanupJob.stop();

      console.log("Email scheduler cron jobs stopped");
    } catch (error) {
      console.error("Error stopping cron jobs:", error);
    }
  }

  // Clean up old completed/failed jobs
  static async cleanupOldJobs() {
    try {
      console.log("Cleaning up old email jobs...");

      const result = await executeQuery(`
        DELETE FROM email_jobs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status IN ('completed', 'failed')
      `);

      console.log(`Cleaned up ${result.affectedRows} old email jobs`);
    } catch (error) {
      console.error("Error cleaning up old jobs:", error);
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
      console.error("Error getting recent email jobs:", error);
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
      console.error("Error getting email stats:", error);
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
        SET status = 'pending', attempts = 0, error = NULL 
        WHERE id = ? AND status = 'failed'
      `,
        [jobId]
      );

      if (result.affectedRows > 0) {
        console.log(`Email job ${jobId} queued for retry`);
        return { success: true, message: "Job queued for retry" };
      } else {
        return {
          success: false,
          message: "Job not found or not in failed status",
        };
      }
    } catch (error) {
      console.error("Error retrying email job:", error);
      throw error;
    }
  }
}

module.exports = EmailSchedulerService;
