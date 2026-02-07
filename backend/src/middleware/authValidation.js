const { body } = require("express-validator");

// Login validation
const loginValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];



// Change password validation
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6, max: 255 })
    .withMessage("New password must be between 6 and 255 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmNewPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("New password confirmation does not match new password");
    }
    return true;
  }),
];

// Forgot password validation
const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// Reset password validation
const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("newPassword")
    .isLength({ min: 6, max: 255 })
    .withMessage("New password must be between 6 and 255 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmNewPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
];



// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }

  next();
};

// Custom validation functions
const customValidations = {
  // Strong password validation
  isStrongPassword: (password) => {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      throw new Error("Password must contain at least one uppercase letter");
    }

    if (!hasLowerCase) {
      throw new Error("Password must contain at least one lowercase letter");
    }

    if (!hasNumbers) {
      throw new Error("Password must contain at least one number");
    }

    return true;
  },
};



module.exports = {
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  handleValidationErrors,
  customValidations,
};
