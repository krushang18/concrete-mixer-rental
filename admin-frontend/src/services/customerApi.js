// src/services/customerApi.js
import apiClient from "./api";
import { toast } from "react-hot-toast";

export class CustomerApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "CustomerApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Customer API Service
 * Handles all customer-related API operations
 * Updated to match backend implementation exactly
 */
export const customerApi = {
  // Get all customers with filtering and pagination
  getAll: async (params = {}) => {
    try {
      const { data } = await apiClient.get("/admin/customers", { params });
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || null,
        count: data.pagination?.totalItems || data.count || 0, // Backward compatibility
        totalCount: data.pagination?.totalItems || data.count || 0, // Alternative property name
        filters: data.filters || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch customers";
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Optional: Add a new method specifically for paginated results
  getAllPaginated: async (page = 1, limit = 10, filters = {}) => {
    try {
      const params = {
        page,
        limit,
        ...filters,
      };

      const { data } = await apiClient.get("/admin/customers", { params });
      return {
        success: true,
        customers: data.data || [],
        pagination: data.pagination || {
          currentPage: page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        filters: data.filters || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch customers";
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Search customers for quotation (specific endpoint)
  searchForQuotation: async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new CustomerApiError("Search query is required");
    }

    try {
      const { data } = await apiClient.get("/admin/customers/search", {
        params: { q: searchQuery.trim() },
      });
      return {
        success: true,
        data: data.data || [],
        count: data.count || 0,
        searchQuery: data.searchQuery,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to search customers";
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get customer statistics (matches backend implementation)
  getStats: async () => {
    try {
      const { data } = await apiClient.get("/admin/customers/stats");
      return {
        success: true,
        data: data.data || {
          totalCustomers: 0,
          customersWithGST: 0,
          newToday: 0,
          newThisWeek: 0,
          newThisMonth: 0,
          lastUpdated: new Date().toISOString(),
        },
        message: data.message,
      };
    } catch (error) {
      // If stats endpoint fails, provide fallback data
      console.warn(
        "Customer stats endpoint failed, using fallback:",
        error.message
      );
      return {
        success: true,
        data: {
          totalCustomers: 0,
          customersWithGST: 0,
          newToday: 0,
          newThisWeek: 0,
          newThisMonth: 0,
          lastUpdated: new Date().toISOString(),
        },
        message: "Using fallback statistics data",
      };
    }
  },

  // Export customers to Excel/CSV
  exportToExcel: async (filters = {}) => {
    try {
      const params = {
        ...filters,
        format: "excel",
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const response = await apiClient.get("/admin/customers/export", {
        params,
        responseType: "blob", // Important: This tells axios to expect binary data
      });

      // Get filename from response headers or use default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `customers-export-${new Date().toISOString().split("T")[0]}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      // Create blob and trigger download
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Customers exported successfully",
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to export customers";
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
  // Get customer by ID
  getById: async (id) => {
    if (!id) {
      throw new CustomerApiError("Customer ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/customers/${id}`);
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch customer with ID ${id}`;
      if (error.response?.status !== 404) {
        toast.error(errorMsg);
      }
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Create new customer
  create: async (customerData) => {
    if (!customerData) {
      throw new CustomerApiError("Customer data is required");
    }

    try {
      const { data } = await apiClient.post("/admin/customers", customerData);
      toast.success(data.message || "Customer created successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to create customer";
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update customer
  update: async (id, customerData) => {
    if (!id) {
      throw new CustomerApiError("Customer ID is required");
    }
    if (!customerData) {
      throw new CustomerApiError("Customer data is required");
    }

    try {
      const { data } = await apiClient.put(
        `/admin/customers/${id}`,
        customerData
      );
      toast.success(data.message || "Customer updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to update customer with ID ${id}`;
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Delete customer
  delete: async (id) => {
    if (!id) {
      throw new CustomerApiError("Customer ID is required");
    }

    try {
      const { data } = await apiClient.delete(`/admin/customers/${id}`);
      toast.success(data.message || "Customer deleted successfully");
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to delete customer with ID ${id}`;
      toast.error(errorMsg);
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get customer quotation history
  getQuotations: async (id) => {
    if (!id) {
      throw new CustomerApiError("Customer ID is required");
    }

    try {
      const { data } = await apiClient.get(`/admin/customers/${id}/quotations`);
      console.log("------------------------------------");
      console.log(data);
      console.log("------------------------------------");

      return {
        success: true,
        data: data.data || [],
        count: data.count || 0,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        `Failed to fetch quotations for customer ${id}`;
      throw new CustomerApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Customer validation utilities (matching backend validation)
export const customerValidation = {
  // Validate customer data based on backend requirements
  validateCustomerData: (data, isUpdate = false) => {
    const errors = [];
    const {
      company_name,
      contact_person,
      email,
      phone,
      address,
      site_location,
      gst_number,
    } = data;

    // Required fields for creation (based on backend controller)
    if (!isUpdate) {
      if (!company_name?.trim()) {
        errors.push("Company name is required");
      }
      if (!contact_person?.trim()) {
        errors.push("Contact person is required");
      }
      if (!email?.trim()) {
        errors.push("Email is required");
      }
      if (!phone?.trim()) {
        errors.push("Phone number is required");
      }
      if (!site_location?.trim()) {
        errors.push("Site location is required");
      }
    }

    // Field validations
    if (company_name && company_name.length > 100) {
      errors.push("Company name must be less than 100 characters");
    }
    if (contact_person && contact_person.length > 100) {
      errors.push("Contact person must be less than 100 characters");
    }
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.push("Valid email address is required");
    }
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.push("Phone number must be 10-15 digits");
      }
    }
    if (
      gst_number &&
      gst_number.trim() &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gst_number.toUpperCase()
      )
    ) {
      errors.push("Invalid GST number format");
    }
    if (address && address.length > 500) {
      errors.push("Address must be less than 500 characters");
    }
    if (site_location && site_location.length > 255) {
      errors.push("Site location must be less than 255 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate GST number (optional field)
  validateGSTNumber: (gstNumber) => {
    if (!gstNumber || gstNumber.trim() === "") return true; // GST is optional

    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber.toUpperCase());
  },

  // Validate email
  validateEmail: (email) => {
    if (!email) return false; // Email is required based on backend

    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  },

  // Validate phone number (required field)
  validatePhone: (phone) => {
    if (!phone) return false; // Phone is required

    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  },
};

// Customer formatting utilities
export const customerUtils = {
  // Format customer name for display
  formatCustomerName: (customer) => {
    if (!customer) return "";
    return customer.company_name || "Unknown Company";
  },

  // Format customer contact info
  formatContactInfo: (customer) => {
    if (!customer) return "";

    const parts = [];
    if (customer.contact_person) parts.push(customer.contact_person);
    if (customer.phone) parts.push(customer.phone);
    if (customer.email) parts.push(customer.email);

    return parts.join(" • ");
  },

  // Format customer address
  formatAddress: (customer) => {
    if (!customer) return "";

    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.site_location) parts.push(customer.site_location);

    return parts.join(", ");
  },

  // Get customer initials
  getInitials: (customer) => {
    if (!customer) return "??";

    const name = customer.contact_person || customer.company_name || "";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
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

  // Format phone number for display
  formatPhoneNumber: (phone) => {
    if (!phone) return "";

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  },

  // Format GST number for display
  formatGSTNumber: (gst) => {
    if (!gst) return "";
    return gst.toUpperCase();
  },
};

export default customerApi;
