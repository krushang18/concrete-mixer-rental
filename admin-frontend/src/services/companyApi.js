// src/services/companyApi.js
import apiClient from "./api";
import toast from "react-hot-toast";

export class CompanyApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "CompanyApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Company API Service
 * Updated to match actual backend routes
 */
export const companyApi = {
  // Get company details - matches GET /api/admin/company
  getDetails: async () => {
    try {
      const { data } = await apiClient.get("/admin/company");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch company details";
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Update company details - matches PUT /api/admin/company
  updateDetails: async (companyData) => {
    if (!companyData) {
      throw new CompanyApiError("Company data is required");
    }

    try {
      const { data } = await apiClient.put("/admin/company", companyData);
      toast.success(data.message || "Company details updated successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update company details";
      toast.error(errorMsg);
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Initialize company details - matches POST /api/admin/company/initialize
  initializeCompany: async () => {
    try {
      const { data } = await apiClient.post("/admin/company/initialize");
      toast.success(data.message || "Company details initialized successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to initialize company details";
      toast.error(errorMsg);
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get company details with images - matches GET /api/admin/company/with-images
  getDetailsWithImages: async () => {
    try {
      const { data } = await apiClient.get("/admin/company/with-images");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to fetch company details with images";
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Upload company images (logo and/or signature) - matches POST /api/admin/company/upload-images
  uploadImages: async (files) => {
    if (!files || (!files.logo && !files.signature)) {
      throw new CompanyApiError("At least one image file is required");
    }

    try {
      const formData = new FormData();

      if (files.logo) {
        formData.append("logo", files.logo);
      }

      if (files.signature) {
        formData.append("signature", files.signature);
      }

      const { data } = await apiClient.post(
        "/admin/company/upload-images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(data.message || "Images uploaded successfully");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
        warnings: data.warnings,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to upload images";
      toast.error(errorMsg);
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Upload logo only
  uploadLogo: async (logoFile) => {
    return await companyApi.uploadImages({ logo: logoFile });
  },

  // Upload signature only
  uploadSignature: async (signatureFile) => {
    return await companyApi.uploadImages({ signature: signatureFile });
  },

  // Get image status - matches GET /api/admin/company/images/status
  getImageStatus: async () => {
    try {
      const { data } = await apiClient.get("/admin/company/images/status");
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch image status";
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get logo - matches GET /api/admin/company/logo
  getLogoUrl: () => {
    return "/api/admin/company/logo";
  },

  // Get signature - matches GET /api/admin/company/signature
  getSignatureUrl: () => {
    return "/api/admin/company/signature";
  },

  // Get image info - matches GET /api/admin/company/images/:type/info
  getImageInfo: async (type) => {
    if (!["logo", "signature"].includes(type)) {
      throw new CompanyApiError(
        'Invalid image type. Use "logo" or "signature"'
      );
    }

    try {
      const { data } = await apiClient.get(
        `/admin/company/images/${type}/info`
      );
      return {
        success: true,
        data: data.data || null,
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || `Failed to fetch ${type} info`;
      throw new CompanyApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Note: The following methods were in the original file but don't have matching backend routes
  // They are commented out but kept for reference

  /*
  // These endpoints don't exist in the backend routes provided:
  
  deleteLogo: async () => {
    // No matching route found
  },

  deleteSignature: async () => {
    // No matching route found
  },

  getSettings: async () => {
    // No matching route found
  },

  updateSettings: async (settings) => {
    // No matching route found
  },

  getEmailTemplates: async () => {
    // No matching route found
  },

  updateEmailTemplate: async (templateId, templateData) => {
    // No matching route found
  },

  testEmailConfig: async (emailConfig) => {
    // No matching route found
  },

  getBackupSettings: async () => {
    // No matching route found
  },

  updateBackupSettings: async (backupSettings) => {
    // No matching route found
  },

  createBackup: async () => {
    // No matching route found
  },

  getSystemInfo: async () => {
    // No matching route found
  },
  */
};

// Company validation utilities (keeping as-is since they're client-side)
export const companyValidation = {
  // Validate company data
  validateCompanyData: (data) => {
    const errors = [];
    const { company_name, gst_number, email, phone, address } = data;

    // Required fields
    if (!company_name?.trim()) {
      errors.push("Company name is required");
    }
    if (!email?.trim()) {
      errors.push("Email is required");
    }
    if (!phone?.trim()) {
      errors.push("Phone number is required");
    }
    if (!address?.trim()) {
      errors.push("Address is required");
    }

    // Field validations
    if (company_name && company_name.length > 200) {
      errors.push("Company name must be less than 200 characters");
    }
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.push("Valid email address is required");
    }
    if (phone && !/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) {
      errors.push("Phone number must be 10-15 digits");
    }
    if (
      gst_number &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gst_number
      )
    ) {
      errors.push("Invalid GST number format");
    }
    if (address && address.length > 500) {
      errors.push("Address must be less than 500 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate logo file
  validateLogoFile: (file) => {
    const errors = [];

    if (!file) {
      errors.push("Logo file is required");
      return { isValid: false, errors };
    }

    // File type validation
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      errors.push("Logo must be a JPEG, PNG, or GIF image");
    }

    // File size validation (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push("Logo file size must be less than 5MB");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Validate signature file
  validateSignatureFile: (file) => {
    const errors = [];

    if (!file) {
      errors.push("Signature file is required");
      return { isValid: false, errors };
    }

    // File type validation
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      errors.push("Signature must be a JPEG or PNG image");
    }

    // File size validation (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      errors.push("Signature file size must be less than 2MB");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Company utilities (keeping as-is since they're client-side formatting)
export const companyUtils = {
  // Format company info for display
  formatCompanyInfo: (company) => {
    if (!company) return null;

    return {
      ...company,
      formattedPhone: companyUtils.formatPhoneNumber(company.phone),
      formattedPhone2: companyUtils.formatPhoneNumber(company.phone2),
      formattedGST: companyUtils.formatGSTNumber(company.gst_number),
      displayAddress: companyUtils.formatAddress(company.address),
    };
  },

  // Format phone number
  formatPhoneNumber: (phone) => {
    if (!phone) return "";

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, "");

    // Format based on length
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }

    return phone; // Return original if formatting fails
  },

  // Format GST number
  formatGSTNumber: (gst) => {
    if (!gst) return "";

    // GST format: 22AAAAA0000A1Z5
    if (gst.length === 15) {
      return `${gst.slice(0, 2)}-${gst.slice(2, 7)}-${gst.slice(7, 11)}-${gst.slice(11, 12)}-${gst.slice(12, 13)}-${gst.slice(13, 14)}-${gst.slice(14)}`;
    }

    return gst; // Return original if formatting fails
  },

  // Format address for display
  formatAddress: (address) => {
    if (!address) return "";

    // Split by comma and rejoin with line breaks for better display
    return address
      .split(",")
      .map((part) => part.trim())
      .join(",\n");
  },

  // Get logo URL - updated to match backend route
  getLogoUrl: (company) => {
    return "/api/admin/company/logo";
  },

  // Get signature URL - updated to match backend route
  getSignatureUrl: (company) => {
    return "/api/admin/company/signature";
  },

  // Format currency
  formatCurrency: (amount) => {
    if (amount === null || amount === undefined) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  },
};
