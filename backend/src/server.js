const { app, initializeApp } = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Start server
const startServer = async () => {
  try {
    // Initialize application (database, email, etc.)
    await initializeApp();

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log("🌟 ================================");
      console.log("🚀 Concrete Mixer Rental API Server");
      console.log("🌟 ================================");
      console.log(`📍 Server running on: http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📅 Started at: ${new Date().toLocaleString()}`);
      console.log("🌟 ================================");
      console.log("");
      console.log("📡 Available endpoints:");
      console.log(`   Health Check: http://${HOST}:${PORT}/health`);
      console.log(`   Customer API: http://${HOST}:${PORT}/api/customer`);
      console.log(`   Submit Query: http://${HOST}:${PORT}/api/customer/query`);
      console.log("");
      console.log("✅ Server is ready to accept connections!");
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log("\n🛑 Shutting down server gracefully...");

      server.close((error) => {
        if (error) {
          console.error("❌ Error during server shutdown:", error);
          process.exit(1);
        }

        console.log("✅ Server closed successfully");
        process.exit(0);
      });
    };

    // Handle shutdown signals
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
