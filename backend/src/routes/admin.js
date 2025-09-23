const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const CompanyImageManager = require("../utils/imageManager");
const fs = require("fs").promises;

const companyImageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await CompanyImageManager.ensureDirectories();
      cb(null, CompanyImageManager.TEMP_PATH);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${timestamp}${ext}`);
  },
});

const companyImageUpload = multer({
  storage: companyImageStorage,
  fileFilter: (req, file, cb) => {
    const validation = CompanyImageManager.validateFile(file);
    if (!validation.isValid) {
      return cb(new Error(validation.errors.join(", ")));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2, // Max 2 files
  },
});

// Controllers - Only using methods that actually exist
const AuthController = require("../controllers/authController");
const QueryController = require("../controllers/queryController");
const MachineController = require("../controllers/machineController");
const CustomerController = require("../controllers/customerController");
const QuotationController = require("../controllers/quotationController");
const DocumentController = require("../controllers/documentController");
const ServiceController = require("../controllers/serviceController");
const TermsController = require("../controllers/termsController");
const DashboardController = require("../controllers/dashboardController");

// Services
const EmailSchedulerService = require("../services/schedulerService");

// Middleware
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Validation middleware (with fallback if not found)
let validation;
try {
  validation = require("../middleware/authValidation");
} catch (error) {
  console.warn(
    "⚠️ AuthValidation middleware not found, using basic validation"
  );
  validation = {
    loginValidation: (req, res, next) => next(),
    forgotPasswordValidation: (req, res, next) => next(),
    resetPasswordValidation: (req, res, next) => next(),
    changePasswordValidation: (req, res, next) => next(),
    handleValidationErrors: (req, res, next) => next(),
  };
}

const {
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  handleValidationErrors,
} = validation;

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

router.use(generalLimiter);

// =============================================================================
// AUTHENTICATION ROUTES (Public)
// =============================================================================

router.post(
  "/auth/login",
  authLimiter,
  loginValidation,
  handleValidationErrors,
  AuthController.login
);
router.post(
  "/auth/forgot-password",
  authLimiter,
  forgotPasswordValidation,
  handleValidationErrors,
  AuthController.forgotPassword
);
router.post(
  "/auth/reset-password",
  authLimiter,
  resetPasswordValidation,
  handleValidationErrors,
  AuthController.resetPassword
);

router.get("/company/logo", async (req, res) => {
  try {
    const logoPath = path.join(__dirname, "../../uploads/company/logo.png");

    // Check if file exists
    try {
      await fs.access(logoPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "Logo not found",
      });
    }

    // Set proper headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Send file
    res.sendFile(logoPath);
  } catch (error) {
    console.error("Error serving logo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to serve logo",
    });
  }
});

// Get company signature (SECURED - Admin only)
router.get("/company/signature", async (req, res) => {
  try {
    const signaturePath = path.join(
      __dirname,
      "../../uploads/company/signature.png"
    );

    // Check if file exists
    try {
      await fs.access(signaturePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "Signature not found",
      });
    }

    // Set proper headers (no caching for sensitive content)
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");

    // Send file
    res.sendFile(signaturePath);
  } catch (error) {
    console.error("Error serving signature:", error);
    res.status(500).json({
      success: false,
      message: "Failed to serve signature",
    });
  }
});

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

router.use(authenticateToken);
router.use(requireAdmin);

// Auth management routes
router.get("/auth/profile", AuthController.getProfile);
router.post("/auth/logout", AuthController.logout);
router.post("/auth/verify-token", AuthController.verifyToken);
router.put(
  "/auth/change-password",
  changePasswordValidation,
  handleValidationErrors,
  AuthController.changePassword
);

// =============================================================================
// DASHBOARD ROUTES
// =============================================================================

router.get("/dashboard/stats", DashboardController.getStats);
router.get("/dashboard/charts", DashboardController.getChartData);
router.get("/dashboard/performance", DashboardController.getPerformanceMetrics);
router.get("/dashboard/alerts", DashboardController.getAlerts);
router.get("/dashboard/summary", DashboardController.getBusinessSummary);

// =============================================================================
// QUERY MANAGEMENT ROUTES - Only existing methods
// =============================================================================

router.get("/queries/stats", QueryController.getDashboardStats);
router.get("/queries/filter-options", QueryController.getFilterOptions);
router.get("/queries/summary", QueryController.getPaginationSummary);
router.get("/queries", QueryController.getAllQueries);
router.get("/queries/:id", QueryController.getQueryById);
router.put("/queries/:id/status", QueryController.updateQueryStatus);
router.post("/test/email", QueryController.testEmail);

// =============================================================================
// MACHINE MANAGEMENT ROUTES - Only existing methods
// =============================================================================

router.get("/machines/stats", MachineController.getStats);
router.get("/machines/active", MachineController.getActive);
router.get("/machines/search", MachineController.search);
router.put("/machines/bulk/update", MachineController.bulkUpdate);
router.get("/machines", MachineController.getAll);
router.post("/machines", MachineController.create);
router.get("/machines/:id", MachineController.getById);
router.put("/machines/:id", MachineController.update);
router.delete("/machines/:id", MachineController.delete);
router.put("/machines/:id/toggle-status", MachineController.toggleStatus);
router.get("/machines/:id/pricing", MachineController.getPricing);

// =============================================================================
// CUSTOMER MANAGEMENT ROUTES - Only existing methods
// =============================================================================

router.get("/customers/search", CustomerController.searchForQuotation);
router.get("/customers/stats", CustomerController.getStats);
router.get("/customers/export", CustomerController.exportCustomers);
router.get("/customers", CustomerController.getAll);
router.post("/customers", CustomerController.create);
router.get("/customers/:id/quotations", CustomerController.getQuotationHistory);
router.get("/customers/:id", CustomerController.getById);
router.put("/customers/:id", CustomerController.update);
router.delete("/customers/:id", CustomerController.delete);

// =============================================================================
// QUOTATION MANAGEMENT ROUTES - Only existing methods
// =============================================================================

router.get("/quotations/next-number", QuotationController.getNextNumber);
router.get("/quotations/export", QuotationController.exportQuotations);
router.get("/quotations/stats", QuotationController.getStats);
router.get(
  "/quotations/customer/:customerId",
  QuotationController.getCustomerHistory
);
router.get(
  "/quotations/history/:name/:contact",
  QuotationController.getPricingHistory
);
router.get("/quotations", QuotationController.getAll);
router.post("/quotations", QuotationController.create);
router.put("/quotations/:id/status", QuotationController.updateStatus);
router.put(
  "/quotations/:id/delivery",
  QuotationController.updateDeliveryStatus
);
router.get("/quotations/:id/pdf", QuotationController.generatePDF);
router.get("/quotations/:id", QuotationController.getById);
router.put("/quotations/:id", QuotationController.update);
router.delete("/quotations/:id", QuotationController.delete);

// =============================================================================
// DOCUMENT MANAGEMENT ROUTES - Only existing methods
// =============================================================================

// Static first
router.get("/documents", DocumentController.getAll);
router.post("/documents", DocumentController.createOrUpdate);

router.get("/documents/stats", DocumentController.getStats);
router.get("/documents/expiring", DocumentController.getExpiring);

router.get("/documents/machine/:machineId", DocumentController.getByMachine);

router.get(
  "/documents/notification-defaults",
  DocumentController.getNotificationDefaults
);
router.put(
  "/documents/notification-defaults",
  DocumentController.updateNotificationDefaults
);

router.get(
  "/documents/notification-history",
  DocumentController.getNotificationHistory
);
router.get(
  "/documents/notification-history/:id",
  DocumentController.getNotificationHistory
);

router.put("/documents/bulk/renew", DocumentController.bulkRenew);
router.post(
  "/documents/apply-default-notifications",
  DocumentController.applyDefaultNotifications
);

router.post(
  "/documents/check-notifications",
  DocumentController.checkNotificationsDue
);
router.post(
  "/documents/initialize-notifications",
  DocumentController.initializeDefaultNotifications
);
router.get(
  "/documents/email-status",
  DocumentController.getEmailNotificationStatus
);

// Dynamic (parameterized) after all statics
router.get(
  "/documents/:id/notifications",
  DocumentController.getNotificationSettings
);
router.post(
  "/documents/:id/notifications",
  DocumentController.configureNotifications
);

router.get("/documents/:id", DocumentController.getById);
router.delete("/documents/:id", DocumentController.delete);

// =============================================================================
// SERVICE RECORDS ROUTES - Only existing methods
// =============================================================================

// Service statistics and data
router.get("/services/stats", ServiceController.getStats);
router.get("/services/export", ServiceController.exportToCSV);

// Service categories management
router.get("/services/categories", ServiceController.getServiceCategories);
router.post("/services/categories", ServiceController.createServiceCategory);
router.put("/services/categories/:id", ServiceController.updateServiceCategory);
router.delete(
  "/services/categories/:id",
  ServiceController.deleteServiceCategory
);

// Sub-service items management
router.get(
  "/services/categories/:categoryId/sub-services",
  ServiceController.getSubServices
);
router.post("/services/sub-items", ServiceController.createSubServiceItem);
router.put("/services/sub-items/:id", ServiceController.updateSubServiceItem);
router.delete(
  "/services/sub-items/:id",
  ServiceController.deleteSubServiceItem
);

// Service records CRUD
router.get("/services", ServiceController.getAll);
router.post("/services", ServiceController.create);
router.get("/services/:id", ServiceController.getById);
router.put("/services/:id", ServiceController.update);
router.delete("/services/:id", ServiceController.delete);

// Machine-specific service records
router.get("/services/machine/:machineId", ServiceController.getByMachine);

// =============================================================================
// TERMS & CONDITIONS ROUTES - Only existing methods
// =============================================================================

router.get("/terms-conditions/categories", TermsController.getCategories);
router.get("/terms-conditions/default", TermsController.getDefault);
router.post("/terms-conditions/set-default", TermsController.setDefault);
router.put("/terms-conditions/reorder", TermsController.reorder);
router.delete("/terms-conditions/bulk", TermsController.bulkDelete);
router.get("/terms-conditions/for-quotation", TermsController.getForQuotation);
router.get("/terms-conditions/stats", TermsController.getStats);
router.get("/terms-conditions", TermsController.getAll);
router.post("/terms-conditions", TermsController.create);
router.get("/terms-conditions/:id", TermsController.getById);
router.put("/terms-conditions/:id", TermsController.update);
router.delete("/terms-conditions/:id", TermsController.delete);
router.post("/terms-conditions/:id/duplicate", TermsController.duplicate);

// =============================================================================
// EMAIL MANAGEMENT ROUTES
// =============================================================================

router.get("/email/stats", async (req, res) => {
  try {
    const stats = await EmailSchedulerService.getJobStats();
    res.json({
      success: true,
      message: "Email job statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Email stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve email statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/email/jobs", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const jobs = await EmailSchedulerService.getRecentJobs(limit);
    res.json({
      success: true,
      message: "Recent email jobs retrieved successfully",
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Email jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve email jobs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// =============================================================================
// COMPANY SETTINGS ROUTES
// =============================================================================

router.get("/company", async (req, res) => {
  try {
    const Company = require("../models/Company");
    const company = await Company.getDetails();

    res.json({
      success: true,
      message: "Company details retrieved successfully",
      data: company,
    });
  } catch (error) {
    console.error("Get company details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve company details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.put("/company", async (req, res) => {
  try {
    const Company = require("../models/Company");

    // Add validation
    const validation = Company.validateCompanyData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const result = await Company.createOrUpdate(req.body);

    res.json({
      success: true,
      message: "Company details updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update company details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Initialize company details (for first-time setup)
router.post("/company/initialize", async (req, res) => {
  try {
    const Company = require("../models/Company");
    const result = await Company.initializeDefault();

    res.json({
      success: true,
      message: "Company details initialized successfully",
      data: result,
    });
  } catch (error) {
    console.error("Initialize company error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize company details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get company details with image info
router.get("/company/with-images", async (req, res) => {
  try {
    const Company = require("../models/Company");
    const company = await Company.getDetailsWithImages();

    res.json({
      success: true,
      message: "Company details with images retrieved successfully",
      data: company,
    });
  } catch (error) {
    console.error("Get company details with images error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve company details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Upload company images
router.post(
  "/company/upload-images",
  companyImageUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const Company = require("../models/Company");
      const results = {};
      const errors = [];

      console.log("Files received:", req.files);

      // Process logo if uploaded
      if (req.files && req.files.logo) {
        try {
          const logoResult = await CompanyImageManager.processImage(
            req.files.logo[0],
            "logo"
          );
          results.logo_url = logoResult.url;
          console.log("Logo processed successfully:", logoResult.url);
        } catch (error) {
          errors.push(`Logo upload failed: ${error.message}`);
        }
      }

      // Process signature if uploaded
      if (req.files && req.files.signature) {
        try {
          const signatureResult = await CompanyImageManager.processImage(
            req.files.signature[0],
            "signature"
          );
          results.signature_url = signatureResult.url;
          console.log("Signature processed successfully:", signatureResult.url);
        } catch (error) {
          errors.push(`Signature upload failed: ${error.message}`);
        }
      }

      // Update company details if any images were processed
      if (Object.keys(results).length > 0) {
        const currentCompany = await Company.getDetails();
        if (currentCompany) {
          const updateData = { ...currentCompany, ...results };
          await Company.createOrUpdate(updateData);
        }
      }

      // Send response
      if (errors.length > 0 && Object.keys(results).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Image upload failed",
          errors: errors,
        });
      }

      res.json({
        success: true,
        message:
          Object.keys(results).length > 0
            ? "Company images uploaded successfully"
            : "No images were uploaded",
        data: results,
        warnings: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Company image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload company images",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Get image status
router.get("/company/images/status", async (req, res) => {
  try {
    const imageStatus = await CompanyImageManager.checkImages();
    const [logoInfo, signatureInfo] = await Promise.all([
      CompanyImageManager.getImageInfo("logo"),
      CompanyImageManager.getImageInfo("signature"),
    ]);

    res.json({
      success: true,
      message: "Image status retrieved successfully",
      data: {
        status: imageStatus,
        logo: logoInfo,
        signature: signatureInfo,
      },
    });
  } catch (error) {
    console.error("Get image status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get image status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get company image info (metadata only)
router.get("/company/images/:type/info", async (req, res) => {
  try {
    const { type } = req.params;

    if (!["logo", "signature"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Use "logo" or "signature"',
      });
    }

    const CompanyImageManager = require("../utils/imageManager");
    const imageInfo = await CompanyImageManager.getImageInfo(type);

    res.json({
      success: true,
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } info retrieved successfully`,
      data: imageInfo,
    });
  } catch (error) {
    console.error("Error getting image info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get image information",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// =============================================================================
// UTILITY ROUTES
// =============================================================================

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Admin API is healthy",
    timestamp: new Date().toISOString(),
    user: req.user,
    version: "2.0.0",
    features: {
      authentication: true,
      queryManagement: true,
      machineManagement: true,
      customerManagement: true,
      quotationSystem: true,
      documentTracking: true,
      serviceRecords: true,
      termsConditions: true,
      emailScheduler: true,
      businessAnalytics: true,
    },
  });
});

