// API Configuration for Customer Site
// This file handles all backend API communication

// API Configuration
const API_CONFIG = {
  // Update this URL based on your deployment
  BASE_URL:
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "https://fioriforrent.com/api",

  ENDPOINTS: {
    SUBMIT_QUERY: "/customer/query",
    COMPANY_INFO: "/customer/company-info",
    HEALTH: "/customer/health",
  },

  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
};

// API Helper Class
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: this.timeout,
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      console.log(`🔄 API Request: ${requestOptions.method} ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ API Response:", data);

      return data;
    } catch (error) {
      console.error("❌ API Error:", error);

      if (error.name === "AbortError") {
        throw new Error("Request timeout - please check your connection");
      }

      throw error;
    }
  }

  // Submit customer query
  async submitQuery(queryData) {
    try {
      console.log(queryData);
      const response = await this.request(API_CONFIG.ENDPOINTS.SUBMIT_QUERY, {
        method: "POST",
        body: JSON.stringify(queryData),
      });

      return response;
    } catch (error) {
      console.error("Error submitting query:", error);
      throw new Error("Failed to submit query. Please try again.");
    }
  }

  // Get company information
  async getCompanyInfo() {
    try {
      const response = await this.request(API_CONFIG.ENDPOINTS.COMPANY_INFO);
      return response;
    } catch (error) {
      console.error("Error fetching company info:", error);
      return null; // Don't throw error for company info
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.request(API_CONFIG.ENDPOINTS.HEALTH);
      return response.success;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const isHealthy = await this.healthCheck();

      if (isHealthy) {
        console.log("✅ API connection successful");
        return true;
      } else {
        console.warn("⚠️ API health check failed");
        return false;
      }
    } catch (error) {
      console.error("❌ API connection test failed:", error);
      return false;
    }
  }
}

// Create global API service instance
const apiService = new ApiService();

// Form validation utilities
const FormValidator = {
  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate Indian mobile number
  isValidMobile(mobile) {
    const mobileRegex = /^[6-9]\d{9}$/;
    const cleanMobile = mobile.replace(/\D/g, "");
    return mobileRegex.test(cleanMobile);
  },

  // Validate required fields
  isRequired(value) {
    return value && value.trim().length > 0;
  },

  // Validate minimum length
  minLength(value, length) {
    return value && value.trim().length >= length;
  },

  // Validate maximum length
  maxLength(value, length) {
    return value && value.trim().length <= length;
  },
};

// Show loading state
function showLoading(element, message = "Loading...") {
  if (element) {
    element.disabled = true;
    element.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      ${message}
    `;
  }
}

// Hide loading state
function hideLoading(element, originalText) {
  if (element) {
    element.disabled = false;
    element.innerHTML = originalText;
  }
}

// Show success message
function showSuccessMessage(message, container = null) {
  const alertHtml = `
    <div class="alert alert-success alert-dismissible fade show" role="alert">
      <i class="fas fa-check-circle me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  if (container) {
    container.innerHTML = alertHtml;
  } else {
    // Show in a modal or default location
    console.log("Success:", message);
  }
}

// Show error message
function showErrorMessage(message, container = null) {
  const alertHtml = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="fas fa-exclamation-circle me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  if (container) {
    container.innerHTML = alertHtml;
  } else {
    // Show in a modal or default location
    console.error("Error:", message);
  }
}

// Initialize API connection on page load
document.addEventListener("DOMContentLoaded", function () {
  // Test API connection when page loads
  apiService.testConnection().then((isConnected) => {
    if (!isConnected) {
      console.warn("⚠️ Backend API may not be available");
    }
  });
});
