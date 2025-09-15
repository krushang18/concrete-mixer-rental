const { executeQuery } = require("../config/database");

class Document {
  // Get all machine documents with expiry information
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          md.id,
          md.machine_id,
          m.machine_number,
          m.name as machine_name,
          md.document_type,
          md.expiry_date,
          md.last_renewed_date,
          md.remarks,
          md.created_at,
          md.updated_at,
          DATEDIFF(md.expiry_date, CURDATE()) as days_until_expiry,
          CASE 
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 3 THEN 'CRITICAL'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 7 THEN 'WARNING'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 14 THEN 'NOTICE'
            ELSE 'OK'
          END as status,
          GROUP_CONCAT(dn.days_before ORDER BY dn.days_before) as notification_days
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        LEFT JOIN document_notifications dn ON md.id = dn.machine_document_id AND dn.is_active = 1
      `;

      const conditions = [];
      const params = [];

      // Apply filters
      if (filters.machine_id) {
        conditions.push("md.machine_id = ?");
        params.push(filters.machine_id);
      }

      if (filters.document_type) {
        conditions.push("md.document_type = ?");
        params.push(filters.document_type);
      }

      if (filters.status) {
        switch (filters.status) {
          case "expired":
            conditions.push("DATEDIFF(md.expiry_date, CURDATE()) <= 0");
            break;
          case "critical":
            conditions.push(
              "DATEDIFF(md.expiry_date, CURDATE()) BETWEEN 1 AND 3"
            );
            break;
          case "warning":
            conditions.push(
              "DATEDIFF(md.expiry_date, CURDATE()) BETWEEN 4 AND 7"
            );
            break;
          case "notice":
            conditions.push(
              "DATEDIFF(md.expiry_date, CURDATE()) BETWEEN 8 AND 14"
            );
            break;
          case "expiring_soon":
            conditions.push("DATEDIFF(md.expiry_date, CURDATE()) <= 14");
            break;
        }
      }

      if (filters.expiring_within_days) {
        conditions.push("DATEDIFF(md.expiry_date, CURDATE()) <= ?");
        params.push(parseInt(filters.expiring_within_days));
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " GROUP BY md.id ORDER BY md.expiry_date ASC";

      const documents = await executeQuery(query, params);
      return documents;
    } catch (error) {
      console.error("Error getting all documents:", error);
      throw error;
    }
  }

  // Get document by ID
  static async getById(id) {
    try {
      const query = `
        SELECT 
          md.*,
          m.machine_number,
          m.name as machine_name,
          DATEDIFF(md.expiry_date, CURDATE()) as days_until_expiry,
          CASE 
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 3 THEN 'CRITICAL'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 7 THEN 'WARNING'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 14 THEN 'NOTICE'
            ELSE 'OK'
          END as status
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE md.id = ?
        LIMIT 1
      `;

      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting document by ID:", error);
      throw error;
    }
  }

  // Get documents for a specific machine
  static async getByMachine(machineId) {
    try {
      return await this.getAll({ machine_id: machineId });
    } catch (error) {
      console.error("Error getting documents by machine:", error);
      throw error;
    }
  }

  // Create or update machine document
  static async createOrUpdate(documentData) {
    try {
      const {
        machine_id,
        document_type,
        expiry_date,
        last_renewed_date,
        remarks,
      } = documentData;

      // Validate required fields
      const validation = this.validateDocumentData(documentData);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if document already exists for this machine
      const existingDoc = await executeQuery(
        "SELECT id FROM machine_documents WHERE machine_id = ? AND document_type = ?",
        [machine_id, document_type]
      );

      if (existingDoc.length > 0) {
        // Update existing document
        const query = `
          UPDATE machine_documents 
          SET 
            expiry_date = ?,
            last_renewed_date = ?,
            remarks = ?,
            updated_at = NOW()
          WHERE id = ?
        `;

        await executeQuery(query, [
          expiry_date,
          last_renewed_date || null,
          remarks || null,
          existingDoc[0].id,
        ]);

        return {
          success: true,
          id: existingDoc[0].id,
          message: "Document updated successfully",
          action: "updated",
        };
      } else {
        // Create new document
        const query = `
          INSERT INTO machine_documents (
            machine_id,
            document_type,
            expiry_date,
            last_renewed_date,
            remarks,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const result = await executeQuery(query, [
          machine_id,
          document_type,
          expiry_date,
          last_renewed_date || null,
          remarks || null,
        ]);

        return {
          success: true,
          id: result.insertId,
          message: "Document created successfully",
          action: "created",
        };
      }
    } catch (error) {
      console.error("Error creating/updating document:", error);
      throw error;
    }
  }

  // Update document expiry date (renewal)
  static async renew(id, newExpiryDate, remarks) {
    try {
      const document = await this.getById(id);
      if (!document) {
        return {
          success: false,
          message: "Document not found",
        };
      }

      const query = `
        UPDATE machine_documents 
        SET 
          expiry_date = ?,
          last_renewed_date = CURDATE(),
          remarks = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [newExpiryDate, remarks || null, id]);

      // Clear any sent notifications for this document
      await executeQuery(
        "DELETE FROM document_notification_logs WHERE machine_document_id = ?",
        [id]
      );

      return {
        success: true,
        message: "Document renewed successfully",
      };
    } catch (error) {
      console.error("Error renewing document:", error);
      throw error;
    }
  }

  // Delete document
  static async delete(id) {
    try {
      const document = await this.getById(id);
      if (!document) {
        return {
          success: false,
          message: "Document not found",
        };
      }

      // Delete related notifications first
      await executeQuery(
        "DELETE FROM document_notifications WHERE machine_document_id = ?",
        [id]
      );
      await executeQuery(
        "DELETE FROM document_notification_logs WHERE machine_document_id = ?",
        [id]
      );

      // Delete the document
      await executeQuery("DELETE FROM machine_documents WHERE id = ?", [id]);

      return {
        success: true,
        message: "Document deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  // Get expiring documents for notifications
  static async getExpiringDocuments(daysAhead = 14) {
    try {
      const query = `
        SELECT 
          md.id,
          md.machine_id,
          m.machine_number,
          m.name as machine_name,
          md.document_type,
          md.expiry_date,
          DATEDIFF(md.expiry_date, CURDATE()) as days_until_expiry
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1 
        AND md.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY md.expiry_date ASC
      `;

      const documents = await executeQuery(query, [daysAhead]);
      return documents;
    } catch (error) {
      console.error("Error getting expiring documents:", error);
      throw error;
    }
  }

  // Get document statistics
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 1 END) as expired_documents,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 1 AND 7 THEN 1 END) as expiring_this_week,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 8 AND 30 THEN 1 END) as expiring_this_month,
          AVG(DATEDIFF(expiry_date, CURDATE())) as avg_days_until_expiry
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting document stats:", error);
      throw error;
    }
  }

  // Configure document notifications
  static async configureNotifications(documentId, notificationDays) {
    try {
      // Clear existing notifications
      await executeQuery(
        "DELETE FROM document_notifications WHERE machine_document_id = ?",
        [documentId]
      );

      // Add new notifications
      if (notificationDays && notificationDays.length > 0) {
        const values = notificationDays
          .map((days) => `(${documentId}, ${days}, 1, NOW(), NOW())`)
          .join(",");
        const query = `
          INSERT INTO document_notifications (machine_document_id, days_before, is_active, created_at, updated_at)
          VALUES ${values}
        `;

        await executeQuery(query);
      }

      return {
        success: true,
        message: "Notification settings updated successfully",
      };
    } catch (error) {
      console.error("Error configuring notifications:", error);
      throw error;
    }
  }

  // Get notification settings for a document
  static async getNotificationSettings(documentId) {
    try {
      const query = `
        SELECT days_before, is_active
        FROM document_notifications
        WHERE machine_document_id = ?
        ORDER BY days_before DESC
      `;

      const notifications = await executeQuery(query, [documentId]);
      return notifications;
    } catch (error) {
      console.error("Error getting notification settings:", error);
      throw error;
    }
  }

  // Check and log notifications that need to be sent
  static async checkNotificationsDue() {
    try {
      const query = `
        SELECT DISTINCT
          md.id as document_id,
          md.machine_id,
          m.machine_number,
          m.name as machine_name,
          md.document_type,
          md.expiry_date,
          dn.days_before,
          DATEDIFF(md.expiry_date, CURDATE()) as days_until_expiry
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        JOIN document_notifications dn ON md.id = dn.machine_document_id
        WHERE m.is_active = 1 
        AND dn.is_active = 1
        AND DATEDIFF(md.expiry_date, CURDATE()) = dn.days_before
        AND NOT EXISTS (
          SELECT 1 FROM document_notification_logs dnl
          WHERE dnl.machine_document_id = md.id 
          AND dnl.days_before = dn.days_before
          AND DATE(dnl.notification_date) = CURDATE()
        )
        ORDER BY md.expiry_date ASC
      `;

      const notificationsDue = await executeQuery(query);

      // Log notifications that will be sent
      for (const notification of notificationsDue) {
        await executeQuery(
          `INSERT INTO document_notification_logs 
           (machine_document_id, days_before, notification_date, created_at) 
           VALUES (?, ?, CURDATE(), NOW())`,
          [notification.document_id, notification.days_before]
        );
      }

      return notificationsDue;
    } catch (error) {
      console.error("Error checking notifications due:", error);
      throw error;
    }
  }

  // Get notification history
  static async getNotificationHistory(documentId = null) {
    try {
      let query = `
        SELECT 
          dnl.id,
          dnl.machine_document_id,
          m.machine_number,
          m.name as machine_name,
          md.document_type,
          dnl.days_before,
          dnl.notification_date,
          dnl.created_at
        FROM document_notification_logs dnl
        JOIN machine_documents md ON dnl.machine_document_id = md.id
        JOIN machines m ON md.machine_id = m.id
      `;

      const params = [];

      if (documentId) {
        query += " WHERE dnl.machine_document_id = ?";
        params.push(documentId);
      }

      query += " ORDER BY dnl.created_at DESC";

      const history = await executeQuery(query, params);
      return history;
    } catch (error) {
      console.error("Error getting notification history:", error);
      throw error;
    }
  }

  // Validate document data
  static validateDocumentData(data) {
    const errors = [];
    const { machine_id, document_type, expiry_date } = data;

    // Required fields
    if (!machine_id || isNaN(machine_id)) {
      errors.push("Valid machine ID is required");
    }

    if (!document_type) {
      errors.push("Document type is required");
    }

    const validDocTypes = ["RC_Book", "PUC", "Fitness", "Insurance"];
    if (document_type && !validDocTypes.includes(document_type)) {
      errors.push(
        "Invalid document type. Must be one of: RC_Book, PUC, Fitness, Insurance"
      );
    }

    if (!expiry_date) {
      errors.push("Expiry date is required");
    } else {
      const expiryDate = new Date(expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(expiryDate.getTime())) {
        errors.push("Valid expiry date is required");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Bulk update document expiry dates
  static async bulkRenew(renewalData) {
    try {
      const { document_ids, new_expiry_dates, remarks } = renewalData;

      if (
        !document_ids ||
        !Array.isArray(document_ids) ||
        document_ids.length === 0
      ) {
        return {
          success: false,
          message: "Document IDs are required",
        };
      }

      let updated = 0;

      for (let i = 0; i < document_ids.length; i++) {
        const documentId = document_ids[i];
        const expiryDate = new_expiry_dates[i] || new_expiry_dates[0]; // Use individual or single date

        const result = await this.renew(documentId, expiryDate, remarks);
        if (result.success) {
          updated++;
        }
      }

      return {
        success: true,
        message: `${updated} documents renewed successfully`,
        updatedCount: updated,
      };
    } catch (error) {
      console.error("Error bulk renewing documents:", error);
      throw error;
    }
  }

  // Get documents by type across all machines
  static async getByDocumentType(documentType) {
    try {
      return await this.getAll({ document_type: documentType });
    } catch (error) {
      console.error("Error getting documents by type:", error);
      throw error;
    }
  }

  // Get expired documents
  static async getExpiredDocuments() {
    try {
      return await this.getAll({ status: "expired" });
    } catch (error) {
      console.error("Error getting expired documents:", error);
      throw error;
    }
  }

  // Get critical documents (expiring in 1-3 days)
  static async getCriticalDocuments() {
    try {
      return await this.getAll({ status: "critical" });
    } catch (error) {
      console.error("Error getting critical documents:", error);
      throw error;
    }
  }

  // Initialize default notifications for all documents
  static async initializeDefaultNotifications(specificDocumentType = null) {
    try {
      const defaults = await this.getNotificationDefaults(specificDocumentType);
      let totalConfigured = 0;

      for (const defaultSetting of defaults) {
        const documentType = defaultSetting.document_type;
        const notificationDays = defaultSetting.days_before; // Already parsed as array

        console.log(
          `Processing ${documentType} with days: ${notificationDays}`
        );

        // Get documents without notifications for this type
        let query = `
        SELECT md.id
        FROM machine_documents md
        WHERE NOT EXISTS (
          SELECT 1 FROM document_notifications dn 
          WHERE dn.machine_document_id = md.id
        )
      `;

        const params = [];

        if (documentType !== "ALL") {
          query += " AND md.document_type = ?";
          params.push(documentType);
        }

        const documentsWithoutNotifications = await executeQuery(query, params);

        for (const doc of documentsWithoutNotifications) {
          await this.configureNotifications(doc.id, notificationDays);
          totalConfigured++;
        }
      }

      return {
        success: true,
        message: `Default notifications configured for ${totalConfigured} documents`,
      };
    } catch (error) {
      console.error("Error initializing default notifications:", error);
      throw error;
    }
  }

  // Get notification defaults from database
  static async getNotificationDefaults(documentType = null) {
    try {
      let query = `
      SELECT document_type, days_before, is_active
      FROM notification_defaults 
      WHERE is_active = 1
    `;

      const params = [];

      if (documentType) {
        query += ' AND (document_type = ? OR document_type = "ALL")';
        params.push(documentType);
      }

      query += " ORDER BY document_type ASC";

      const defaults = await executeQuery(query, params);

      // Parse JSON days_before for each record with safe error handling
      return defaults.map((item) => {
        let parsedDays = [];

        try {
          if (typeof item.days_before === "string") {
            // Remove any extra brackets or quotes that might exist
            const cleanedString = item.days_before.trim();
            parsedDays = JSON.parse(cleanedString);
          } else if (Array.isArray(item.days_before)) {
            // Already an array
            parsedDays = item.days_before;
          } else {
            // Fallback to default
            parsedDays = [14, 7, 3, 1];
          }
        } catch (parseError) {
          console.error(
            `Error parsing days_before for ${item.document_type}:`,
            parseError
          );
          console.error(
            `Raw value: "${
              item.days_before
            }" (type: ${typeof item.days_before})`
          );

          // Try to extract numbers from string if it looks like [14, 7, 3, 1]
          if (typeof item.days_before === "string") {
            const matches = item.days_before.match(/\d+/g);
            if (matches) {
              parsedDays = matches.map((num) => parseInt(num));
              console.log(`Successfully extracted numbers: ${parsedDays}`);
            } else {
              parsedDays = [14, 7, 3, 1]; // Ultimate fallback
              console.log(`No numbers found, using fallback: ${parsedDays}`);
            }
          } else {
            parsedDays = [14, 7, 3, 1]; // Ultimate fallback
          }
        }

        return {
          ...item,
          days_before: parsedDays, // Now this is always an array
        };
      });
    } catch (error) {
      console.error("Error getting notification defaults:", error);
      throw error;
    }
  }

  // Update notification defaults (admin function)
  static async updateNotificationDefaults(documentType, daysBefore, userId) {
    try {
      const query = `
      INSERT INTO notification_defaults (document_type, days_before, created_by, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      days_before = VALUES(days_before),
      created_by = VALUES(created_by),
      updated_at = NOW()
    `;

      await executeQuery(query, [
        documentType,
        JSON.stringify(daysBefore),
        userId,
      ]);

      return {
        success: true,
        message: "Notification defaults updated successfully",
      };
    } catch (error) {
      console.error("Error updating notification defaults:", error);
      throw error;
    }
  }

  // Get all notification defaults for admin management
  // Fixed getAllNotificationDefaults method with safe JSON parsing
  static async getAllNotificationDefaults() {
    try {
      const query = `
      SELECT 
        nd.*,
        u.username as created_by_user
      FROM notification_defaults nd
      LEFT JOIN users u ON nd.created_by = u.id
      ORDER BY nd.document_type ASC
    `;

      const defaults = await executeQuery(query);

      // Parse JSON days_before for each record with safe error handling
      return defaults.map((item) => {
        let parsedDays = [];

        try {
          // Handle different possible formats
          if (typeof item.days_before === "string") {
            // Remove any extra brackets or quotes that might exist
            const cleanedString = item.days_before.trim();
            parsedDays = JSON.parse(cleanedString);
          } else if (Array.isArray(item.days_before)) {
            // Already an array
            parsedDays = item.days_before;
          } else {
            // Fallback to default
            parsedDays = [14, 7, 3, 1];
          }
        } catch (parseError) {
          console.error(
            `Error parsing days_before for ${item.document_type}:`,
            parseError
          );
          console.error(`Raw value: ${item.days_before}`);
          console.error(`Type: ${typeof item.days_before}`);

          // Try to extract numbers from string if it looks like [14, 7, 3, 1]
          if (typeof item.days_before === "string") {
            const matches = item.days_before.match(/\d+/g);
            if (matches) {
              parsedDays = matches.map((num) => parseInt(num));
            } else {
              parsedDays = [14, 7, 3, 1]; // Ultimate fallback
            }
          } else {
            parsedDays = [14, 7, 3, 1]; // Ultimate fallback
          }
        }

        return {
          ...item,
          days_before: parsedDays,
        };
      });
    } catch (error) {
      console.error("Error getting all notification defaults:", error);
      throw error;
    }
  }
}

module.exports = Document;