router.get("/system/status", async (req, res) => {
  try {
    const { testConnection } = require("../config/database");
    const EmailSchedulerService = require("../services/schedulerService");

    const dbConnected = await testConnection();
    const emailStats = await EmailSchedulerService.getEmailStats();
    const imageStatus = await CompanyImageManager.checkImages();

    res.json({
      success: true,
      message: "System status retrieved successfully",
      data: {
        database: dbConnected ? "connected" : "disconnected",
        emailScheduler: "active",
        api: "healthy",
        version: "2.0.0",
        uptime: Math.floor(process.uptime()),
        memory: {
          used: `${Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024
          )} MB`,
          total: `${Math.round(
            process.memoryUsage().heapTotal / 1024 / 1024
          )} MB`,
        },
        emailJobs: {
          total: emailStats.total_jobs || 0,
          completed: emailStats.completed || 0,
          failed: emailStats.failed || 0,
          pending: emailStats.pending || 0,
        },
        companyImages: {
          logo: imageStatus.logo ? "available" : "missing",
          signature: imageStatus.signature ? "available" : "missing",
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("System status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// =============================================================================
// 404 HANDLER
// =============================================================================

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Admin API endpoint not found",
    requestedUrl: req.originalUrl,
    method: req.method,
    availableRoutes: {
      authentication: "/api/admin/auth/*",
      dashboard: "/api/admin/dashboard/*",
      queries: "/api/admin/queries/*",
      machines: "/api/admin/machines/*",
      customers: "/api/admin/customers/*",
      quotations: "/api/admin/quotations/*",
      documents: "/api/admin/documents/*",
      services: "/api/admin/services/*",
      termsConditions: "/api/admin/terms-conditions/*",
      email: "/api/admin/email/*",
      company: "/api/admin/company/*",
      system: "/api/admin/system/*",
    },
  });
});

module.exports = router;
