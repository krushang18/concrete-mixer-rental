const { prisma } = require("../config/database");

// Compute days until expiry and status from a Date object
function computeStatus(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.round((expiry - today) / 86400000);
  let status = "OK";
  if (daysUntilExpiry <= 0) status = "EXPIRED";
  else if (daysUntilExpiry <= 3) status = "CRITICAL";
  else if (daysUntilExpiry <= 7) status = "WARNING";
  else if (daysUntilExpiry <= 14) status = "NOTICE";
  return { daysUntilExpiry, status };
}

class Document {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.machine_id) where.machineId = parseInt(filters.machine_id);
      if (filters.document_type) where.documentType = filters.document_type;

      // Status/expiry filters applied in JS after fetch since they need computed fields
      const docs = await prisma.machineDocument.findMany({
        where,
        include: {
          machine: { select: { machineNumber: true, name: true } },
          notifications: { where: { isActive: true }, select: { daysBefore: true } },
        },
        orderBy: { expiryDate: "asc" },
      });

      let result = docs.map((md) => {
        const { daysUntilExpiry, status } = computeStatus(md.expiryDate);
        return {
          id: md.id,
          machine_id: md.machineId,
          machine_number: md.machine?.machineNumber,
          machine_name: md.machine?.name,
          document_type: md.documentType,
          expiry_date: md.expiryDate,
          last_renewed_date: md.lastRenewedDate,
          remarks: md.remarks,
          created_at: md.createdAt,
          updated_at: md.updatedAt,
          days_until_expiry: daysUntilExpiry,
          status,
          notification_days: md.notifications.map((n) => n.daysBefore).join(","),
        };
      });

      // Apply status filter in memory
      if (filters.status) {
        const statusMap = { expired: "EXPIRED", critical: "CRITICAL", warning: "WARNING", notice: "NOTICE", expiring_soon: ["EXPIRED", "CRITICAL", "WARNING", "NOTICE"] };
        const target = statusMap[filters.status];
        if (Array.isArray(target)) result = result.filter((d) => target.includes(d.status));
        else result = result.filter((d) => d.status === target);
      }
      if (filters.expiring_within_days) {
        result = result.filter((d) => d.days_until_expiry <= parseInt(filters.expiring_within_days));
      }

      return result;
    } catch (error) {
      console.error("Error getting all documents:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const md = await prisma.machineDocument.findUnique({
        where: { id: parseInt(id) },
        include: { machine: { select: { machineNumber: true, name: true } } },
      });
      if (!md) return null;
      const { daysUntilExpiry, status } = computeStatus(md.expiryDate);
      return {
        id: md.id, machine_id: md.machineId, machine_number: md.machine?.machineNumber, machine_name: md.machine?.name,
        document_type: md.documentType, expiry_date: md.expiryDate, last_renewed_date: md.lastRenewedDate,
        remarks: md.remarks, created_at: md.createdAt, updated_at: md.updatedAt, days_until_expiry: daysUntilExpiry, status,
      };
    } catch (error) {
      console.error("Error getting document by ID:", error);
      throw error;
    }
  }

  static async getByMachine(machineId) {
    return this.getAll({ machine_id: machineId });
  }

  static async createOrUpdate(documentData) {
    try {
      const { machine_id, document_type, expiry_date, last_renewed_date, remarks, notification_days } = documentData;

      const validation = this.validateDocumentData(documentData);
      if (!validation.isValid) return { success: false, message: "Validation failed", errors: validation.errors };

      const existing = await prisma.machineDocument.findFirst({ where: { machineId: parseInt(machine_id), documentType: document_type } });
      let documentId;
      let action;

      if (existing) {
        documentId = existing.id;
        action = "updated";
        await prisma.machineDocument.update({
          where: { id: documentId },
          data: { expiryDate: new Date(expiry_date), lastRenewedDate: last_renewed_date ? new Date(last_renewed_date) : null, remarks: remarks || null },
        });
      } else {
        action = "created";
        const created = await prisma.machineDocument.create({
          data: { machineId: parseInt(machine_id), documentType: document_type, expiryDate: new Date(expiry_date), lastRenewedDate: last_renewed_date ? new Date(last_renewed_date) : null, remarks: remarks || null },
        });
        documentId = created.id;
      }

      if (notification_days) {
        let daysArray = Array.isArray(notification_days) ? notification_days : (typeof notification_days === "string" ? notification_days.split(",").map((d) => parseInt(d.trim())).filter((n) => !isNaN(n)) : []);
        if (daysArray.length > 0) await this.configureNotifications(documentId, daysArray);
      }

      return { success: true, id: documentId, message: `Document ${action} successfully`, action };
    } catch (error) {
      console.error("Error creating/updating document:", error);
      throw error;
    }
  }

  static async renew(id, newExpiryDate, remarks) {
    try {
      const document = await this.getById(id);
      if (!document) return { success: false, message: "Document not found" };

      await prisma.machineDocument.update({
        where: { id: parseInt(id) },
        data: { expiryDate: new Date(newExpiryDate), lastRenewedDate: new Date(), remarks: remarks || null },
      });
      await prisma.documentNotificationLog.deleteMany({ where: { machineDocumentId: parseInt(id) } });
      return { success: true, message: "Document renewed successfully" };
    } catch (error) {
      console.error("Error renewing document:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const document = await this.getById(id);
      if (!document) return { success: false, message: "Document not found" };
      // Cascade via FK handles notifications and logs
      await prisma.machineDocument.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Document deleted successfully" };
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  static async getExpiringDocuments(daysAhead = 14) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoff = new Date(today.getTime() + daysAhead * 86400000);
      cutoff.setHours(23, 59, 59, 999);

      const docs = await prisma.machineDocument.findMany({
        where: { expiryDate: { gte: today, lte: cutoff } },
        include: { machine: { select: { machineNumber: true, name: true } } },
        orderBy: { expiryDate: "asc" },
      });

      return docs.map((md) => {
        const { daysUntilExpiry } = computeStatus(md.expiryDate);
        return { id: md.id, machine_id: md.machineId, machine_number: md.machine?.machineNumber, machine_name: md.machine?.name, document_type: md.documentType, expiry_date: md.expiryDate, days_until_expiry: daysUntilExpiry };
      });
    } catch (error) {
      console.error("Error getting expiring documents:", error);
      throw error;
    }
  }

  static async configureNotifications(documentId, notificationDays) {
    try {
      let daysArray = Array.isArray(notificationDays) ? notificationDays : (typeof notificationDays === "string" ? notificationDays.split(",").map((d) => parseInt(d.trim())).filter((n) => !isNaN(n)) : []);
      if (daysArray.length === 0) return { success: true, message: "No notifications configured" };

      // Clear existing notification rules
      await prisma.documentNotification.deleteMany({ where: { machineDocumentId: parseInt(documentId) } });

      // Insert new rules
      await prisma.documentNotification.createMany({
        data: daysArray.map((days) => ({ machineDocumentId: parseInt(documentId), daysBefore: days, isActive: true })),
      });

      // Clear pending email jobs for this document
      await prisma.emailJob.deleteMany({ where: { type: "document_expiry", status: "pending", data: { path: ["document_id"], equals: documentId } } });

      const doc = await this.getById(documentId);
      if (!doc) throw new Error("Document not found");

      const expiryDate = new Date(doc.expiry_date);
      const now = new Date();

      for (const daysBefore of daysArray) {
        const scheduledDate = new Date(expiryDate);
        scheduledDate.setDate(expiryDate.getDate() - daysBefore);
        scheduledDate.setHours(9, 0, 0, 0);
        if (scheduledDate < now) continue;

        const jobData = {
          document_id: doc.id, machine_id: doc.machine_id, machine_number: doc.machine_number, machine_name: doc.machine_name,
          document_type: doc.document_type, expiry_date: doc.expiry_date, days_until_expiry: daysBefore, notification_rule: daysBefore,
        };

        await prisma.emailJob.create({
          data: { type: "document_expiry", data: jobData, status: "pending", attempts: 0, maxAttempts: 3, scheduledFor: scheduledDate },
        });
      }

      return { success: true, message: "Notification settings updated and email jobs scheduled" };
    } catch (error) {
      console.error("Error configuring notifications:", error);
      throw error;
    }
  }

  static async getNotificationSettings(documentId) {
    try {
      const notifications = await prisma.documentNotification.findMany({
        where: { machineDocumentId: parseInt(documentId) },
        select: { daysBefore: true, isActive: true },
        orderBy: { daysBefore: "desc" },
      });
      return notifications.map((n) => ({ days_before: n.daysBefore, is_active: n.isActive }));
    } catch (error) {
      console.error("Error getting notification settings:", error);
      throw error;
    }
  }

  static async checkNotificationsDue() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000);

      // Use raw query for DATEDIFF logic
      const notificationsDue = await prisma.$queryRaw`
        SELECT DISTINCT
          md.id as document_id,
          md.machine_id,
          m.machine_number,
          m.name as machine_name,
          md.document_type,
          md.expiry_date,
          dn.days_before,
          DATE_PART('day', md.expiry_date::timestamp - CURRENT_DATE::timestamp) as days_until_expiry
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        JOIN document_notifications dn ON md.id = dn.machine_document_id
        WHERE dn.is_active = true
        AND DATE_PART('day', md.expiry_date::timestamp - CURRENT_DATE::timestamp) = dn.days_before
        AND NOT EXISTS (
          SELECT 1 FROM document_notification_logs dnl
          WHERE dnl.machine_document_id = md.id
          AND dnl.days_before = dn.days_before
          AND dnl.sent_at >= ${today}
          AND dnl.sent_at < ${tomorrow}
        )
        ORDER BY md.expiry_date ASC
      `;

      for (const notification of notificationsDue) {
        await prisma.documentNotificationLog.create({
          data: { machineDocumentId: notification.document_id, daysBefore: notification.days_before, sentAt: new Date(), status: "queued" },
        });
      }

      return notificationsDue;
    } catch (error) {
      console.error("Error checking notifications due:", error);
      throw error;
    }
  }

  static async getNotificationHistory(documentId = null) {
    try {
      const where = documentId ? { machineDocumentId: parseInt(documentId) } : {};
      const logs = await prisma.documentNotificationLog.findMany({
        where,
        include: { machineDocument: { include: { machine: { select: { machineNumber: true, name: true } } } } },
        orderBy: { sentAt: "desc" },
      });

      return logs.map((l) => ({
        id: l.id,
        machine_document_id: l.machineDocumentId,
        machine_number: l.machineDocument?.machine?.machineNumber,
        machine_name: l.machineDocument?.machine?.name,
        document_type: l.machineDocument?.documentType,
        days_before: l.daysBefore,
        sent_at: l.sentAt,
        created_at: l.sentAt,
      }));
    } catch (error) {
      console.error("Error getting notification history:", error);
      throw error;
    }
  }

  static validateDocumentData(data) {
    const errors = [];
    const { machine_id, document_type, expiry_date } = data;
    if (!machine_id || isNaN(machine_id)) errors.push("Valid machine ID is required");
    if (!document_type) errors.push("Document type is required");
    const validDocTypes = ["RC_Book", "PUC", "Fitness", "Insurance"];
    if (document_type && !validDocTypes.includes(document_type)) errors.push("Invalid document type. Must be one of: RC_Book, PUC, Fitness, Insurance");
    if (!expiry_date) errors.push("Expiry date is required");
    else if (isNaN(new Date(expiry_date).getTime())) errors.push("Valid expiry date is required");
    return { isValid: errors.length === 0, errors };
  }

  static async bulkRenew(renewalData) {
    try {
      const { document_ids, new_expiry_dates, remarks } = renewalData;
      if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) return { success: false, message: "Document IDs are required" };

      let updated = 0;
      for (let i = 0; i < document_ids.length; i++) {
        const expiryDate = new_expiry_dates[i] || new_expiry_dates[0];
        const result = await this.renew(document_ids[i], expiryDate, remarks);
        if (result.success) updated++;
      }
      return { success: true, message: `${updated} documents renewed successfully`, updatedCount: updated };
    } catch (error) {
      console.error("Error bulk renewing documents:", error);
      throw error;
    }
  }

  static async getByDocumentType(documentType) {
    return this.getAll({ document_type: documentType });
  }

  static async getExpiredDocuments() {
    return this.getAll({ status: "expired" });
  }

  static async getCriticalDocuments() {
    return this.getAll({ status: "critical" });
  }

  static async initializeDefaultNotifications(specificDocumentType = null) {
    try {
      const defaults = await this.getNotificationDefaults(specificDocumentType);
      let totalConfigured = 0;

      for (const defaultSetting of defaults) {
        const documentType = defaultSetting.document_type;
        const notificationDays = defaultSetting.days_before;

        const where = { notifications: { none: {} } };
        if (documentType !== "ALL") where.documentType = documentType;

        const docsWithoutNotifications = await prisma.machineDocument.findMany({ where, select: { id: true } });
        for (const doc of docsWithoutNotifications) {
          await this.configureNotifications(doc.id, notificationDays);
          totalConfigured++;
        }
      }
      return { success: true, message: `Default notifications configured for ${totalConfigured} documents` };
    } catch (error) {
      console.error("Error initializing default notifications:", error);
      throw error;
    }
  }

  static async getNotificationDefaults(documentType = null) {
    try {
      const where = {};
      if (documentType) where.OR = [{ documentType }, { documentType: "ALL" }];

      const defaults = await prisma.notificationDefault.findMany({ where, orderBy: { documentType: "asc" } });

      return defaults.map((item) => ({
        document_type: item.documentType,
        days_before: Array.isArray(item.daysBefore) ? item.daysBefore : [14, 7, 3, 1],
      }));
    } catch (error) {
      console.error("Error getting notification defaults:", error);
      throw error;
    }
  }

  static async updateNotificationDefaults(documentType, daysBefore, userId) {
    try {
      await prisma.notificationDefault.upsert({
        where: { id: -1 }, // force create path — real upsert uses findFirst + update/create
        update: {},
        create: { documentType, daysBefore, createdBy: userId },
      });
      return { success: true, message: "Notification defaults updated successfully" };
    } catch (error) {
      // Fallback: manual upsert since notificationDefault has no unique constraint on documentType
      try {
        const existing = await prisma.notificationDefault.findFirst({ where: { documentType } });
        if (existing) {
          await prisma.notificationDefault.update({ where: { id: existing.id }, data: { daysBefore, createdBy: userId } });
        } else {
          await prisma.notificationDefault.create({ data: { documentType, daysBefore, createdBy: userId } });
        }
        return { success: true, message: "Notification defaults updated successfully" };
      } catch (innerError) {
        console.error("Error updating notification defaults:", innerError);
        throw innerError;
      }
    }
  }

  static async getAllNotificationDefaults() {
    try {
      const defaults = await prisma.notificationDefault.findMany({
        include: { creator: { select: { username: true } } },
        orderBy: { documentType: "asc" },
      });

      return defaults.map((item) => ({
        ...item,
        document_type: item.documentType,
        days_before: Array.isArray(item.daysBefore) ? item.daysBefore : [14, 7, 3, 1],
        created_by_user: item.creator?.username,
      }));
    } catch (error) {
      console.error("Error getting all notification defaults:", error);
      throw error;
    }
  }
}

module.exports = Document;
