/**
 * MySQL → PostgreSQL data migration script
 *
 * Usage:
 *   MYSQL_URL="mysql://user:pass@host/concreteMixerRental" \
 *   DATABASE_URL="postgresql://user:pass@host:5432/concreteMixerRental" \
 *   node scripts/mysql-to-postgres.js
 *
 * Run ONCE during production cutover after:
 *   1. PostgreSQL is installed and DB created
 *   2. npx prisma migrate deploy has been run (schema created)
 *   3. MySQL is still running (source)
 */

require("dotenv").config();
const mysql = require("mysql2/promise");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Migration order respects FK dependencies
const TABLES = [
  "users",
  "machines",
  "quotation_machines",
  "customers",
  "customer_queries",
  "service_categories",
  "service_sub_items",
  "quotation_counter",
  "quotations",
  "quotation_items",
  "service_records",
  "service_record_services",
  "service_record_sub_services",
  "machine_documents",
  "document_notifications",
  "document_notification_logs",
  "notification_defaults",
  "email_jobs",
  "our_company_details",
  "terms_conditions",
];

// Maps MySQL column names → Prisma field names for each table
const FIELD_MAPS = {
  users: { last_login: "lastLogin", reset_token: "resetToken", reset_token_expires: "resetTokenExpires", created_at: "createdAt", updated_at: "updatedAt" },
  machines: { machine_number: "machineNumber", created_at: "createdAt", updated_at: "updatedAt" },
  quotation_machines: { gst_percentage: "gstPercentage", created_at: "createdAt", updated_at: "updatedAt" },
  customers: { company_name: "companyName", contact_person: "contactPerson", site_location: "siteLocation", gst_number: "gstNumber", created_at: "createdAt", updated_at: "updatedAt" },
  customer_queries: { company_name: "companyName", site_location: "siteLocation", contact_number: "contactNumber", work_description: "workDescription", created_at: "createdAt", updated_at: "updatedAt" },
  service_categories: { has_sub_services: "hasSubServices", is_active: "isActive", display_order: "displayOrder", created_at: "createdAt", updated_at: "updatedAt" },
  service_sub_items: { category_id: "categoryId", is_active: "isActive", display_order: "displayOrder", created_at: "createdAt", updated_at: "updatedAt" },
  quotation_counter: { current_number: "currentNumber", last_updated: "lastUpdated" },
  quotations: { quotation_number: "quotationNumber", customer_name: "customerName", customer_contact: "customerContact", company_name: "companyName", customer_gst_number: "customerGstNumber", customer_id: "customerId", total_gst_amount: "totalGstAmount", grand_total: "grandTotal", terms_text: "termsText", additional_notes: "additionalNotes", quotation_status: "quotationStatus", delivery_status: "deliveryStatus", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  quotation_items: { quotation_id: "quotationId", item_type: "itemType", quotation_machine_id: "quotationMachineId", duration_type: "durationType", unit_price: "unitPrice", gst_percentage: "gstPercentage", gst_amount: "gstAmount", total_amount: "totalAmount", sort_order: "sortOrder", created_at: "createdAt" },
  service_records: { machine_id: "machineId", service_date: "serviceDate", engine_hours: "engineHours", site_location: "siteLocation", general_notes: "generalNotes", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  service_record_services: { service_record_id: "serviceRecordId", service_category_id: "serviceCategoryId", was_performed: "wasPerformed", service_notes: "serviceNotes", created_at: "createdAt" },
  service_record_sub_services: { service_record_service_id: "serviceRecordServiceId", sub_service_id: "subServiceId", was_performed: "wasPerformed", sub_service_notes: "subServiceNotes", created_at: "createdAt" },
  machine_documents: { machine_id: "machineId", document_type: "documentType", expiry_date: "expiryDate", last_renewed_date: "lastRenewedDate", created_at: "createdAt", updated_at: "updatedAt" },
  document_notifications: { machine_document_id: "machineDocumentId", days_before: "daysBefore", is_active: "isActive", created_at: "createdAt", updated_at: "updatedAt" },
  document_notification_logs: { machine_document_id: "machineDocumentId", days_before: "daysBefore", sent_at: "sentAt", error_message: "errorMessage" },
  notification_defaults: { document_type: "documentType", days_before: "daysBefore", created_by: "createdBy", created_at: "createdAt", updated_at: "updatedAt" },
  email_jobs: { max_attempts: "maxAttempts", scheduled_for: "scheduledFor", processed_at: "processedAt", created_at: "createdAt", updated_at: "updatedAt" },
  our_company_details: { company_name: "companyName", gst_number: "gstNumber", logo_url: "logoUrl", signature_url: "signatureUrl", created_at: "createdAt", updated_at: "updatedAt" },
  terms_conditions: { is_default: "isDefault", display_order: "displayOrder", created_at: "createdAt", updated_at: "updatedAt" },
};

// Fields that are TINYINT(1) booleans in MySQL → must be converted to true/false
const BOOLEAN_FIELDS = {
  service_categories: ["hasSubServices", "isActive"],
  service_sub_items: ["isActive"],
  service_record_services: ["wasPerformed"],
  service_record_sub_services: ["wasPerformed"],
  document_notifications: ["isActive"],
  terms_conditions: ["isDefault"],
};

// Fields that are JSON strings in MySQL → parse them
const JSON_FIELDS = {
  notification_defaults: ["daysBefore"],
  email_jobs: ["data"],
};

// Prisma model names per table
const MODEL_MAP = {
  users: "user", machines: "machine", quotation_machines: "quotationMachine",
  customers: "customer", customer_queries: "customerQuery", quotation_counter: "quotationCounter",
  quotations: "quotation", quotation_items: "quotationItem", service_categories: "serviceCategory",
  service_sub_items: "serviceSubItem", service_records: "serviceRecord",
  service_record_services: "serviceRecordService", service_record_sub_services: "serviceRecordSubService",
  machine_documents: "machineDocument", document_notifications: "documentNotification",
  document_notification_logs: "documentNotificationLog", notification_defaults: "notificationDefault",
  email_jobs: "emailJob", our_company_details: "ourCompanyDetails", terms_conditions: "termsCondition",
};

function transformRow(tableName, row) {
  const fieldMap = FIELD_MAPS[tableName] || {};
  const boolFields = BOOLEAN_FIELDS[tableName] || [];
  const jsonFields = JSON_FIELDS[tableName] || [];

  const result = {};
  for (const [mysqlCol, value] of Object.entries(row)) {
    const prismaField = fieldMap[mysqlCol] || mysqlCol;
    let transformed = value;

    if (boolFields.includes(prismaField)) {
      transformed = value === 1 || value === true;
    } else if (jsonFields.includes(prismaField)) {
      if (typeof value === "string") {
        try { transformed = JSON.parse(value); } catch { transformed = value; }
      } else {
        transformed = value;
      }
    }

    result[prismaField] = transformed;
  }
  return result;
}

async function migrateTable(mysqlConn, tableName) {
  const model = MODEL_MAP[tableName];
  if (!model || !prisma[model]) {
    console.log(`  ⚠️  Skipping ${tableName} — no Prisma model`);
    return;
  }

  const [rows] = await mysqlConn.query(`SELECT * FROM \`${tableName}\``);
  if (rows.length === 0) {
    console.log(`  ⏭️  ${tableName}: 0 rows (skip)`);
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const data = transformRow(tableName, row);
    try {
      await prisma[model].create({ data });
      inserted++;
    } catch (err) {
      if (err.code === "P2002") {
        skipped++;
      } else {
        console.error(`  ❌  ${tableName} row ${row.id} error:`, err.message);
        skipped++;
      }
    }
  }

  console.log(`  ✅  ${tableName}: ${inserted} inserted, ${skipped} skipped`);
}

async function resetSequences(mysqlConn) {
  console.log("\n🔢 Resetting PostgreSQL sequences...");
  const tablesWithId = TABLES.filter((t) => t !== "quotation_counter");

  for (const table of tablesWithId) {
    try {
      await prisma.$queryRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}"`
      );
      console.log(`  ✅  Reset sequence for ${table}`);
    } catch (err) {
      console.log(`  ⚠️  Could not reset sequence for ${table}: ${err.message}`);
    }
  }
}

async function main() {
  const mysqlUrl = process.env.MYSQL_URL;
  if (!mysqlUrl) {
    console.error("❌ MYSQL_URL environment variable required");
    console.error("   Example: MYSQL_URL=mysql://root:@localhost/concreteMixerRental");
    process.exit(1);
  }

  console.log("🚀 Starting MySQL → PostgreSQL migration...\n");

  let mysqlConn;
  try {
    mysqlConn = await mysql.createConnection(mysqlUrl);
    console.log("✅ Connected to MySQL\n");
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err.message);
    process.exit(1);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Connected to PostgreSQL\n");
  } catch (err) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    await mysqlConn.end();
    process.exit(1);
  }

  console.log("📊 Migrating tables in dependency order:\n");

  for (const table of TABLES) {
    process.stdout.write(`→ ${table}... `);
    try {
      await migrateTable(mysqlConn, table);
    } catch (err) {
      console.error(`\n❌ Fatal error on ${table}:`, err.message);
    }
  }

  await resetSequences(mysqlConn);

  await mysqlConn.end();
  await prisma.$disconnect();

  console.log("\n🎉 Migration complete!");
  console.log("⚠️  Verify row counts match between MySQL and PostgreSQL before cutover.");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
