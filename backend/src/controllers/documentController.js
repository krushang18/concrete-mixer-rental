const Document = require("../models/Document");
const Machine = require("../models/Machine");
const { executeQuery } = require("../config/database");

class DocumentController {
  // Get all documents with filtering
  static async getAll(req, res) {
    try {
      const filters = {
        machine_id: req.query.machine_id,
        document_type: req.query.document_type,
        status: req.query.status,
        expiring_within_days: req.query.expiring_within_days,
      };

      const documents = await Document.getAll(filters);
      res.json({ success: true, data: documents });
    } catch (error) {
      console.error("Error in getAll:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  // Get single document
  static async getById(req, res) {
    try {
      const document = await Document.getById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true, data: document });
    } catch (error) {
      console.error("Error in getById:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  }

  // Create or Update Document
  static async createOrUpdate(req, res) {
    try {
      const result = await Document.createOrUpdate(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error in createOrUpdate:", error);
      res.status(500).json({ error: "Failed to save document" });
    }
  }

  // Renew Document
  static async renewDocument(req, res) {
    try {
      const { id } = req.params;
      const { expiry_date, remarks } = req.body;

      if (!expiry_date) {
        return res.status(400).json({ error: "Expiry date is required for renewal" });
      }

      const result = await Document.renew(id, expiry_date, remarks);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error in renewDocument:", error);
      res.status(500).json({ error: "Failed to renew document" });
    }
  }

  // Delete Document
  static async delete(req, res) {
    try {
      const result = await Document.delete(req.params.id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error in delete:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  }

  // Get Expiring Documents
  static async getExpiring(req, res) {
    try {
      const days = req.query.days || 30; // Default to 30 days if not specified
      const documents = await Document.getExpiringDocuments(days);
      res.json({ success: true, data: documents });
    } catch (error) {
        console.error("Error in getExpiring:", error);
        res.status(500).json({ error: "Failed to fetch expiring documents" });
    }
  }

  // Get Documents by Machine
  static async getByMachine(req, res) {
      try {
          const documents = await Document.getByMachine(req.params.machineId);
          res.json({ success: true, data: documents });
      } catch (error) {
          console.error("Error in getByMachine:", error);
          res.status(500).json({ error: "Failed to fetch machine documents" });
      }
  }

  // Configure Notifications for a Document
  static async configureNotifications(req, res) {
    try {
      const { id } = req.params;
      const { notification_days } = req.body; // Expect array like [30, 7, 1]

      if (!Array.isArray(notification_days)) {
        return res.status(400).json({ error: "notification_days must be an array of numbers" });
      }

      const result = await Document.configureNotifications(id, notification_days);
      res.json(result);
    } catch (error) {
      console.error("Error in configureNotifications:", error);
      res.status(500).json({ error: "Failed to configure notifications" });
    }
  }

  // Get Notification Settings
  static async getNotificationSettings(req, res) {
    try {
      const { id } = req.params;
      const settings = await Document.getNotificationSettings(id);
      res.json(settings);
    } catch (error) {
      console.error("Error in getNotificationSettings:", error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  }

  // Get Notification Defaults
  static async getNotificationDefaults(req, res) {
      try {
          const defaults = await Document.getNotificationDefaults(req.query.document_type);
          res.json(defaults);
      } catch (error) {
          console.error("Error in getNotificationDefaults:", error);
          res.status(500).json({ error: "Failed to fetch notification defaults" });
      }
  }

  // Update Notification Defaults
  static async updateNotificationDefaults(req, res) {
      try {
          const { document_type, days_before } = req.body;
          const userId = req.user ? req.user.id : null; // Assuming auth middleware adds user
          const result = await Document.updateNotificationDefaults(document_type, days_before, userId);
          res.json(result);
      } catch (error) {
          console.error("Error in updateNotificationDefaults:", error);
          res.status(500).json({ error: "Failed to update notification defaults" });
      }
  }

  // Get Notification History
  static async getNotificationHistory(req, res) {
      try {
          const history = await Document.getNotificationHistory(req.params.id);
          res.json(history);
      } catch (error) {
          console.error("Error in getNotificationHistory:", error);
          res.status(500).json({ error: "Failed to fetch notification history" });
      }
  }

  // Bulk Renew
  static async bulkRenew(req, res) {
      try {
          const result = await Document.bulkRenew(req.body);
          res.json(result);
      } catch (error) {
          console.error("Error in bulkRenew:", error);
          res.status(500).json({ error: "Failed to bulk renew documents" });
      }
  }

  // Apply Default Notifications
  static async applyDefaultNotifications(req, res) {
      try {
          const result = await Document.initializeDefaultNotifications(req.body.document_type);
          res.json(result);
      } catch (error) {
          console.error("Error in applyDefaultNotifications:", error);
          res.status(500).json({ error: "Failed to apply default notifications" });
      }
  }

  // Check Notifications Due (Manual Trigger)
  static async checkNotificationsDue(req, res) {
      try {
          const result = await Document.checkNotificationsDue();
          res.json({ success: true, notifications_triggered: result.length, data: result });
      } catch (error) {
          console.error("Error in checkNotificationsDue:", error);
          res.status(500).json({ error: "Failed to check notifications" });
      }
  }

  // Initialize Default Notifications (Manual Trigger)
  static async initializeDefaultNotifications(req, res) {
      try {
          const result = await Document.initializeDefaultNotifications();
          res.json(result);
      } catch (error) {
          console.error("Error in initializeDefaultNotifications:", error);
          res.status(500).json({ error: "Failed to initialize notifications" });
      }
  }

  // Get Email Notification Status
  static async getEmailNotificationStatus(req, res) {
      try {
          // Implement based on email_jobs or logs
          const jobs = await executeQuery("SELECT COUNT(*) as count, status FROM email_jobs WHERE type='document_expiry' GROUP BY status");
          res.json({ success: true, stats: jobs });
      } catch (error) {
          console.error("Error in getEmailNotificationStatus:", error);
          res.status(500).json({ error: "Failed to fetch email status" });
      }
  }
}

module.exports = DocumentController;
