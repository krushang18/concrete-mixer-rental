const Document = require("../models/Document");
const EmailSchedulerService = require("../services/schedulerService");
const { validationResult } = require("express-validator");
const { executeQuery } = require("../config/database");

class DocumentController {
  // Get all machine documents
  static async getAll(req, res) {
    try {
      const filters = {
        machine_id: req.query.machine_id,
        document_type: req.query.document_type,
        status: req.query.status,
        expiring_within_days: req.query.expiring_within_days,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const documents = await Document.getAll(filters);

      res.json({
        success: true,
        message: "Documents retrieved successfully",
        data: documents,
        count: documents.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in DocumentController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve documents",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get document by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      const document = await Document.getById(parseInt(id));

      if (!document) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      res.json({
        success: true,
        message: "Document retrieved successfully",
        data: document,
      });
    } catch (error) {
      console.error("Error in DocumentController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get documents for a specific machine
  static async getByMachine(req, res) {
    try {
      const { machineId } = req.params;

      if (!machineId || isNaN(machineId)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
        });
      }

      const documents = await Document.getByMachine(parseInt(machineId));

      res.json({
        success: true,
        message: "Machine documents retrieved successfully",
        data: documents,
        count: documents.length,
        machineId: parseInt(machineId),
      });
    } catch (error) {
      console.error("Error in DocumentController.getByMachine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine documents",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create or update document
  static async createOrUpdate(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const documentData = {
        machine_id: parseInt(req.body.machine_id),
        document_type: req.body.document_type,
        expiry_date: req.body.expiry_date,
        last_renewed_date: req.body.last_renewed_date,
        remarks: req.body.remarks?.trim(),
      };

      const result = await Document.createOrUpdate(documentData);

      if (result.success) {
        res.status(result.action === "created" ? 201 : 200).json({
          success: true,
          message: result.message,
          data: { id: result.id },
          action: result.action,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error("Error in DocumentController.createOrUpdate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create/update document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Renew document (update expiry date)
  static async renew(req, res) {
    try {
      const { id } = req.params;
      const { new_expiry_date, remarks } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      if (!new_expiry_date) {
        return res.status(400).json({
          success: false,
          message: "New expiry date is required",
        });
      }

      const result = await Document.renew(
        parseInt(id),
        new_expiry_date,
        remarks
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in DocumentController.renew:", error);
      res.status(500).json({
        success: false,
        message: "Failed to renew document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete document
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      const result = await Document.delete(parseInt(id));

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in DocumentController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get expiring documents
  static async getExpiring(req, res) {
    try {
      const daysAhead = req.query.days ? parseInt(req.query.days) : 14;

      const documents = await Document.getExpiringDocuments(daysAhead);

      res.json({
        success: true,
        message: `Documents expiring in ${daysAhead} days retrieved successfully`,
        data: documents,
        count: documents.length,
        daysAhead: daysAhead,
      });
    } catch (error) {
      console.error("Error in DocumentController.getExpiring:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve expiring documents",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get document statistics
  // Fixed getStats method with 'next' parameter to avoid middleware conflicts
  static async getStats(req, res, next, returnData = false) {
    try {
      console.log("DocumentController.getStats: Starting...");
      const stats = await Document.getStats();
      console.log("DocumentController.getStats: Got stats from model:", stats);

      const responseData = {
        success: true,
        message: "Document statistics retrieved successfully",
        data: {
          totalDocuments: parseInt(stats.total_documents) || 0,
          expiredDocuments: parseInt(stats.expired_documents) || 0,
          expiringThisWeek: parseInt(stats.expiring_this_week) || 0,
          expiringThisMonth: parseInt(stats.expiring_this_month) || 0,
          averageDaysUntilExpiry:
            Math.round(parseFloat(stats.avg_days_until_expiry)) || 0,
          lastUpdated: new Date().toISOString(),
        },
      };

      if (returnData) {
        return res.json(responseData.data);
      }

      console.log("DocumentController.getStats: Sending JSON response");
      res.json(responseData);
    } catch (error) {
      console.error("Error in DocumentController.getStats:", error);

      if (returnData) {
        return res.json({
          totalDocuments: 0,
          expiredDocuments: 0,
          expiringThisWeek: 0,
          expiringThisMonth: 0,
          averageDaysUntilExpiry: 0,
          error: "Failed to load document statistics",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to retrieve document statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Configure document notifications
  static async configureNotifications(req, res) {
    try {
      const { id } = req.params;
      const { notification_days } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      if (!notification_days || !Array.isArray(notification_days)) {
        return res.status(400).json({
          success: false,
          message: "Notification days array is required",
        });
      }

      const result = await Document.configureNotifications(
        parseInt(id),
        notification_days
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error(
        "Error in DocumentController.configureNotifications:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to configure notifications",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get notification settings
  static async getNotificationSettings(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      const notifications = await Document.getNotificationSettings(
        parseInt(id)
      );

      res.json({
        success: true,
        message: "Notification settings retrieved successfully",
        data: notifications,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.getNotificationSettings:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notification settings",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get notification history
  static async getNotificationHistory(req, res) {
    try {
      const { id } = req.params;
      const documentId = id ? parseInt(id) : null;

      if (id && isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid document ID is required",
        });
      }

      const history = await Document.getNotificationHistory(documentId);

      res.json({
        success: true,
        message: "Notification history retrieved successfully",
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.getNotificationHistory:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notification history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Bulk renew documents
  static async bulkRenew(req, res) {
    try {
      const { document_ids, new_expiry_dates, remarks } = req.body;

      if (
        !document_ids ||
        !Array.isArray(document_ids) ||
        document_ids.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Document IDs array is required",
        });
      }

      if (!new_expiry_dates || !Array.isArray(new_expiry_dates)) {
        return res.status(400).json({
          success: false,
          message: "New expiry dates array is required",
        });
      }

      const result = await Document.bulkRenew({
        document_ids,
        new_expiry_dates,
        remarks,
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          updatedCount: result.updatedCount,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in DocumentController.bulkRenew:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk renew documents",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Check notifications due and send alerts via email
  static async checkNotificationsDue(req, res) {
    try {
      const notificationsDue = await Document.checkNotificationsDue();

      let emailsSent = 0;
      let emailsFailed = 0;

      // Send email notifications for each document
      for (const notification of notificationsDue) {
        try {
          const documentInfo = {
            document_id: notification.document_id,
            machine_number: notification.machine_number,
            machine_name: notification.machine_name,
            document_type: notification.document_type,
            expiry_date: notification.expiry_date,
            days_until_expiry: notification.days_until_expiry,
          };

          // Send immediate email or queue for later processing
          const emailResult =
            await EmailSchedulerService.sendDocumentExpiryAlert(documentInfo);

          if (emailResult.success) {
            emailsSent++;
            console.log(
              `Document expiry alert sent for ${notification.machine_number} - ${notification.document_type}`
            );
          } else {
            // Queue for retry if immediate email fails
            await EmailSchedulerService.addDocumentExpiryJob(documentInfo);
            emailsFailed++;
            console.log(
              `Document expiry alert queued for retry: ${notification.machine_number} - ${notification.document_type}`
            );
          }
        } catch (emailError) {
          console.error(
            `Error sending notification for document ${notification.document_id}:`,
            emailError
          );
          emailsFailed++;
        }
      }

      res.json({
        success: true,
        message: "Notification check completed",
        data: {
          notificationsDue: notificationsDue,
          emailResults: {
            sent: emailsSent,
            failed: emailsFailed,
            total: notificationsDue.length,
          },
        },
        count: notificationsDue.length,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.checkNotificationsDue:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to check notifications due",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Send immediate document expiry alerts (manual trigger)
  static async sendExpiryAlerts(req, res) {
    try {
      const { document_ids, force_send } = req.body;

      let documentsToProcess = [];

      if (document_ids && Array.isArray(document_ids)) {
        // Send alerts for specific documents
        for (const docId of document_ids) {
          const document = await Document.getById(docId);
          if (document) {
            documentsToProcess.push({
              document_id: document.id,
              machine_number: document.machine_number,
              machine_name: document.machine_name,
              document_type: document.document_type,
              expiry_date: document.expiry_date,
              days_until_expiry: document.days_until_expiry,
            });
          }
        }
      } else {
        // Send alerts for all expiring documents (within 14 days)
        const expiringDocs = await Document.getExpiringDocuments(14);
        documentsToProcess = expiringDocs.map((doc) => ({
          document_id: doc.id,
          machine_number: doc.machine_number,
          machine_name: doc.machine_name,
          document_type: doc.document_type,
          expiry_date: doc.expiry_date,
          days_until_expiry: doc.days_until_expiry,
        }));
      }

      let emailsSent = 0;
      let emailsFailed = 0;

      for (const docInfo of documentsToProcess) {
        try {
          // Check if alert was already sent today (unless force_send is true)
          if (!force_send) {
            const alreadySent = await executeQuery(
              `
              SELECT 1 FROM email_jobs 
              WHERE type = 'document_expiry' 
              AND JSON_EXTRACT(data, '$.document_id') = ?
              AND status = 'completed'
              AND DATE(created_at) = CURDATE()
              LIMIT 1
            `,
              [docInfo.document_id]
            );

            if (alreadySent.length > 0) {
              console.log(
                `Alert already sent today for document ${docInfo.document_id}, skipping`
              );
              continue;
            }
          }

          const emailResult =
            await EmailSchedulerService.sendDocumentExpiryAlert(docInfo);

          if (emailResult.success) {
            emailsSent++;

            // Log successful email in database
            await executeQuery(
              `
              INSERT INTO email_jobs (
                type, data, status, attempts, max_attempts, 
                created_at, processed_at, scheduled_for
              ) VALUES ('document_expiry', ?, 'completed', 1, 1, NOW(), NOW(), NOW())
            `,
              [JSON.stringify(docInfo)]
            );

            console.log(
              `Manual document expiry alert sent for ${docInfo.machine_number} - ${docInfo.document_type}`
            );
          } else {
            emailsFailed++;
            console.error(
              `Failed to send manual alert for ${docInfo.machine_number} - ${docInfo.document_type}:`,
              emailResult.error
            );
          }
        } catch (error) {
          emailsFailed++;
          console.error(
            `Error processing document ${docInfo.document_id}:`,
            error
          );
        }
      }

      res.json({
        success: true,
        message: `Expiry alerts processing completed: ${emailsSent} sent, ${emailsFailed} failed`,
        data: {
          emailResults: {
            sent: emailsSent,
            failed: emailsFailed,
            total: documentsToProcess.length,
          },
          processedDocuments: documentsToProcess.length,
        },
      });
    } catch (error) {
      console.error("Error in DocumentController.sendExpiryAlerts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send expiry alerts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get email notification status for documents
  static async getEmailNotificationStatus(req, res) {
    try {
      const { document_id } = req.query;

      let query = `
        SELECT 
          ej.id,
          ej.type,
          ej.status,
          ej.created_at,
          ej.processed_at,
          ej.error,
          JSON_EXTRACT(ej.data, '$.machine_number') as machine_number,
          JSON_EXTRACT(ej.data, '$.document_type') as document_type,
          JSON_EXTRACT(ej.data, '$.document_id') as document_id
        FROM email_jobs ej
        WHERE ej.type = 'document_expiry'
      `;

      const params = [];

      if (document_id) {
        query += ` AND JSON_EXTRACT(ej.data, '$.document_id') = ?`;
        params.push(document_id);
      }

      query += ` ORDER BY ej.created_at DESC LIMIT 50`;

      const emailJobs = await executeQuery(query, params);

      res.json({
        success: true,
        message: "Email notification status retrieved successfully",
        data: emailJobs,
        count: emailJobs.length,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.getEmailNotificationStatus:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve email notification status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Initialize default notifications for all documents
  static async initializeDefaultNotifications(req, res) {
    try {
      const specificDocumentType = req.body?.document_type;
      const result = await Document.initializeDefaultNotifications(
        specificDocumentType
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.initializeDefaultNotifications:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to initialize default notifications",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get notification defaults for admin management
  static async getNotificationDefaults(req, res) {
    try {
      const defaults = await Document.getAllNotificationDefaults();

      res.json({
        success: true,
        message: "Notification defaults retrieved successfully",
        data: defaults,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.getNotificationDefaults:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notification defaults",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update notification defaults (admin only)
  static async updateNotificationDefaults(req, res) {
    try {
      const { document_type, days_before } = req.body;

      if (!document_type || !days_before || !Array.isArray(days_before)) {
        return res.status(400).json({
          success: false,
          message: "Document type and days_before array are required",
        });
      }

      // Validate document type
      const validTypes = ["RC_Book", "PUC", "Fitness", "Insurance", "ALL"];
      if (!validTypes.includes(document_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid document type",
        });
      }

      // Validate days array (must be positive integers)
      const invalidDays = days_before.filter(
        (day) => !Number.isInteger(day) || day <= 0
      );
      if (invalidDays.length > 0) {
        return res.status(400).json({
          success: false,
          message: "All notification days must be positive integers",
        });
      }

      const result = await Document.updateNotificationDefaults(
        document_type,
        days_before,
        req.user.userId
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error(
        "Error in DocumentController.updateNotificationDefaults:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to update notification defaults",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Apply default notifications to specific document type
  static async applyDefaultNotifications(req, res) {
    try {
      const { document_type } = req.body;

      if (!document_type) {
        return res.status(400).json({
          success: false,
          message: "Document type is required",
        });
      }

      const defaults = await Document.getNotificationDefaults(document_type);

      if (defaults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No default settings found for this document type",
        });
      }

      const defaultSetting = defaults[0];
      const notificationDays = defaultSetting.days_before; // Already parsed as array

      console.log(
        `Using notification days for ${document_type}:`,
        notificationDays
      );

      const query = `
      SELECT md.id
      FROM machine_documents md
      WHERE md.document_type = ?
      AND NOT EXISTS (
        SELECT 1 FROM document_notifications dn 
        WHERE dn.machine_document_id = md.id
      )
    `;

      const documents = await executeQuery(query, [document_type]);

      let configured = 0;
      for (const doc of documents) {
        await Document.configureNotifications(doc.id, notificationDays);
        configured++;
      }

      res.json({
        success: true,
        message: `Applied default notifications to ${configured} ${document_type} documents`,
      });
    } catch (error) {
      console.error(
        "Error in DocumentController.applyDefaultNotifications:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to apply default notifications",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = DocumentController;
