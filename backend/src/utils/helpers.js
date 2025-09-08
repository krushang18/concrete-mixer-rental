const crypto = require("crypto");

// Date formatting utilities
const formatDate = (date, format = "YYYY-MM-DD") => {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  const formats = {
    "YYYY-MM-DD": `${year}-${month}-${day}`,
    "DD-MM-YYYY": `${day}-${month}-${year}`,
    "YYYY-MM-DD HH:mm:ss": `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    "DD/MM/YYYY": `${day}/${month}/${year}`,
    "MM/DD/YYYY": `${month}/${day}/${year}`,
    readable: d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  return formats[format] || formats["YYYY-MM-DD"];
};

// Phone number formatting
const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Indian mobile number format
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91-${digits.substring(0, 5)}-${digits.substring(5)}`;
  }

  // Indian landline with STD code
  if (digits.length > 10) {
    return `+91-${digits}`;
  }

  return phone;
};

// Generate unique reference numbers
const generateReference = (prefix = "REF", length = 6) => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random()
    .toString(36)
    .substring(2, length - 2)
    .toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

// Validate Indian GST number
const validateGSTNumber = (gst) => {
  if (!gst) return false;

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
};

// Validate Indian mobile number
const validateMobileNumber = (mobile) => {
  if (!mobile) return false;

  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 && /^[6-9]/.test(digits);
};

// Clean and normalize text input
const cleanText = (text) => {
  if (!text || typeof text !== "string") return "";

  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\.\,\-\(\)]/g, "");
};

// Generate secure random string
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Format currency (Indian Rupees)
const formatCurrency = (amount, currency = "INR") => {
  if (!amount && amount !== 0) return "₹0";

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

// Slugify text for URLs
const slugify = (text) => {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Paginate array
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < array.length,
      hasPrevPage: page > 1,
    },
  };
};

// Mask sensitive data
const maskEmail = (email) => {
  if (!email) return "";

  const [username, domain] = email.split("@");
  if (!username || !domain) return email;

  const maskedUsername =
    username.length > 2
      ? username.substring(0, 2) + "*".repeat(username.length - 2)
      : username;

  return `${maskedUsername}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.substring(0, 2)}****${digits.substring(6)}`;
  }

  return phone;
};

// Validate email format
const validateEmail = (email) => {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate OTP
const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
};

// Time utilities
const timeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};

// File size formatter
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Response helpers
const successResponse = (data, message = "Success") => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

const errorResponse = (message = "Error", error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (error && process.env.NODE_ENV === "development") {
    response.error = error;
  }

  return response;
};

// Database helpers
const buildWhereClause = (filters) => {
  const conditions = [];
  const params = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== "") {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  return {
    clause: conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "",
    params,
  };
};

// Log helpers
const logInfo = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[INFO] [${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
};

const logError = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] [${timestamp}] ${message}`, error);
};

const logWarning = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.warn(
    `[WARNING] [${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
};

// Export all helper functions
module.exports = {
  formatDate,
  formatPhoneNumber,
  generateReference,
  validateGSTNumber,
  validateMobileNumber,
  cleanText,
  generateSecureToken,
  calculateDistance,
  formatCurrency,
  slugify,
  paginate,
  maskEmail,
  maskPhone,
  validateEmail,
  generateOTP,
  timeAgo,
  formatFileSize,
  successResponse,
  errorResponse,
  buildWhereClause,
  logInfo,
  logError,
  logWarning,
};
