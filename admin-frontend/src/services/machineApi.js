// src/services/machineApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

export class MachineApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "MachineApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Machine API Service
 * Handles all machine-related API operations
 */
export const machineApi = {
  // Get all machines with optional filtering and pagination
  getAll: async (params = {}) => {
    try {
      const { data } = await apiClient.get("/admin/machines", { params });
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch machines";
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get machine statistics for dashboard
  getStats: async () => {
    try {
      const { data } = await apiClient.get("/admin/machines/stats");
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch machine statistics";
      console.error("Machine stats error:", errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get only active machines (for quotation creation)
  getActive: async () => {
    try {
      const { data } = await apiClient.get("/admin/machines/active");
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch active machines";
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Search machines
  search: async (searchParams = {}) => {
    try {
      const { data } = await apiClient.get("/admin/machines/search", {
        params: searchParams,
      });
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to search machines";
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get specific machine by ID
  getById: async (id) => {
    if (!id) {
      throw new MachineApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/machines/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch machine with ID ${id}`;
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get machine pricing
  getPricing: async (id) => {
    if (!id) {
      throw new MachineApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/machines/${id}/pricing`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch machine pricing for ID ${id}`;
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create new machine
  create: async (machineData) => {
    if (!machineData) {
      throw new MachineApiError("Machine data is required");
    }

    try {
      const { data } = await apiClient.post("/admin/machines", machineData);
      toast.success(data.message || "Machine created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create machine";
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update machine
  update: async (id, machineData) => {
    if (!id) {
      throw new MachineApiError("Machine ID is required");
    }
    if (!machineData) {
      throw new MachineApiError("Machine data is required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/machines/${id}`,
        machineData
      );
      toast.success(data.message || "Machine updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to update machine with ID ${id}`;
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete machine (soft delete if has quotations)
  delete: async (id) => {
    if (!id) {
      throw new MachineApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/machines/${id}`);
      toast.success(data.message || "Machine deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete machine with ID ${id}`;
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Toggle machine active status
  toggleStatus: async (id) => {
    if (!id) {
      throw new MachineApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/machines/${id}/toggle-status`
      );
      toast.success(data.message || "Machine status updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to toggle status for machine with ID ${id}`;
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Bulk update machines
  bulkUpdate: async (machineIds, updates) => {
    if (!machineIds || !Array.isArray(machineIds) || machineIds.length === 0) {
      throw new MachineApiError("Machine IDs array is required");
    }
    if (!updates || typeof updates !== "object") {
      throw new MachineApiError("Updates object is required");
    }

    try {
      const { data } = await apiClient.put("/admin/machines/bulk/update", {
        machine_ids: machineIds,
        updates,
      });
      toast.success(
        data.message ||
          `${data.updatedCount || machineIds.length} machines updated successfully`
      );
      return {
        success: true,
        updatedCount: data.updatedCount || 0,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to bulk update machines";
      toast.error(errorMsg);
      throw new MachineApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Machine validation utilities
export const machineValidation = {
  // Validate machine form data
  validateMachineData: (data, isUpdate = false) => {
    const errors = [];
    const {
      machine_number,
      name,
      priceByDay,
      priceByWeek,
      priceByMonth,
      gst_percentage,
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_number?.trim()) {
        errors.push("Machine number is required");
      }
      if (!name?.trim()) {
        errors.push("Machine name is required");
      }
      if (
        priceByDay === undefined ||
        priceByDay === null ||
        priceByDay === ""
      ) {
        errors.push("Daily price is required");
      }
      if (
        priceByWeek === undefined ||
        priceByWeek === null ||
        priceByWeek === ""
      ) {
        errors.push("Weekly price is required");
      }
      if (
        priceByMonth === undefined ||
        priceByMonth === null ||
        priceByMonth === ""
      ) {
        errors.push("Monthly price is required");
      }
    }

    // Field validations
    if (machine_number && machine_number.length > 50) {
      errors.push("Machine number must be less than 50 characters");
    }
    if (machine_number && !/^[A-Z0-9-]+$/i.test(machine_number)) {
      errors.push(
        "Machine number can only contain letters, numbers, and hyphens"
      );
    }
    if (name && name.length > 100) {
      errors.push("Machine name must be less than 100 characters");
    }

    // Price validations
    if (priceByDay !== undefined && (isNaN(priceByDay) || priceByDay < 0)) {
      errors.push("Daily price must be a valid positive number");
    }
    if (priceByWeek !== undefined && (isNaN(priceByWeek) || priceByWeek < 0)) {
      errors.push("Weekly price must be a valid positive number");
    }
    if (
      priceByMonth !== undefined &&
      (isNaN(priceByMonth) || priceByMonth < 0)
    ) {
      errors.push("Monthly price must be a valid positive number");
    }
    if (
      gst_percentage !== undefined &&
      (isNaN(gst_percentage) || gst_percentage < 0 || gst_percentage > 100)
    ) {
      errors.push("GST percentage must be between 0 and 100");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Generate next machine number suggestion
  generateMachineNumber: (existingMachines = []) => {
    const numbers = existingMachines
      .map((m) => m.machine_number)
      .filter((num) => /^CMR-\d{3}$/.test(num))
      .map((num) => parseInt(num.split("-")[1]))
      .filter((num) => !isNaN(num));

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `CMR-${nextNumber.toString().padStart(3, "0")}`;
  },
};

// Machine formatting utilities
export const machineUtils = {
  // Format currency for display
  formatPrice: (price) => {
    if (price === null || price === undefined) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  },

  // Format machine status
  formatStatus: (isActive) => {
    return isActive ? "Active" : "Inactive";
  },

  // Get status color class
  getStatusColor: (isActive) => {
    return isActive ? "text-green-600" : "text-red-600";
  },

  // Get status badge class
  getStatusBadgeClass: (isActive) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  },

  // Calculate pricing summary
  calculatePricingSummary: (machines = []) => {
    if (machines.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const dailyPrices = machines.map((m) => parseFloat(m.priceByDay || 0));
    return {
      min: Math.min(...dailyPrices),
      max: Math.max(...dailyPrices),
      avg:
        dailyPrices.reduce((sum, price) => sum + price, 0) / dailyPrices.length,
    };
  },
};
