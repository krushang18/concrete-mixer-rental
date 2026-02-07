// src/services/documentApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

export class DocumentApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "DocumentApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Document API Service
 * Handles all document management and expiry tracking operations
 */
export const documentApi = {
  // Get all documents with filtering
  getAll: async (filters = {}) => {
    try {
      const params = {
        machine_id: filters.machine_id,
        document_type: filters.document_type,
        expiring_in_days: filters.expiring_in_days,
        expired: filters.expired,
        limit: filters.limit,
        offset: filters.offset,
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const { data } = await apiClient.get("/admin/documents", { params });
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch documents";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get document by ID
  getById: async (id) => {
    if (!id) {
      throw new DocumentApiError("Document ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/documents/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch document with ID ${id}`;
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get documents by machine ID
  getByMachine: async (machineId) => {
    if (!machineId) {
      throw new DocumentApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/documents/machine/${machineId}`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch documents for machine ${machineId}`;
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get expiring documents
  getExpiring: async (days = 30) => {
    try {
      const { data } = await apiClient.get(
        `/admin/documents/expiring?days=${days}`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch expiring documents";
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create or update document
  createOrUpdate: async (documentData) => {
    if (!documentData) {
      throw new DocumentApiError("Document data is required");
    }

    try {
      const { data } = await apiClient.post("/admin/documents", documentData);
      toast.success(data.message || "Document saved successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to save document";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete document
  delete: async (id) => {
    if (!id) {
      throw new DocumentApiError("Document ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/documents/${id}`);
      toast.success(data.message || "Document deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete document with ID ${id}`;
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get notification settings for a document
  getNotificationSettings: async (documentId) => {
    if (!documentId) {
      throw new DocumentApiError("Document ID is required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/documents/${documentId}/notifications`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch notification settings for document ${documentId}`;
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Configure notifications for a document
  configureNotifications: async (documentId, notifications) => {
    if (!documentId) {
      throw new DocumentApiError("Document ID is required");
    }
    if (!notifications || !Array.isArray(notifications)) {
      throw new DocumentApiError("Notifications array is required");
    }

    try {
      const { data } = await apiClient.post(
        `/admin/documents/${documentId}/notifications`,
        { notifications }
      );
      toast.success(data.message || "Notifications configured successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to configure notifications for document ${documentId}`;
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get notification defaults
  getNotificationDefaults: async () => {
    try {
      const { data } = await apiClient.get(
        "/admin/documents/notification-defaults"
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch notification defaults";
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update notification defaults
  updateNotificationDefaults: async (defaults) => {
    if (!defaults || !Array.isArray(defaults)) {
      throw new DocumentApiError("Notification defaults array is required");
    }

    try {
      const { data } = await apiClient.put(
        "/admin/documents/notification-defaults",
        { defaults }
      );
      toast.success(
        data.message || "Notification defaults updated successfully"
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to update notification defaults";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get notification history
  getNotificationHistory: async (documentId = null) => {
    try {
      const url = documentId
        ? `/admin/documents/notification-history/${documentId}`
        : "/admin/documents/notification-history";

      const { data } = await apiClient.get(url);
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch notification history";
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Bulk renew documents
  bulkRenew: async (renewalData) => {
    if (!renewalData || !Array.isArray(renewalData)) {
      throw new DocumentApiError("Renewal data array is required");
    }

    try {
      const { data } = await apiClient.put("/admin/documents/bulk/renew", {
        renewals: renewalData,
      });
      toast.success(
        data.message ||
          `${data.renewedCount || renewalData.length} documents renewed successfully`
      );
      return {
        success: true,
        renewedCount: data.renewedCount || 0,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to bulk renew documents";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Apply default notifications to all documents
  applyDefaultNotifications: async () => {
    try {
      const { data } = await apiClient.post(
        "/admin/documents/apply-default-notifications"
      );
      toast.success(
        data.message || "Default notifications applied successfully"
      );
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to apply default notifications";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Initialize default notifications
  initializeDefaultNotifications: async () => {
    try {
      const { data } = await apiClient.post(
        "/admin/documents/initialize-notifications"
      );
      toast.success(
        data.message || "Default notifications initialized successfully"
      );
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to initialize default notifications";
      toast.error(errorMsg);
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Check notifications due
  checkNotificationsDue: async () => {
    try {
      const { data } = await apiClient.post(
        "/admin/documents/check-notifications"
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to check notifications";
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get email notification status
  getEmailNotificationStatus: async () => {
    try {
      const { data } = await apiClient.get("/admin/documents/email-status");
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch email notification status";
      throw new DocumentApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Document validation utilities
export const documentValidation = {
  // Validate document data
  validateDocumentData: (data, isUpdate = false) => {
    const errors = [];
    const { machine_id, document_type, expiry_date, last_renewed_date } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_id) {
        errors.push("Machine ID is required");
      }
      if (!document_type) {
        errors.push("Document type is required");
      }
      if (!expiry_date) {
        errors.push("Expiry date is required");
      }
    }

    // Document type validation
    const validTypes = ["RC_Book", "PUC", "Fitness", "Insurance"];
    if (document_type && !validTypes.includes(document_type)) {
      errors.push(
        `Invalid document type. Must be one of: ${validTypes.join(", ")}`
      );
    }

    // Date validations
    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      if (isNaN(expiryDate.getTime())) {
        errors.push("Invalid expiry date format");
      }
    }

    if (last_renewed_date) {
      const renewedDate = new Date(last_renewed_date);
      if (isNaN(renewedDate.getTime())) {
        errors.push("Invalid renewal date format");
      }
    }

    // Logical date validation
    if (expiry_date && last_renewed_date) {
      const expiryDate = new Date(expiry_date);
      const renewedDate = new Date(last_renewed_date);

      if (renewedDate > expiryDate) {
        errors.push("Renewal date cannot be after expiry date");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate notification settings
  validateNotificationSettings: (notifications) => {
    const errors = [];

    if (!Array.isArray(notifications)) {
      errors.push("Notifications must be an array");
      return { isValid: false, errors };
    }

    notifications.forEach((notification, index) => {
      if (
        typeof notification.days_before !== "number" ||
        notification.days_before < 0
      ) {
        errors.push(
          `Notification ${index + 1}: Valid days_before value is required`
        );
      }

      if (typeof notification.is_active !== "boolean") {
        errors.push(
          `Notification ${index + 1}: is_active must be a boolean value`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Document formatting utilities
export const documentUtils = {
  // Format document type for display
  formatDocumentType: (type) => {
    const typeMap = {
      RC_Book: "RC Book",
      PUC: "PUC Certificate",
      Fitness: "Fitness Certificate",
      Insurance: "Insurance Policy",
    };
    return typeMap[type] || type;
  },

  // Get document type icon
  getDocumentTypeIcon: (type) => {
    const iconMap = {
      RC_Book: "📋",
      PUC: "🌿",
      Fitness: "✅",
      Insurance: "🛡️",
    };
    return iconMap[type] || "📄";
  },

  // Get expiry status
  getExpiryStatus: (expiryDate) => {
    if (!expiryDate) return { status: "unknown", color: "gray" };

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "expired", color: "red", days: Math.abs(diffDays) };
    } else if (diffDays <= 7) {
      return { status: "critical", color: "red", days: diffDays };
    } else if (diffDays <= 30) {
      return { status: "warning", color: "orange", days: diffDays };
    } else {
      return { status: "valid", color: "green", days: diffDays };
    }
  },

  // Format expiry status text
  formatExpiryStatus: (expiryDate) => {
    const status = documentUtils.getExpiryStatus(expiryDate);

    switch (status.status) {
      case "expired":
        return `Expired ${status.days} days ago`;
      case "critical":
        return `Expires in ${status.days} days`;
      case "warning":
        return `Expires in ${status.days} days`;
      case "valid":
        return `Valid for ${status.days} days`;
      default:
        return "Unknown status";
    }
  },

  // Get status badge class
  getStatusBadgeClass: (expiryDate) => {
    const status = documentUtils.getExpiryStatus(expiryDate);

    const badgeMap = {
      expired: "bg-red-100 text-red-800",
      critical: "bg-red-100 text-red-800",
      warning: "bg-orange-100 text-orange-800",
      valid: "bg-green-100 text-green-800",
      unknown: "bg-gray-100 text-gray-800",
    };

    return badgeMap[status.status] || "bg-gray-100 text-gray-800";
  },

  // Format date for display
  formatDate: (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },

  // Calculate renewal suggestion
  suggestRenewalDate: (expiryDate, documentType) => {
    if (!expiryDate) return null;

    // If expired, start renewal from Today
    const today = new Date();
    const expiry = new Date(expiryDate);
    const startDate = expiry < today ? today : expiry;
    const renewal = new Date(startDate);

    // Suggest renewal periods based on document type
    const renewalPeriods = {
      RC_Book: { years: 1 }, // RC renewal is typically 1 year (as requested)
      PUC: { months: 6 }, // PUC certificates are typically valid for 6 months
      Fitness: { years: 1 }, // Fitness certificates are typically valid for 1 year
      Insurance: { years: 1 }, // Insurance policies are typically valid for 1 year
    };

    const period = renewalPeriods[documentType] || { years: 1 };

    if (period.years) {
      renewal.setFullYear(renewal.getFullYear() + period.years);
    } else if (period.months) {
      renewal.setMonth(renewal.getMonth() + period.months);
    }

    return renewal.toISOString().split("T")[0];
  },

  // Group documents by machine
  groupByMachine: (documents = []) => {
    const grouped = {};

    documents.forEach((doc) => {
      const machineKey = doc.machine_number || doc.machine_id || "unknown";
      if (!grouped[machineKey]) {
        grouped[machineKey] = {
          machine: doc.machine_name || `Machine ${machineKey}`,
          documents: [],
        };
      }
      grouped[machineKey].documents.push(doc);
    });

    return grouped;
  },

  // Filter documents by expiry status
  filterByExpiryStatus: (documents = [], statusFilter = "all") => {
    if (statusFilter === "all") return documents;

    return documents.filter((doc) => {
      const status = documentUtils.getExpiryStatus(doc.expiry_date);
      return status.status === statusFilter;
    });
  },

  // Sort documents by expiry date
  sortByExpiry: (documents = [], direction = "asc") => {
    return [...documents].sort((a, b) => {
      const dateA = new Date(a.expiry_date || "9999-12-31");
      const dateB = new Date(b.expiry_date || "9999-12-31");

      if (direction === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  },

  // Calculate document statistics
  calculateDocumentStats: (documents = []) => {
    if (documents.length === 0) {
      return {
        total: 0,
        expired: 0,
        expiringSoon: 0,
        valid: 0,
        byType: {},
      };
    }

    const stats = {
      total: documents.length,
      expired: 0,
      expiringSoon: 0,
      valid: 0,
      byType: {},
    };

    documents.forEach((doc) => {
      const status = documentUtils.getExpiryStatus(doc.expiry_date);

      // Count by status
      if (status.status === "expired") {
        stats.expired++;
      } else if (status.status === "critical" || status.status === "warning") {
        stats.expiringSoon++;
      } else if (status.status === "valid") {
        stats.valid++;
      }

      // Count by type
      const type = doc.document_type;
      if (!stats.byType[type]) {
        stats.byType[type] = 0;
      }
      stats.byType[type]++;
    });

    return stats;
  },
};
