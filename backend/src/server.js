const { app, initializeApp } = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// Import services for cleanup
const EmailSchedulerService = require("./services/schedulerService");
const { closePool } = require("./config/database");

// Server instance
let server = null;

// Start server function
const startServer = async () => {
  try {
    console.log("🚀 Starting Concrete Mixer Rental API Server...");
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`📍 Target: http://${HOST}:${PORT}`);
    console.log("");

    // Initialize application (database, email, etc.)
    await initializeApp();

    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      console.log("");
      console.log("🌟 " + "=".repeat(50));
      console.log("🚀 CONCRETE MIXER RENTAL API SERVER STARTED");
      console.log("🌟 " + "=".repeat(50));
      console.log(`📍 Server Address: http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📅 Started At: ${new Date().toLocaleString()}`);
      console.log(`🔧 Node Version: ${process.version}`);
      console.log(`💾 Platform: ${process.platform} (${process.arch})`);
      console.log(
        `📊 Memory Usage: ${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )} MB`
      );
      console.log("");
      console.log("📡 API Endpoints:");
      console.log(`   🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`   📖 Documentation: http://${HOST}:${PORT}/api/docs`);
      console.log(`   👤 Customer API: http://${HOST}:${PORT}/api/customer`);
      console.log(`   🔐 Admin API: http://${HOST}:${PORT}/api/admin`);
      console.log("");
      console.log("🎯 Key Features Available:");
      console.log("   ✅ Customer Query System");
      console.log("   ✅ Admin Authentication");
      console.log("   ✅ Machine Management");
      console.log("   ✅ Quotation Generator with PDF");
      console.log("   ✅ Document Expiry Tracking");
      console.log("   ✅ Service Records Management");
      console.log("   ✅ Email Notification System");
      console.log("   ✅ Business Analytics Dashboard");
      console.log("   ✅ Export Capabilities (Excel/PDF)");
      console.log("");
      console.log("🌟 " + "=".repeat(50));
      console.log("✅ SERVER IS READY TO ACCEPT CONNECTIONS!");
      console.log("🌟 " + "=".repeat(50));
      console.log("");

      // Log additional info for development
      if (NODE_ENV === "development") {
        console.log("🔧 Development Mode Features:");
        console.log("   📝 Detailed error messages enabled");
        console.log("   🔍 Request logging enabled");
        console.log("   🐛 Debug mode enabled");
        console.log("");
      }

      // Log production warnings
      if (NODE_ENV === "production") {
        console.log("🛡️ Production Mode Active:");
        console.log("   🔒 Security headers enabled");
        console.log("   ⚡ Performance optimizations active");
        console.log("   📊 Error reporting enabled");
        console.log("");
      }
    });

    // Set server timeout (30 seconds)
    server.timeout = 30000;

    // Set keep-alive timeout
    server.keepAliveTimeout = 65000;

    // Set headers timeout
    server.headersTimeout = 66000;

    // Handle server errors
    server.on("error", (error) => {
      console.error("\n❌ " + "=".repeat(30));
      console.error("❌ SERVER ERROR OCCURRED");
      console.error("❌ " + "=".repeat(30));

      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error(
          "💡 Suggestion: Try a different port or kill the process using this port"
        );
        console.error(`💡 Command: lsof -ti:${PORT} | xargs kill -9`);
      } else if (error.code === "EACCES") {
        console.error(`❌ Permission denied to bind to port ${PORT}`);
        console.error(
          "💡 Suggestion: Use a port above 1024 or run with sudo (not recommended)"
        );
      } else if (error.code === "ENOTFOUND") {
        console.error(`❌ Host ${HOST} not found`);
        console.error("💡 Suggestion: Check your HOST environment variable");
      } else {
        console.error("❌ Unexpected server error:", error.message);
        console.error("📊 Error Code:", error.code);
        console.error("📋 Stack Trace:", error.stack);
      }

      console.error("❌ " + "=".repeat(30));
      process.exit(1);
    });

    // Handle server warnings
    server.on("clientError", (error, socket) => {
      console.warn("⚠️ Client error:", error.message);
      if (!socket.destroyed) {
        socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      }
    });

    // Monitor server connections
    let connections = 0;
    server.on("connection", (socket) => {
      connections++;
      if (NODE_ENV === "development") {
        console.log(`🔗 New connection established (Total: ${connections})`);
      }

      socket.on("close", () => {
        connections--;
        if (NODE_ENV === "development") {
          console.log(`🔗 Connection closed (Total: ${connections})`);
        }
      });
    });

    // Log memory usage periodically in development
    if (NODE_ENV === "development") {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);

        if (memUsed > 100) {
          // Log if memory usage > 100MB
          console.log(
            `📊 Memory: ${memUsed}MB / ${memTotal}MB (Connections: ${connections})`
          );
        }
      }, 60000); // Every minute
    }
  } catch (error) {
    console.error("\n❌ " + "=".repeat(40));
    console.error("❌ FAILED TO START SERVER");
    console.error("❌ " + "=".repeat(40));
    console.error("📋 Error Details:", error.message);
    console.error("📊 Error Code:", error.code);
    console.error("📋 Stack Trace:", error.stack);
    console.error("❌ " + "=".repeat(40));
    process.exit(1);
  }
};

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(
    `\n🛑 Received ${signal} signal, initiating graceful shutdown...`
  );
  console.log("🛑 " + "=".repeat(40));

  if (!server) {
    console.log("⚠️ Server not running, exiting immediately");
    process.exit(0);
  }

  // Set a timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    console.error("❌ Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    console.log("📧 Stopping email scheduler...");
    try {
      await EmailSchedulerService.stopScheduler();
      console.log("✅ Email scheduler stopped");
    } catch (error) {
      console.warn("⚠️ Error stopping email scheduler:", error.message);
    }

    console.log("🗄️ Closing database connections...");
    try {
      await closePool();
      console.log("✅ Database connections closed");
    } catch (error) {
      console.warn("⚠️ Error closing database connections:", error.message);
    }

    console.log("🌐 Closing HTTP server...");
    server.close((error) => {
      clearTimeout(forceShutdownTimer);

      if (error) {
        console.error("❌ Error during server shutdown:", error);
        process.exit(1);
      }

      console.log("✅ HTTP server closed");
      console.log("🛑 " + "=".repeat(40));
      console.log("✅ GRACEFUL SHUTDOWN COMPLETED");
      console.log("🛑 " + "=".repeat(40));
      process.exit(0);
    });
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("\n💥 " + "=".repeat(40));
  console.error("💥 UNCAUGHT EXCEPTION");
  console.error("💥 " + "=".repeat(40));
  console.error("📋 Error:", error.message);
  console.error("📊 Stack:", error.stack);
  console.error("💥 " + "=".repeat(40));
  console.error("🛑 Server will shut down to prevent corruption");

  // Try graceful shutdown first
  gracefulShutdown("UNCAUGHT_EXCEPTION");

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error("❌ Forced exit due to uncaught exception");
    process.exit(1);
  }, 5000);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n💥 " + "=".repeat(40));
  console.error("💥 UNHANDLED PROMISE REJECTION");
  console.error("💥 " + "=".repeat(40));
  console.error("📋 Reason:", reason);
  console.error("📊 Promise:", promise);
  console.error("💥 " + "=".repeat(40));
  console.error("🛑 Server will shut down to prevent corruption");

  // Try graceful shutdown first
  gracefulShutdown("UNHANDLED_REJECTION");

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error("❌ Forced exit due to unhandled rejection");
    process.exit(1);
  }, 5000);
});

// Handle SIGUSR2 for nodemon restart
process.once("SIGUSR2", () => {
  console.log("\n🔄 Received SIGUSR2 (nodemon restart)");
  gracefulShutdown("SIGUSR2");
});

// Display startup banner
console.log("🚀 " + "=".repeat(60));
console.log("🚀 CONCRETE MIXER RENTAL - BACKEND SERVER");
console.log("🚀 " + "=".repeat(60));
console.log("📅 Startup Time:", new Date().toLocaleString());
console.log("🔧 Node.js Version:", process.version);
console.log("💻 Platform:", `${process.platform} (${process.arch})`);
console.log("📁 Working Directory:", process.cwd());
console.log("🆔 Process ID:", process.pid);
console.log("👤 User:", process.env.USER || process.env.USERNAME || "Unknown");
console.log("🚀 " + "=".repeat(60));

// Start the server
startServer().catch((error) => {
  console.error("❌ Critical startup error:", error);
  process.exit(1);
});

// Export for testing purposes
module.exports = {
  startServer,
  gracefulShutdown,
  getServer: () => server,
};
