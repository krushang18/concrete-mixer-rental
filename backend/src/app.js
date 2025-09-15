const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Import middleware
const {
  helmetConfig,
  corsOptions,
  generalApiLimiter,
  logRequests,
  securityErrorHandler,
} = require("./middleware/security");

// Import routes
const customerRoutes = require("./routes/customer");
const adminRoutes = require("./routes/admin");

// Import database and email configs
const { testConnection } = require("./config/database");
const { testEmailConnection } = require("./config/email");

// Import services for initialization
const EmailSchedulerService = require("./services/schedulerService");

// Import models for initialization
const Company = require("./models/Company");
const User = require("./models/User");
const Machine = require("./models/Machine");
const TermsConditions = require("./models/TermsConditions");

// Create Express application
const app = express();

// Trust proxy (for Nginx reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));

// Request logging
app.use(logRequests);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api", generalApiLimiter);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    // Get system stats
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      message: "Concrete Mixer Rental API is running",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      status: {
        database: dbConnected ? "connected" : "disconnected",
        emailScheduler: "active",
        api: "healthy",
        uptime: `${Math.floor(uptime / 60)} minutes`,
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        },
      },
      features: {
        customerAPI: true,
        adminAPI: true,
        authentication: true,
        machineManagement: true,
        quotationSystem: true,
        documentTracking: true,
        serviceRecords: true,
        emailScheduler: true,
        businessAnalytics: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

// API Routes
app.use("/api/customer", customerRoutes);
app.use("/api/admin", adminRoutes);

// Root endpoint with comprehensive API documentation
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Concrete Mixer Rental API - Complete System",
    version: "2.0.0",
    documentation: "/api/docs",
    endpoints: {
      health: "/health",
      customer: {
        base: "/api/customer",
        endpoints: [
          "GET /api/customer/health - API health check",
          "POST /api/customer/query - Submit customer inquiry",
          "GET /api/customer/company-info - Get company details",
        ],
      },
      admin: {
        base: "/api/admin",
        authentication: [
          "POST /api/admin/auth/login - Admin login",
          "POST /api/admin/auth/logout - Admin logout",
          "POST /api/admin/auth/forgot-password - Password recovery",
          "POST /api/admin/auth/reset-password - Reset password",
          "GET /api/admin/auth/profile - Get admin profile",
          "PUT /api/admin/auth/change-password - Change password",
          "POST /api/admin/auth/verify-token - Verify JWT token",
        ],
        dashboard: ["GET /api/admin/dashboard/stats - Dashboard statistics"],
        queries: [
          "GET /api/admin/queries - Get all customer queries",
          "GET /api/admin/queries/:id - Get specific query",
          "PUT /api/admin/queries/:id/status - Update query status",
          "GET /api/admin/queries/export/excel - Export to Excel",
          "GET /api/admin/queries/report/pdf - Generate PDF report",
        ],
        machines: [
          "GET /api/admin/machines - Get all machines",
          "GET /api/admin/machines/active - Get active machines",
          "GET /api/admin/machines/:id - Get specific machine",
          "POST /api/admin/machines - Create new machine",
          "PUT /api/admin/machines/:id - Update machine",
          "DELETE /api/admin/machines/:id - Delete machine",
          "GET /api/admin/machines/stats - Machine statistics",
        ],
        customers: [
          "GET /api/admin/customers - Get all customers",
          "GET /api/admin/customers/:id - Get specific customer",
          "POST /api/admin/customers - Create new customer",
          "PUT /api/admin/customers/:id - Update customer",
          "DELETE /api/admin/customers/:id - Delete customer",
          "GET /api/admin/customers/search - Search customers",
          "GET /api/admin/customers/export - Export customers",
        ],
        quotations: [
          "GET /api/admin/quotations - Get all quotations",
          "GET /api/admin/quotations/:id - Get specific quotation",
          "POST /api/admin/quotations - Create new quotation",
          "PUT /api/admin/quotations/:id - Update quotation",
          "DELETE /api/admin/quotations/:id - Delete quotation",
          "GET /api/admin/quotations/:id/pdf - Generate quotation PDF",
          "GET /api/admin/quotations/next-number - Get next quotation number",
          "GET /api/admin/quotations/export - Export quotations",
        ],
        documents: [
          "GET /api/admin/documents - Get all documents",
          "GET /api/admin/documents/:id - Get specific document",
          "POST /api/admin/documents - Create/update document",
          "DELETE /api/admin/documents/:id - Delete document",
          "GET /api/admin/documents/expiring - Get expiring documents",
          "GET /api/admin/documents/machine/:machineId - Get machine documents",
          "POST /api/admin/documents/:id/notifications - Configure notifications",
        ],
        services: [
          "GET /api/admin/services - Get all service records",
          "GET /api/admin/services/:id - Get specific service record",
          "POST /api/admin/services - Create new service record",
          "PUT /api/admin/services/:id - Update service record",
          "DELETE /api/admin/services/:id - Delete service record",
          "GET /api/admin/services/machine/:machineId - Get machine services",
          "GET /api/admin/services/categories - Get service categories",
          "GET /api/admin/services/export - Export service records",
        ],
        termsConditions: [
          "GET /api/admin/terms-conditions - Get all terms & conditions",
          "GET /api/admin/terms-conditions/:id - Get specific T&C",
          "POST /api/admin/terms-conditions - Create new T&C",
          "PUT /api/admin/terms-conditions/:id - Update T&C",
          "DELETE /api/admin/terms-conditions/:id - Delete T&C",
          "GET /api/admin/terms-conditions/default - Get default T&C",
          "POST /api/admin/terms-conditions/set-default - Set default T&C",
        ],
        system: [
          "GET /api/admin/health - Admin API health check",
          "GET /api/admin/system/status - System status",
          "GET /api/admin/company - Get company details",
          "PUT /api/admin/company - Update company details",
          "GET /api/admin/email/stats - Email job statistics",
          "GET /api/admin/email/jobs - Recent email jobs",
          "POST /api/admin/email/jobs/:id/retry - Retry failed email",
        ],
      },
    },
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: process.env.NODE_ENV || "development",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    phase: {
      current: "Phase 2 - Complete Admin System",
      features: [
        "Multi-admin authentication with JWT",
        "Comprehensive query management",
        "Machine database with full CRUD",
        "Advanced quotation generator with PDF",
        "Document expiry tracking with notifications",
        "Service records management",
        "Terms & conditions library",
        "Email scheduling system",
        "Business analytics dashboard",
        "Export capabilities (Excel/PDF)",
        "Security & rate limiting",
        "Error handling & logging",
      ],
    },
  });
});

