// src/services/quotationApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

export class QuotationApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "QuotationApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Quotation API Service
 * Handles all quotation-related API operations
 */
export const quotationApi = {
  // Get all quotations with filtering and pagination
  getAll: async (filters = {}) => {
    try {
      const params = {
        // FIX: Map search to the correct backend parameter
        search: filters.search, // Backend now expects 'search' parameter
        customer_name: filters.customer_name, // Keep for backward compatibility
        status: filters.status,
        delivery_status: filters.delivery_status,
        machine_id: filters.machine_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        date: filters.date, // Single date filter
        sort_by: filters.sort_by || "created_at",
        sort_order: filters.sort_order || "DESC",
        page: filters.page || 1,
        limit: filters.limit || 20,
        // Remove offset calculation - let backend handle it
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const { data } = await apiClient.get("/admin/quotations", { params });

      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || {}, // Include pagination object
        count: data.count || 0,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch quotations";
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get quotation by ID
  getById: async (id) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/quotations/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch quotation with ID ${id}`;
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create new quotation
  create: async (quotationData) => {
    if (!quotationData) {
      throw new QuotationApiError("Quotation data is required");
    }

    try {
      const { data } = await apiClient.post("/admin/quotations", quotationData);
      toast.success(data.message || "Quotation created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create quotation";
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  update: async (id, quotationData) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }
    if (!quotationData) {
      throw new QuotationApiError("Quotation data is required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/quotations/${id}`,
        quotationData
      );
      toast.success(data.message || "Quotation updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to update quotation with ID ${id}`;
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  delete: async (id) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/quotations/${id}`);
      toast.success(data.message || "Quotation deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete quotation with ID ${id}`;
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  updateStatus: async (id, status) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }
    if (!status) {
      throw new QuotationApiError("Status is required");
    }

    const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
    if (!validStatuses.includes(status)) {
      throw new QuotationApiError(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    try {
      const { data } = await apiClient.put(`/admin/quotations/${id}/status`, {
        status,
      });
      toast.success(data.message || "Quotation status updated successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to update quotation status for ID ${id}`;
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },



  // Get next quotation number
  getNextNumber: async () => {
    try {
      const { data } = await apiClient.get("/admin/quotations/next-number");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to get next quotation number";
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get customer quotation history
  getCustomerHistory: async (customerId) => {
    if (!customerId) {
      throw new QuotationApiError("Customer ID is required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/quotations/customer/${customerId}`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch customer history for ID ${customerId}`;
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get customer pricing history by name and contact
  getPricingHistory: async (customerName, customerContact) => {
    if (!customerName || !customerContact) {
      throw new QuotationApiError("Customer name and contact are required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/quotations/history/${encodeURIComponent(
          customerName
        )}/${encodeURIComponent(customerContact)}`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch customer pricing history";
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Generate PDF for quotation
  generatePDF: async (id) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }

    try {
      const response = await apiClient.get(`/admin/quotations/${id}/pdf`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `OCS_SLCM_Quote-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "PDF generated and downloaded successfully",
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to generate PDF for quotation ${id}`;
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  previewPDF: async (id) => {
    if (!id) {
      throw new QuotationApiError("Quotation ID is required");
    }

    try {

      const response = await apiClient.get(`/admin/quotations/${id}/pdf`, {
        responseType: "blob",
        timeout: 30000,
      });

      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Open PDF in new tab
      const newWindow = window.open(url, "_blank");

      if (!newWindow) {
        // Fallback to download if popup blocked
        return this.downloadPDF(id);
      }

      // Cleanup URL after a delay to allow the new tab to load
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      return {
        success: true,
        message: "PDF opened in new tab",
      };
    } catch (error) {
      console.error("❌ PDF preview error:", error);
      throw new QuotationApiError(
        "Failed to preview PDF",
        [],
        error.response?.status
      );
    }
  },

  // Export quotations to Excel
  exportToExcel: async (filters = {}) => {
    try {
      const params = {
        format: "excel",
        status: filters.status,
        delivery_status: filters.delivery_status,
        customer_name: filters.customer_name,
        start_date: filters.start_date,
        end_date: filters.end_date,
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const { data } = await apiClient.get("/admin/quotations/export", {
        params,
      });

      // For frontend handling, you might want to convert to CSV or handle differently
      return {
        success: true,
        data: data.data || [],
        filename: data.filename || "quotations-export.xlsx",
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to export quotations";
      toast.error(errorMsg);
      throw new QuotationApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Quotation validation utilities
export const quotationValidation = {
  // Validate quotation data
  validateQuotationData: (data, isUpdate = false) => {
    const errors = [];
    const {
      customer_name,
      customer_contact,
      customer_gst_number,
      items,
      quotation_status,
      delivery_status,
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!customer_name?.trim()) {
        errors.push("Customer name is required");
      }
      if (!customer_contact?.trim()) {
        errors.push("Customer contact is required");
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push("At least one quotation item is required");
      }
    }

    // Field validations
    if (customer_name && customer_name.length > 100) {
      errors.push("Customer name must be less than 100 characters");
    }
    if (customer_contact && customer_contact.length > 20) {
      errors.push("Customer contact must be less than 20 characters");
    }

    if (
      customer_gst_number &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
        customer_gst_number
      )
    ) {
      errors.push("Invalid GST number format");
    }

    // Status validations
    const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
    if (quotation_status && !validStatuses.includes(quotation_status)) {
      errors.push(
        `Invalid quotation status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const validDeliveryStatuses = [
      "pending",
      "delivered",
      "completed",
      "cancelled",
    ];
    if (delivery_status && !validDeliveryStatuses.includes(delivery_status)) {
      errors.push(
        `Invalid delivery status. Must be one of: ${validDeliveryStatuses.join(
          ", "
        )}`
      );
    }

    // Validate items if present
    if (items && Array.isArray(items)) {
      items.forEach((item, index) => {
        if (!item.item_type) {
          errors.push(`Item ${index + 1}: Item type is required`);
        }
        if (item.quantity === undefined || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
          errors.push(`Item ${index + 1}: Valid unit price is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate quotation item
  validateQuotationItem: (item) => {
    const errors = [];

    if (!item.item_type) {
      errors.push("Item type is required");
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push("Valid quantity is required");
    }
    if (item.unit_price === undefined || item.unit_price < 0) {
      errors.push("Valid unit price is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Quotation formatting utilities
export const quotationUtils = {
  // Format currency for display
  formatCurrency: (amount) => {
    if (amount === null || amount === undefined) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  },

  // Format quotation status
  formatStatus: (status) => {
    const statusMap = {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      rejected: "Rejected",
      expired: "Expired",
    };
    return statusMap[status] || status;
  },

  // Format delivery status
  formatDeliveryStatus: (status) => {
    const statusMap = {
      pending: "Pending",
      delivered: "Delivered",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  },

  // Get status color class
  getStatusColor: (status) => {
    const colorMap = {
      draft: "text-gray-600",
      sent: "text-blue-600",
      accepted: "text-green-600",
      rejected: "text-red-600",
      expired: "text-orange-600",
    };
    return colorMap[status] || "text-gray-600";
  },

  // Get delivery status color class
  getDeliveryStatusColor: (status) => {
    const colorMap = {
      pending: "text-yellow-600",
      delivered: "text-blue-600",
      completed: "text-green-600",
      cancelled: "text-red-600",
    };
    return colorMap[status] || "text-gray-600";
  },

  // Get status badge class
  getStatusBadgeClass: (status) => {
    const badgeMap = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-orange-100 text-orange-800",
    };
    return badgeMap[status] || "bg-gray-100 text-gray-800";
  },

  // Get delivery status badge class
  getDeliveryStatusBadgeClass: (status) => {
    const badgeMap = {
      pending: "bg-yellow-100 text-yellow-800",
      delivered: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return badgeMap[status] || "bg-gray-100 text-gray-800";
  },

  // Calculate quotation totals
  calculateTotals: (items = []) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + item.quantity * item.unit_price;
    }, 0);

    const totalGST = items.reduce((sum, item) => {
      if (item.gst_included) {
        const gstAmount =
          (item.quantity * item.unit_price * (item.gst_percentage || 0)) / 100;
        return sum + gstAmount;
      }
      return sum;
    }, 0);

    const grandTotal = subtotal + totalGST;

    return {
      subtotal,
      totalGST,
      grandTotal,
      totalItems: items.length,
    };
  },

  // Generate quotation reference
  generateReference: (quotationNumber) => {
    return `QUO-${String(quotationNumber).padStart(3, "0")}`;
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

  // Calculate days between dates
  daysBetween: (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
  },
};
