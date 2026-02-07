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



module.exports = {
  validateCustomerQuery,
  handleValidationErrors,
  sanitizeInput,
};
