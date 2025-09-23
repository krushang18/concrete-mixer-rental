// src/services/termsConditionsApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

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
        category: filters.category,
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
      toast.error(errorMsg);
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
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
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

  // Get all categories
  getCategories: async () => {
    try {
      const { data } = await apiClient.get(
        "/admin/terms-conditions/categories"
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch categories";
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
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
      toast.success(
        data.message || "Terms and conditions created successfully"
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
      toast.error(errorMsg);
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
      toast.success(
        data.message || "Terms and conditions updated successfully"
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
      toast.error(errorMsg);
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
      toast.success(
        data.message || "Terms and conditions deleted successfully"
      );
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete terms and conditions with ID ${id}`;
      toast.error(errorMsg);
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
      toast.success(data.message || "Display order updated successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update display order";
      toast.error(errorMsg);
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
      toast.success(data.message || "Terms deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to delete terms";
      toast.error(errorMsg);
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
      toast.success(data.message || "Default status updated successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update default status";
      toast.error(errorMsg);
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get statistics
  getStats: async () => {
    try {
      const { data } = await apiClient.get("/admin/terms-conditions/stats");
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch terms and conditions statistics";
      console.error("Terms conditions stats error:", errorMsg);
      throw new TermsConditionsApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Duplicate terms and conditions
  duplicate: async (id) => {
    if (!id) {
      throw new TermsConditionsApiError("Terms and conditions ID is required");
    }

    try {
      const { data } = await apiClient.post(
        `/admin/terms-conditions/${id}/duplicate`
      );
      toast.success(
        data.message || "Terms and conditions duplicated successfully"
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
      toast.error(errorMsg);
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
    const { title, description, category, display_order } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!title?.trim()) {
        errors.push("Title is required");
      }
      if (!description?.trim()) {
        errors.push("Description is required");
      }
      if (!category?.trim()) {
        errors.push("Category is required");
      }
    }

    // Field validations
    if (title && title.length > 200) {
      errors.push("Title must be less than 200 characters");
    }
    if (description && description.length > 2000) {
      errors.push("Description must be less than 2000 characters");
    }
    if (category && category.length > 100) {
      errors.push("Category must be less than 100 characters");
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

    if (updates.category && updates.category.length > 100) {
      errors.push("Category must be less than 100 characters");
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
    console.log(
      "------------------------------------------formatTermsForDisplay"
    );

    return {
      ...terms,
      shortDescription:
        terms.description?.length > 100
          ? `${terms.description.substring(0, 100)}...`
          : terms.description,
      formattedCategory: termsConditionsUtils.formatCategory(terms.category),
      isDefault: terms.is_default === 1 || terms.is_default === true,
    };
  },

  // Format category for display
  formatCategory: (category) => {
    console.log("----------------------------------------------formatCategory");

    if (!category || typeof category !== "string") return "Uncategorized";

    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  // Get category color class
  getCategoryColor: (category) => {
    if (!category || typeof category !== "string")
      return "bg-gray-100 text-gray-800";

    const colorMap = {
      general: "bg-blue-100 text-blue-800",
      payment: "bg-green-100 text-green-800",
      delivery: "bg-orange-100 text-orange-800",
      maintenance: "bg-purple-100 text-purple-800",
      liability: "bg-red-100 text-red-800",
      warranty: "bg-yellow-100 text-yellow-800",
      cancellation: "bg-gray-100 text-gray-800",
    };

    const normalizedCategory = category.toLowerCase().replace(/\s+/g, "_");
    return colorMap[normalizedCategory] || "bg-gray-100 text-gray-800";
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

  // Group terms by category
  groupByCategory: (terms = []) => {
    const grouped = {};

    terms.forEach((term) => {
      const category = term.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(term);
    });

    // Sort terms within each category by display order
    Object.keys(grouped).forEach((category) => {
      grouped[category] = termsConditionsUtils.sortByDisplayOrder(
        grouped[category]
      );
    });

    return grouped;
  },

  // Filter terms by search term
  filterBySearch: (terms = [], searchTerm = "") => {
    if (!searchTerm.trim()) return terms;

    const term = searchTerm.toLowerCase();

    return terms.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(term) ||
        (t.description || "").toLowerCase().includes(term) ||
        (t.category || "").toLowerCase().includes(term)
    );
  },

  // Generate terms text for quotation
  generateQuotationTerms: (selectedTerms = []) => {
    if (!Array.isArray(selectedTerms) || selectedTerms.length === 0) {
      return "";
    }

    // Sort by display order
    const sortedTerms = termsConditionsUtils.sortByDisplayOrder(selectedTerms);

    // Group by category
    const groupedTerms = termsConditionsUtils.groupByCategory(sortedTerms);

    let termsText = "";
    console.log(
      "------------------------------------------generateQuotationTerms"
    );
    Object.keys(groupedTerms).forEach((category, categoryIndex) => {
      if (categoryIndex > 0) termsText += "\n\n";

      termsText += `${termsConditionsUtils.formatCategory(category).toUpperCase()}:\n`;

      groupedTerms[category].forEach((term, termIndex) => {
        termsText += `${termIndex + 1}. ${term.title}\n`;
        if (term.description) {
          termsText += `   ${term.description}\n`;
        }
      });
    });

    return termsText;
  },

  // Calculate terms statistics
  calculateTermsStats: (terms = []) => {
    if (terms.length === 0) {
      return {
        total: 0,
        byCategory: {},
        defaultCount: 0,
        averageLength: 0,
      };
    }

    const stats = {
      total: terms.length,
      byCategory: {},
      defaultCount: 0,
      averageLength: 0,
    };

    let totalLength = 0;

    terms.forEach((term) => {
      // Count by category
      const category = term.category || "Uncategorized";
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = 0;
      }
      stats.byCategory[category]++;

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
  generateDisplayOrder: (existingTerms = [], category = null) => {
    let maxOrder = 0;

    if (category) {
      // Find max order within the same category
      const categoryTerms = existingTerms.filter(
        (t) => t.category === category
      );
      maxOrder = categoryTerms.reduce(
        (max, term) => Math.max(max, term.display_order || 0),
        0
      );
    } else {
      // Find max order overall
      maxOrder = existingTerms.reduce(
        (max, term) => Math.max(max, term.display_order || 0),
        0
      );
    }

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
    console.log("------------------------------------------formatForExport");

    return terms.map((term) => ({
      ID: term.id,
      Title: term.title,
      Description: term.description,
      Category: termsConditionsUtils.formatCategory(term.category),
      "Is Default": term.is_default ? "Yes" : "No",
      "Display Order": term.display_order || "",
      "Created Date": new Date(term.created_at).toLocaleDateString("en-IN"),
      "Updated Date": new Date(term.updated_at).toLocaleDateString("en-IN"),
    }));
  },

  // Create terms template
  createTemplate: (category) => {
    const templates = {
      general: {
        title: "General Terms",
        description:
          "These terms and conditions govern the rental agreement between the parties.",
        category: "general",
      },
      payment: {
        title: "Payment Terms",
        description: "Payment must be made in advance or as per agreed terms.",
        category: "payment",
      },
      delivery: {
        title: "Delivery Terms",
        description:
          "Equipment will be delivered to the specified location at the agreed time.",
        category: "delivery",
      },
      maintenance: {
        title: "Maintenance Responsibility",
        description:
          "The renter is responsible for basic maintenance during the rental period.",
        category: "maintenance",
      },
      liability: {
        title: "Liability Terms",
        description:
          "The renter assumes full responsibility for the equipment during the rental period.",
        category: "liability",
      },
      warranty: {
        title: "Warranty Terms",
        description:
          "Equipment is provided as-is with no warranty unless specified otherwise.",
        category: "warranty",
      },
      cancellation: {
        title: "Cancellation Policy",
        description:
          "Cancellations must be made 24 hours in advance to avoid charges.",
        category: "cancellation",
      },
    };

    return (
      templates[category] || {
        title: "New Term",
        description: "Enter description here...",
        category: category || "general",
      }
    );
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

  // Check if terms are used in quotations
  checkUsageInQuotations: async (termId) => {
    try {
      const { data } = await apiClient.get(
        `/admin/terms-conditions/${termId}/usage`
      );
      return {
        isUsed: data.data?.isUsed || false,
        quotationCount: data.data?.quotationCount || 0,
        recentQuotations: data.data?.recentQuotations || [],
      };
    } catch (error) {
      console.error("Error checking terms usage:", error);
      return {
        isUsed: false,
        quotationCount: 0,
        recentQuotations: [],
      };
    }
  },
};
