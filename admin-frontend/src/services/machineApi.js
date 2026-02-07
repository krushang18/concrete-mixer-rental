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
      // Toast handled by global interceptor
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
      // Toast handled by global interceptor
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
      // Toast handled by global interceptor
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
      // Toast handled by global interceptor
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
      // Toast handled by global interceptor
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
      // Toast handled by global interceptor
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
      name
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_number?.trim()) {
        errors.push("Machine number is required");
      }
      if (!name?.trim()) {
        errors.push("Machine name is required");
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
};
