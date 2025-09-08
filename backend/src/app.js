const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

// Import database and email configs
const { testConnection } = require("./config/database");
const { testEmailConnection } = require("./config/email");

// Import models for initialization
const Company = require("./models/Company");

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
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Concrete Mixer Rental API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/customer", customerRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Concrete Mixer Rental API",
    version: "1.0.0",
    documentation: "/api/docs", // For future API documentation
    endpoints: {
      health: "/health",
      customer: "/api/customer",
      admin: "/api/admin", // For Phase 2
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
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
      error: "Invalid or missing authentication",
    });
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: "Service temporarily unavailable",
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
  });
});

// Initialize application
const initializeApp = async () => {
  try {
    console.log("🚀 Initializing Concrete Mixer Rental API...");

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }

    // Test email configuration
    const emailConfigured = await testEmailConnection();
    if (!emailConfigured) {
      console.warn(
        "⚠️ Email configuration failed - continuing without email features"
      );
    }

    // Initialize default company data
    try {
      await Company.initializeDefault();
      console.log("✅ Company data initialized");
    } catch (error) {
      console.warn("⚠️ Could not initialize company data:", error.message);
    }

    console.log("✅ Application initialized successfully");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("\n🛑 Received shutdown signal, closing server gracefully...");

  // Close database connections, clear intervals, etc.
  process.exit(0);
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = { app, initializeApp };