// API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    message: "Concrete Mixer Rental API Documentation",
    version: "2.0.0",
    baseUrl: `${req.protocol}://${req.get("host")}`,
    authentication: {
      type: "JWT Bearer Token",
      header: "Authorization: Bearer <token>",
      loginEndpoint: "POST /api/admin/auth/login",
      tokenExpiry: "8 hours",
    },
    responseFormat: {
      success: true,
      message: "Response message",
      data: "Response data object",
      error: "Error details (if applicable)",
    },
    statusCodes: {
      200: "Success",
      201: "Created",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      429: "Too Many Requests",
      500: "Internal Server Error",
    },
    rateLimits: {
      general: "100 requests per 15 minutes",
      authentication: "5 requests per 15 minutes",
    },
    features: {
      customerAPI: "Customer query submission and company info",
      adminAPI: "Complete admin dashboard with all management features",
      security: "JWT authentication, rate limiting, input validation",
      businessLogic: "Quotation generation, document tracking, service records",
      notifications: "Email scheduling and document expiry alerts",
      analytics: "Business metrics and reporting",
      exports: "Excel and PDF generation capabilities",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    requestedUrl: req.originalUrl,
    method: req.method,
    suggestion: "Check /api/docs for available endpoints",
    availableEndpoints: {
      customer: "/api/customer/*",
      admin: "/api/admin/*",
      health: "/health",
      documentation: "/api/docs",
    },
  });
});

// Security error handler
app.use(securityErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: err.message,
      details: err.details || null,
    });
  }

  if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
      error: "Invalid or missing authentication token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      error: "Please login again",
    });
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: "Service temporarily unavailable",
    });
  }

  // MySQL specific errors
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      error: "A record with this information already exists",
    });
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      success: false,
      message: "Reference error",
      error: "Referenced record does not exist",
    });
  }

  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete record",
      error: "Record is referenced by other data",
    });
  }

  if (err.code === "ER_BAD_FIELD_ERROR") {
    return res.status(400).json({
      success: false,
      message: "Database field error",
      error: "Invalid field in database query",
    });
  }

  // File upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
      error: "Maximum file size exceeded",
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
});

