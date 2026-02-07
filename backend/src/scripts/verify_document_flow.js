const { executeQuery, pool } = require("../config/database");
const Document = require("../models/Document");
const schedulerService = require("../services/schedulerService");

async function verifyFlow() {
  console.log("🚀 Starting Verification Flow...");
  const testMachineNumber = "TEST-MACH-999";
  
  try {
    // 1. Create Test Machine
    console.log("1. Creating test machine...");
    await executeQuery("DELETE FROM machines WHERE machine_number = ?", [testMachineNumber]);
    const machineRes = await executeQuery(
      "INSERT INTO machines (machine_number, name) VALUES (?, 'Test Machine')",
      [testMachineNumber]
    );
    const machineId = machineRes.insertId;
    console.log(`   ✅ Created machine ID: ${machineId}`);

    // 2. Create Test Document
    console.log("2. Creating test document expiring in 7 days...");
    const docRes = await executeQuery(
      "INSERT INTO machine_documents (machine_id, document_type, expiry_date) VALUES (?, 'RC_Book', DATE_ADD(CURDATE(), INTERVAL 7 DAY))",
      [machineId]
    );
    const docId = docRes.insertId;
    console.log(`   ✅ Created document ID: ${docId}`);

    // 3. Create Notification Setting
    console.log("3. Creating notification setting for 7 days before...");
    await executeQuery(
      "INSERT INTO document_notifications (machine_document_id, days_before, is_active) VALUES (?, 7, 1)",
      [docId]
    );
    console.log("   ✅ Notification setting created.");

    // 4. Check Notifications Due (simulate scheduler step 1)
    console.log("4. Checking notifications due (Document.checkNotificationsDue)...");
    const notifications = await Document.checkNotificationsDue();
    
    const found = notifications.find(n => n.document_id === docId);
    if (found) {
        console.log("   ✅ Found expected notification:", found);
    } else {
        console.error("   ❌ Expected notification NOT found! Check DB state.");
        // Debugging
        const debugDoc = await executeQuery("SELECT * FROM machine_documents WHERE id=?", [docId]);
        console.log("Debug Doc:", debugDoc[0]);
        const debugNotif = await executeQuery("SELECT * FROM document_notifications WHERE machine_document_id=?", [docId]);
        console.log("Debug Notif:", debugNotif[0]);
        return;
    }

    // 5. Verify email job creation (simulate scheduler step 1 part 2)
    console.log("5. Queueing email job...");
    await schedulerService.addDocumentExpiryJob(found);
    
    const jobs = await executeQuery(
        "SELECT * FROM email_jobs WHERE type='document_expiry' ORDER BY id DESC LIMIT 1"
    );
    
    const jobData = typeof jobs[0].data === 'string' ? JSON.parse(jobs[0].data) : jobs[0].data;
    
    if (jobs.length > 0 && jobData.document_id === docId) {
        console.log(`   ✅ Email job created successfully. Job ID: ${jobs[0].id}`);
    } else {
        console.error("   ❌ Email job creation failed.");
    }

    // Cleanup
    console.log("6. Cleaning up test data...");
    await executeQuery("DELETE FROM machines WHERE id = ?", [machineId]);
    console.log("   ✅ Cleanup complete.");

  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    pool.end();
  }
}

verifyFlow();
