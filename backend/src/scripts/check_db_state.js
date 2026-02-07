const { executeQuery } = require('../config/database');
const Document = require('../models/Document');

async function checkState() {
  try {
    console.log("Checking Database State...");
    
    // Check Documents
    const documents = await executeQuery('SELECT * FROM machine_documents ORDER BY created_at DESC LIMIT 5');
    console.log(`\nFound ${documents.length} Recent Documents:`);
    documents.forEach(d => {
       console.log(`- ID: ${d.id}, Type: ${d.document_type}, Expiry: ${d.expiry_date}, MachineID: ${d.machine_id}`);
    });

    // Check Notifications Rules
    if (documents.length > 0) {
        const docId = documents[0].id;
        const notifications = await Document.getNotificationSettings(docId);
        console.log(`\nNotification Rules for latest document (ID ${docId}):`);
        console.log(notifications);
    }

    // Check Email Jobs
    const jobs = await executeQuery('SELECT * FROM email_jobs ORDER BY created_at DESC LIMIT 5');
    console.log(`\nFound ${jobs.length} Email Jobs:`);
    jobs.forEach(j => {
        console.log(`- ID: ${j.id}, Type: ${j.type}, Status: ${j.status}, CreatedAt: ${j.created_at}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
      process.exit();
  }
}

checkState();
