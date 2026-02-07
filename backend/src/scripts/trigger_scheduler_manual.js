require('dotenv').config();
const { executeQuery, pool } = require("../config/database");
const schedulerService = require("../services/schedulerService");

async function manualTrigger() {
  console.log("🚀 Manually triggering Document Expiry Scheduler...");
  console.log("   Time:", new Date().toLocaleString());
  
  try {
    // This runs the full logic: Check DB -> Create Jobs -> Process Jobs -> Send Emails
    await schedulerService.processDocumentExpiryJobs();
    console.log("✅ Scheduler cycle completed successfully.");
    console.log("   Check your email inbox and the 'email_jobs' table for status.");
  } catch (error) {
    console.error("❌ Scheduler encountered an error:", error);
  } finally {
    // Allow some time for async operations if any remain
    setTimeout(() => {
        console.log("👋 Exiting...");
        pool.end(); 
        process.exit(0);
    }, 2000);
  }
}

manualTrigger();