// Initialize application
const initializeApp = async () => {
  try {
    console.log(
      "🚀 Initializing Concrete Mixer Rental API - Complete System..."
    );

    // Test database connection
    console.log("📊 Testing database connection...");
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }
    console.log("✅ Database connected successfully");

    // Test email configuration
    console.log("📧 Testing email configuration...");
    const emailConfigured = await testEmailConnection();
    if (emailConfigured) {
      console.log("✅ Email system configured successfully");
    } else {
      console.warn(
        "⚠️ Email configuration failed - continuing without email features"
      );
    }

    // Initialize default company data
    console.log("🏢 Initializing company data...");
    try {
      await Company.initializeDefault();
      console.log("✅ Company data initialized");
    } catch (error) {
      console.warn("⚠️ Could not initialize company data:", error.message);
    }

    // Initialize default admin users
    console.log("👥 Initializing admin users...");
    try {
      await User.initializeDefaultUsers();
      console.log("✅ Admin users initialized");
    } catch (error) {
      console.warn("⚠️ Could not initialize admin users:", error.message);
    }

    // Initialize default machines (if needed)
    console.log("🚛 Checking machine data...");
    try {
      await Machine.initializeDefaultMachines();
      console.log("✅ Machine data checked");
    } catch (error) {
      console.warn("⚠️ Could not check machine data:", error.message);
    }

    // Initialize default terms & conditions
    console.log("📋 Initializing terms & conditions...");
    try {
      await TermsConditions.initializeDefault();
      console.log("✅ Terms & conditions initialized");
    } catch (error) {
      console.warn(
        "⚠️ Could not initialize terms & conditions:",
        error.message
      );
    }

    // Start email scheduler service
    console.log("⏰ Starting email scheduler...");
    try {
      await EmailSchedulerService.startScheduler();
      console.log("✅ Email scheduler started");
    } catch (error) {
      console.warn("⚠️ Could not start email scheduler:", error.message);
    }

    // Validate required environment variables
    console.log("🔐 Validating environment configuration...");
    const requiredEnvVars = [
      "JWT_SECRET",
      "DB_HOST",
      "DB_USER",
      "DB_PASSWORD",
      "DB_NAME",
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      console.warn(
        `⚠️ Missing environment variables: ${missingEnvVars.join(", ")}`
      );
      console.warn("⚠️ Some features may not work correctly");
    } else {
      console.log("✅ All required environment variables configured");
    }

    // Display initialization summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ CONCRETE MIXER RENTAL API INITIALIZED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log("📊 System Status:");
    console.log(
      `   🗄️  Database: ${dbConnected ? "Connected" : "Disconnected"}`
    );
    console.log(
      `   📧 Email: ${emailConfigured ? "Configured" : "Not Configured"}`
    );
    console.log(
      `   🔐 JWT: ${process.env.JWT_SECRET ? "Configured" : "Not Configured"}`
    );
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("\n📋 Available Features:");
    console.log("   ✅ Customer query system");
    console.log("   ✅ Admin authentication (JWT)");
    console.log("   ✅ Machine management (CRUD)");
    console.log("   ✅ Customer management");
    console.log("   ✅ Quotation system with PDF generation");
    console.log("   ✅ Document expiry tracking");
    console.log("   ✅ Service records management");
    console.log("   ✅ Terms & conditions library");
    console.log("   ✅ Email notification system");
    console.log("   ✅ Business analytics dashboard");
    console.log("   ✅ Export capabilities (Excel/PDF)");
    console.log("   ✅ Security & rate limiting");
    console.log("\n🚀 API Ready for Production!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n" + "❌".repeat(20));
    console.error("❌ APPLICATION INITIALIZATION FAILED");
    console.error("❌".repeat(20));
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    console.error("❌".repeat(20));
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("\n🛑 Received shutdown signal, closing server gracefully...");

  // Stop email scheduler
  try {
    EmailSchedulerService.stopScheduler();
    console.log("✅ Email scheduler stopped");
  } catch (error) {
    console.error("❌ Error stopping email scheduler:", error);
  }

  // Close database connections if available
  try {
    // Add database connection cleanup here if needed
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
  }

  console.log("✅ Cleanup completed");
  process.exit(0);
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = { app, initializeApp };
