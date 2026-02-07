// src/services/termsConditionsApi.js
import apiClient from "./api";

export class TermsConditionsApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "TermsConditionsApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Terms & Conditions API Service
 * Handles all terms and conditions management operations
 */
export const termsConditionsApi = {
  // Get all terms and conditions
  getAll: async (filters = {}) => {
    try {
      const params = {
        is_default: filters.is_default,
        search: filters.search,
        limit: filters.limit,
        offset: filters.offset,
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const { data } = await apiClient.get("/admin/terms-conditions", {
        params,
      });
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch terms and conditions";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get terms and conditions by ID
  getById: async (id) => {
    if (!id) {
      throw new TermsConditionsApiError("Terms and conditions ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/terms-conditions/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch terms and conditions with ID ${id}`;
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get default terms and conditions
  getDefaults: async () => {
    try {
      const { data } = await apiClient.get("/admin/terms-conditions/default");
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch default terms and conditions";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get terms for quotation (formatted)
  getForQuotation: async () => {
    try {
      const { data } = await apiClient.get("/admin/terms-conditions/for-quotation");
      return { success: true, data: data.data };
    } catch (error) {
      console.error("Failed to fetch terms for quotation", error);
      return { success: false, data: [] };
    }
  },

  // Create new terms and conditions
  create: async (termsData) => {
    if (!termsData) {
      throw new TermsConditionsApiError(
        "Terms and conditions data is required"
      );
    }

    try {
      const { data } = await apiClient.post(
        "/admin/terms-conditions",
        termsData
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to create terms and conditions";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update terms and conditions
  update: async (id, termsData) => {
    if (!id) {
      throw new TermsConditionsApiError("Terms and conditions ID is required");
    }
    if (!termsData) {
      throw new TermsConditionsApiError(
        "Terms and conditions data is required"
      );
    }

    try {
      const { data } = await apiClient.put(
        `/admin/terms-conditions/${id}`,
        termsData
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to update terms and conditions with ID ${id}`;
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete terms and conditions
  delete: async (id) => {
    if (!id) {
      throw new TermsConditionsApiError("Terms and conditions ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/terms-conditions/${id}`);
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete terms and conditions with ID ${id}`;
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update display order
  updateDisplayOrder: async (orderData) => {
    if (!orderData || !Array.isArray(orderData)) {
      throw new TermsConditionsApiError("Order data array is required");
    }

    try {
      const { data } = await apiClient.put("/admin/terms-conditions/reorder", {
        items: orderData, // Change from 'order' to 'items'
      });
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update display order";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  bulkDelete: async (termsIds) => {
    if (!termsIds || !Array.isArray(termsIds) || termsIds.length === 0) {
      throw new TermsConditionsApiError("Terms IDs array is required");
    }

    try {
      const { data } = await apiClient.delete("/admin/terms-conditions/bulk", {
        data: { ids: termsIds }, // Use 'ids' not 'terms_ids'
      });
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to delete terms";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Set as default - Updated to match backend
  setAsDefault: async (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new TermsConditionsApiError(
        "Terms and conditions IDs array is required"
      );
    }

    try {
      const { data } = await apiClient.post(
        `/admin/terms-conditions/set-default`,
        {
          ids: ids,
        }
      );
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update default status";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Export terms and conditions
  duplicate: async (id) => {
    if (!id) {
      throw new TermsConditionsApiError("Terms and conditions ID is required");
    }

    try {
      const { data } = await apiClient.post(
        `/admin/terms-conditions/${id}/duplicate`
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to duplicate terms and conditions with ID ${id}`;
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Terms and Conditions validation utilities
export const termsConditionsValidation = {
  // Validate terms and conditions data
  validateTermsData: (data, isUpdate = false) => {
    const errors = [];
    const { title, description, display_order } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!title?.trim()) {
        errors.push("Title is required");
      }
      if (!description?.trim()) {
        errors.push("Description is required");
      }
    }

    // Field validations
    if (title && title.length > 200) {
      errors.push("Title must be less than 200 characters");
    }
    if (description && description.length > 2000) {
      errors.push("Description must be less than 2000 characters");
    }
    if (
      display_order !== undefined &&
      (isNaN(display_order) || display_order < 0)
    ) {
      errors.push("Display order must be a valid positive number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate bulk update data
  validateBulkUpdateData: (data) => {
    const errors = [];
    const { terms_ids, updates } = data;

    if (!Array.isArray(terms_ids) || terms_ids.length === 0) {
      errors.push("At least one terms and conditions ID is required");
    }

    if (!updates || typeof updates !== "object") {
      errors.push("Updates object is required");
    }



    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate import file
  validateImportFile: (file) => {
    const errors = [];

    if (!file) {
      errors.push("Import file is required");
      return { isValid: false, errors };
    }

    // File type validation
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    if (!allowedTypes.includes(file.type)) {
      errors.push("File must be an Excel (.xlsx, .xls) or CSV file");
    }

    // File size validation (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push("File size must be less than 10MB");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Terms and Conditions formatting utilities
export const termsConditionsUtils = {
  // Format terms for display
  formatTermsForDisplay: (terms) => {
    if (!terms) return null;


    return {
      ...terms,
      shortDescription:
        terms.description?.length > 100
          ? `${terms.description.substring(0, 100)}...`
          : terms.description,
      isDefault: terms.is_default === 1 || terms.is_default === true,
    };
  },



  // Get default badge class
  getDefaultBadgeClass: (isDefault) => {
    return isDefault
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  },

  // Sort terms by display order
  sortByDisplayOrder: (terms = []) => {
    return [...terms].sort((a, b) => {
      const orderA = a.display_order || 999;
      const orderB = b.display_order || 999;
      return orderA - orderB;
    });
  },



  // Filter terms by search term
  filterBySearch: (terms = [], searchTerm = "") => {
    if (!searchTerm.trim()) return terms;

    const term = searchTerm.toLowerCase();

    return terms.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(term) ||
        (t.description || "").toLowerCase().includes(term)
    );
  },

  // Generate terms text for quotation
  generateQuotationTerms: (selectedTerms = []) => {
    if (!Array.isArray(selectedTerms) || selectedTerms.length === 0) {
      return "";
    }

    // Sort by display order
    const sortedTerms = termsConditionsUtils.sortByDisplayOrder(selectedTerms);

    let termsText = "";
    sortedTerms.forEach((term, index) => {
      if (index > 0) termsText += "\n\n";
      termsText += `${index + 1}. ${term.title}\n`;
      if (term.description) {
        termsText += `   ${term.description}\n`;
      }
    });

    return termsText;
  },

  // Calculate terms statistics
  calculateTermsStats: (terms = []) => {
    if (terms.length === 0) {
      return {
        total: 0,
        defaultCount: 0,
        averageLength: 0,
      };
    }

    const stats = {
      total: terms.length,
      defaultCount: 0,
      averageLength: 0,
    };

    let totalLength = 0;

    terms.forEach((term) => {
      // Count defaults
      if (term.is_default) {
        stats.defaultCount++;
      }

      // Calculate length
      totalLength += (term.description || "").length;
    });

    stats.averageLength = Math.round(totalLength / terms.length);

    return stats;
  },

  // Generate suggested display order
  generateDisplayOrder: (existingTerms = []) => {
    // Find max order overall
    const maxOrder = existingTerms.reduce(
      (max, term) => Math.max(max, term.display_order || 0),
      0
    );

    return maxOrder + 1;
  },

  // Reorder terms after deletion
  reorderAfterDeletion: (terms = [], deletedOrder) => {
    return terms.map((term) => {
      if (term.display_order > deletedOrder) {
        return {
          ...term,
          display_order: term.display_order - 1,
        };
      }
      return term;
    });
  },

  // Validate display order
  validateDisplayOrder: (terms = []) => {
    const orders = terms
      .map((t) => t.display_order)
      .filter((o) => o !== null && o !== undefined);
    const uniqueOrders = new Set(orders);

    return {
      isValid: orders.length === uniqueOrders.size,
      duplicates: orders.length - uniqueOrders.size,
      maxOrder: Math.max(...orders, 0),
      gaps: termsConditionsUtils.findOrderGaps(orders),
    };
  },

  // Find gaps in display order sequence
  findOrderGaps: (orders = []) => {
    if (orders.length === 0) return [];

    const sortedOrders = [...new Set(orders)].sort((a, b) => a - b);
    const gaps = [];

    for (let i = 1; i < sortedOrders.length; i++) {
      const current = sortedOrders[i];
      const previous = sortedOrders[i - 1];

      if (current - previous > 1) {
        for (let gap = previous + 1; gap < current; gap++) {
          gaps.push(gap);
        }
      }
    }

    return gaps;
  },

  // Format terms for export
  formatForExport: (terms = []) => {


    return terms.map((term) => ({
      ID: term.id,
      Title: term.title,
      Description: term.description,
      "Is Default": term.is_default ? "Yes" : "No",
      "Display Order": term.display_order || "",
      "Created Date": new Date(term.created_at).toLocaleDateString("en-IN"),
      "Updated Date": new Date(term.updated_at).toLocaleDateString("en-IN"),
    }));
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


};
