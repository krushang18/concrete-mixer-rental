const express = require("express");
const router = express.Router();

// Import controllers
const QueryController = require("../controllers/queryController");
const Company = require("../models/Company");

// Import middleware
const {
  validateCustomerQuery,
  handleValidationErrors,
  sanitizeInput,
} = require("../middleware/validation");
const {
  customerQueryLimiter,
  validateRequest,
} = require("../middleware/security");

// Apply security middleware to all customer routes
router.use(validateRequest);
router.use(sanitizeInput);

// Route: Submit customer query
// POST /api/customer/query
router.post(
  "/query",
  customerQueryLimiter,
  validateCustomerQuery,
  handleValidationErrors,
  QueryController.submitQuery
);

// Route: Get company information
// GET /api/customer/company-info
router.get("/company-info", async (req, res) => {
  try {
    const companyDetails = await Company.getDetails();

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: "Company information not found",
      });
    }

    // Return only public information (no internal details)
    const publicInfo = {
      company_name: companyDetails.company_name,
      email: companyDetails.email,
      phone: companyDetails.phone,
      address: companyDetails.address,
      logo_url: companyDetails.logo_url,
    };

    res.json({
      success: true,
      message: "Company information retrieved successfully",
      data: publicInfo,
    });
  } catch (error) {
    console.error("Error fetching company info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve company information",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Route: Health check for customer API
// GET /api/customer/health
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Customer API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});



// Error handling middleware for customer routes
router.use((err, req, res, next) => {
  console.error("Customer route error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error in customer API",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = router;
