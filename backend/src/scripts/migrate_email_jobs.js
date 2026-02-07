const { executeQuery } = require('../config/database');

async function migrate() {
  try {
    console.log("Starting migration: Add entity tracking columns to email_jobs...");

    // Check if columns exist
    const columns = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'email_jobs' AND COLUMN_NAME = 'entity_id'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log("Columns already exist. Skipping.");
      process.exit(0);
    }

    // Add columns
    await executeQuery(`
      ALTER TABLE email_jobs 
      ADD COLUMN entity_id INT NULL AFTER type,
      ADD COLUMN entity_type VARCHAR(50) NULL AFTER entity_id,
      ADD INDEX idx_entity (entity_id, entity_type)
    `);

    console.log("Migration successful: Added entity_id and entity_type to email_jobs.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
      process.exit(0);
  }
}

migrate();
