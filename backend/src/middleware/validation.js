const { body, validationResult } = require("express-validator");

// Validation rules for customer query
const validateCustomerQuery = [
  body("company_name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\.\-\_\&]+$/)
    .withMessage("Company name contains invalid characters"),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ max: 100 })
    .withMessage("Email address is too long"),

  body("contact_number")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Please provide a valid 10-digit mobile number starting with 6, 7, 8, or 9"
    ),

  body("site_location")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Site location must be between 5 and 500 characters")
    .matches(/^[a-zA-Z0-9\s\,\.\-\_\(\)\#\/]+$/)
    .withMessage("Site location contains invalid characters"),

  body("duration")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Duration is required and must not exceed 100 characters")
    .matches(/^[a-zA-Z0-9\s\,\.\-\_]+$/)
    .withMessage("Duration contains invalid characters"),

  body("work_description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Work description must be between 10 and 1000 characters")
    .matches(/^[a-zA-Z0-9\s\,\.\-\_\(\)\#\/\&\+\*\%]+$/)
    .withMessage("Work description contains invalid characters"),
];

// Validation rules for admin login (Phase 2)
const validateAdminLogin = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9\_\-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscore and hyphen"
    ),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Validation rules for query status update (Phase 2)
const validateStatusUpdate = [
  body("status")
    .isIn(["new", "in_progress", "completed"])
    .withMessage("Status must be one of: new, in_progress, completed"),
];

// Validation rules for company details (Phase 2)
const validateCompanyDetails = [
  body("company_name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("phone")
    .trim()
    .matches(/^[\+]?[0-9\-\s\(\)]+$/)
    .withMessage("Please provide a valid phone number"),

  body("address")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Address must be between 10 and 500 characters"),

  body("gst_number")
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage("Please provide a valid GST number"),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
  }

  next();
};

// Rate limiting validation for sensitive endpoints
const validateRateLimit = (req, res, next) => {
  // Add rate limiting logic here if needed
  // For now, just pass through
  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;

    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[\/\!]*?[^<>]*?>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const sanitized = {};
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === "object") {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Validate file uploads (for Phase 2 - logos, signatures)
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(
            ", "
          )}`,
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
        });
      }
    }

    next();
  };
};

module.exports = {
  validateCustomerQuery,
  validateAdminLogin,
  validateStatusUpdate,
  validateCompanyDetails,
  handleValidationErrors,
  validateRateLimit,
  sanitizeInput,
  validateFileUpload,
};
