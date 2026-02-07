// src/services/serviceApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

export class ServiceApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "ServiceApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Service Records API Service
 * Handles all service records and maintenance tracking operations
 */
export const serviceApi = {
  // Get all service records with filtering
  getAll: async (filters = {}) => {
    try {
      const params = {
        machine_id: filters.machine_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        operator: filters.operator,
        site_location: filters.site_location,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const { data } = await apiClient.get("/admin/services", { params });
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch service records";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get service record by ID
  getById: async (id) => {


    if (!id) {
      throw new ServiceApiError("Service record ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/services/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch service record with ID ${id}`;
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get service records by machine ID
  getByMachine: async (machineId) => {
    if (!machineId) {
      throw new ServiceApiError("Machine ID is required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/services/machine/${machineId}`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch service records for machine ${machineId}`;
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create new service record
  create: async (serviceData) => {
    if (!serviceData) {
      throw new ServiceApiError("Service record data is required");
    }

    try {
      const { data } = await apiClient.post("/admin/services", serviceData);
      toast.success(data.message || "Service record created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create service record";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update service record
  update: async (id, serviceData) => {
    if (!id) {
      throw new ServiceApiError("Service record ID is required");
    }
    if (!serviceData) {
      throw new ServiceApiError("Service record data is required");
    }

    try {

      const { data } = await apiClient.put(
        `/admin/services/${id}`,
        serviceData
      );



      toast.success(data.message || "Service record updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {

      const errorMsg =
        error.response?.data?.message ||
        `Failed to update service record with ID ${id}`;
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete service record
  delete: async (id) => {
    if (!id) {
      throw new ServiceApiError("Service record ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/services/${id}`);
      toast.success(data.message || "Service record deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete service record with ID ${id}`;
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get service categories
  getServiceCategories: async () => {
    try {
      const { data } = await apiClient.get("/admin/services/categories");
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch service categories";
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create service category
  createServiceCategory: async (categoryData) => {
    if (!categoryData) {
      throw new ServiceApiError("Category data is required");
    }

    try {
      const { data } = await apiClient.post(
        "/admin/services/categories",
        categoryData
      );
      toast.success(data.message || "Service category created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create service category";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create sub-service item
  createSubServiceItem: async (subItemData) => {
    if (!subItemData) {
      throw new ServiceApiError("Sub-service item data is required");
    }

    try {
      const { data } = await apiClient.post(
        "/admin/services/sub-items",
        subItemData
      );
      toast.success(data.message || "Sub-service item created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create sub-service item";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update service category
  updateServiceCategory: async (id, categoryData) => {
    if (!id || !categoryData) {
      throw new ServiceApiError("Category ID and data are required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/services/categories/${id}`,
        categoryData
      );
      toast.success(data.message || "Service category updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update service category";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete service category
  deleteServiceCategory: async (id) => {
    if (!id) {
      throw new ServiceApiError("Category ID is required");
    }

    try {
      const { data } = await apiClient.delete(
        `/admin/services/categories/${id}`
      );
      toast.success(data.message || "Service category deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to delete service category";
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get sub-services
  getSubServices: async (categoryId) => {
    if (!categoryId) {
      throw new ServiceApiError("Category ID is required");
    }

    try {
      const { data } = await apiClient.get(
        `/admin/services/categories/${categoryId}/sub-services`
      );
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch sub-services";
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update sub-service item
  updateSubServiceItem: async (id, subItemData) => {
    if (!id || !subItemData) {
      throw new ServiceApiError("Sub-service ID and data are required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/services/sub-items/${id}`,
        subItemData
      );
      toast.success(data.message || "Sub-service item updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update sub-service item";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete sub-service item
  deleteSubServiceItem: async (id) => {
    if (!id) {
      throw new ServiceApiError("Sub-service ID is required");
    }

    try {
      const { data } = await apiClient.delete(
        `/admin/services/sub-items/${id}`
      );
      toast.success(data.message || "Sub-service item deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to delete sub-service item";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Export service records to CSV
  exportToCSV: async (filters = {}) => {
    try {
      const params = {
        machine_id: filters.machine_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        operator: filters.operator,
        format: "csv",
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const response = await apiClient.get("/admin/services/export", {
        params,
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      link.setAttribute(
        "download",
        `service-records-export-${currentDate}.csv`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Service records exported successfully",
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to export service records";
      toast.error(errorMsg);
      throw new ServiceApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },


};

// Service validation utilities
export const serviceValidation = {
  // Validate service record data
  validateServiceData: (data, isUpdate = false) => {
    const errors = [];
    const {
      machine_id,
      service_date,
      engine_hours,
      site_location,
      operator,
      services,
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_id) {
        errors.push("Machine ID is required");
      }
      if (!service_date) {
        errors.push("Service date is required");
      }
      if (!operator?.trim()) {
        errors.push("Operator name is required");
      }
    }

    // Field validations
    if (service_date) {
      const serviceDate = new Date(service_date);
      if (isNaN(serviceDate.getTime())) {
        errors.push("Invalid service date format");
      } else {
        const today = new Date();
        if (serviceDate > today) {
          errors.push("Service date cannot be in the future");
        }
      }
    }

    if (engine_hours !== undefined && engine_hours !== null) {
      if (isNaN(engine_hours) || engine_hours < 0) {
        errors.push("Engine hours must be a valid positive number");
      }
    }

    if (operator && operator.length > 100) {
      errors.push("Operator name must be less than 100 characters");
    }

    if (site_location && site_location.length > 255) {
      errors.push("Site location must be less than 255 characters");
    }

    // Validate services array if present
    if (services && Array.isArray(services)) {
      services.forEach((service, index) => {
        if (!service.category_id) {
          errors.push(`Service ${index + 1}: Category ID is required`);
        }
        if (
          !service.sub_services ||
          !Array.isArray(service.sub_services) ||
          service.sub_services.length === 0
        ) {
          errors.push(
            `Service ${index + 1}: At least one sub-service is required`
          );
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate service category data
  validateCategoryData: (data) => {
    const errors = [];
    const { name, description } = data;

    if (!name?.trim()) {
      errors.push("Category name is required");
    }

    if (name && name.length > 100) {
      errors.push("Category name must be less than 100 characters");
    }

    if (description && description.length > 500) {
      errors.push("Description must be less than 500 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate sub-service item data
  validateSubServiceData: (data) => {
    const errors = [];
    const { category_id, name, description } = data;

    if (!category_id) {
      errors.push("Category ID is required");
    }

    if (!name?.trim()) {
      errors.push("Sub-service name is required");
    }

    if (name && name.length > 200) {
      errors.push("Sub-service name must be less than 200 characters");
    }

    if (description && description.length > 500) {
      errors.push("Description must be less than 500 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Service formatting utilities
export const serviceUtils = {
  // Format service date for display
  formatDate: (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },

  // Format engine hours
  formatEngineHours: (hours) => {
    if (hours === null || hours === undefined) return "Not recorded";
    return `${parseFloat(hours).toFixed(1)} hrs`;
  },

  // Calculate days since last service
  daysSinceService: (serviceDate) => {
    if (!serviceDate) return null;

    const today = new Date();
    const service = new Date(serviceDate);
    const diffTime = today - service;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  },

  // Format days since service
  formatDaysSinceService: (serviceDate) => {
    const days = serviceUtils.daysSinceService(serviceDate);

    if (days === null) return "Never serviced";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  },

  // Get service status based on days since last service
  getServiceStatus: (lastServiceDate, intervalDays = 30) => {
    const days = serviceUtils.daysSinceService(lastServiceDate);

    if (days === null) {
      return { status: "never", color: "gray", message: "Never serviced" };
    }

    if (days > intervalDays * 1.5) {
      return { status: "overdue", color: "red", message: "Service overdue" };
    } else if (days > intervalDays) {
      return { status: "due", color: "orange", message: "Service due" };
    } else {
      return { status: "current", color: "green", message: "Service current" };
    }
  },

  // Get status badge class
  getStatusBadgeClass: (lastServiceDate, intervalDays = 30) => {
    const status = serviceUtils.getServiceStatus(lastServiceDate, intervalDays);

    const badgeMap = {
      never: "bg-gray-100 text-gray-800",
      overdue: "bg-red-100 text-red-800",
      due: "bg-orange-100 text-orange-800",
      current: "bg-green-100 text-green-800",
    };

    return badgeMap[status.status] || "bg-gray-100 text-gray-800";
  },

  // Group services by machine
  groupByMachine: (services = []) => {
    const grouped = {};

    services.forEach((service) => {
      const machineKey =
        service.machine_number || service.machine_id || "unknown";
      if (!grouped[machineKey]) {
        grouped[machineKey] = {
          machine: service.machine_name || `Machine ${machineKey}`,
          services: [],
        };
      }
      grouped[machineKey].services.push(service);
    });

    return grouped;
  },

  // Group services by operator
  groupByOperator: (services = []) => {
    const grouped = {};

    services.forEach((service) => {
      const operator = service.operator || "Unknown Operator";
      if (!grouped[operator]) {
        grouped[operator] = [];
      }
      grouped[operator].push(service);
    });

    return grouped;
  },

  // Calculate service frequency
  calculateServiceFrequency: (services = []) => {
    if (services.length < 2) return null;

    // Sort services by date
    const sortedServices = [...services].sort(
      (a, b) => new Date(a.service_date) - new Date(b.service_date)
    );

    const intervals = [];
    for (let i = 1; i < sortedServices.length; i++) {
      const prevDate = new Date(sortedServices[i - 1].service_date);
      const currDate = new Date(sortedServices[i].service_date);
      const days = Math.ceil((currDate - prevDate) / (1000 * 60 * 60 * 24));
      intervals.push(days);
    }

    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return {
      averageDays: Math.round(averageInterval),
      totalServices: services.length,
      intervals,
    };
  },

  // Generate service report summary
  generateServiceSummary: (services = []) => {
    if (services.length === 0) {
      return {
        totalServices: 0,
        uniqueOperators: 0,
        averageEngineHours: 0,
        lastServiceDate: null,
        totalEngineHours: 0,
      };
    }

    const uniqueOperators = new Set(services.map((s) => s.operator)).size;
    const servicesWithHours = services.filter(
      (s) => s.engine_hours !== null && s.engine_hours !== undefined
    );
    const totalEngineHours = servicesWithHours.reduce(
      (sum, s) => sum + parseFloat(s.engine_hours || 0),
      0
    );
    const averageEngineHours =
      servicesWithHours.length > 0
        ? totalEngineHours / servicesWithHours.length
        : 0;

    const latestService = services.reduce((latest, service) => {
      return new Date(service.service_date) >
        new Date(latest.service_date || "1900-01-01")
        ? service
        : latest;
    }, {});

    return {
      totalServices: services.length,
      uniqueOperators,
      averageEngineHours: Math.round(averageEngineHours * 10) / 10,
      lastServiceDate: latestService.service_date || null,
      totalEngineHours: Math.round(totalEngineHours * 10) / 10,
    };
  },

  // Sort services by date
  sortByDate: (services = [], direction = "desc") => {
    return [...services].sort((a, b) => {
      const dateA = new Date(a.service_date);
      const dateB = new Date(b.service_date);

      if (direction === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  },

  // Filter services by date range
  filterByDateRange: (services = [], startDate, endDate) => {
    if (!startDate && !endDate) return services;

    return services.filter((service) => {
      const serviceDate = new Date(service.service_date);

      if (startDate && serviceDate < new Date(startDate)) return false;
      if (endDate && serviceDate > new Date(endDate)) return false;

      return true;
    });
  },

  // Calculate maintenance costs (if cost data is available)
  calculateMaintenanceCosts: (services = []) => {
    const servicesWithCosts = services.filter((s) => s.cost && s.cost > 0);

    if (servicesWithCosts.length === 0) {
      return {
        totalCost: 0,
        averageCost: 0,
        serviceCount: 0,
      };
    }

    const totalCost = servicesWithCosts.reduce(
      (sum, s) => sum + parseFloat(s.cost || 0),
      0
    );
    const averageCost = totalCost / servicesWithCosts.length;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      averageCost: Math.round(averageCost * 100) / 100,
      serviceCount: servicesWithCosts.length,
    };
  },
};
