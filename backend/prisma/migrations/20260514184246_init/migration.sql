-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('new', 'contacted', 'closed');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'delivered');

-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RC_Book', 'PUC', 'Fitness', 'Insurance');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "last_login" TIMESTAMP(3),
    "reset_token" VARCHAR(255),
    "reset_token_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" SERIAL NOT NULL,
    "machine_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_machines" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priceByDay" DECIMAL(10,2),
    "priceByWeek" DECIMAL(10,2),
    "priceByMonth" DECIMAL(10,2),
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" TEXT,
    "site_location" VARCHAR(255),
    "gst_number" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_queries" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(255),
    "email" VARCHAR(255),
    "site_location" VARCHAR(255),
    "contact_number" VARCHAR(20),
    "duration" VARCHAR(100),
    "work_description" TEXT,
    "status" "QueryStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_counter" (
    "id" INTEGER NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "quotation_number" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_contact" VARCHAR(20),
    "company_name" VARCHAR(255),
    "customer_gst_number" VARCHAR(50),
    "customer_id" INTEGER,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "terms_text" TEXT,
    "additional_notes" TEXT,
    "quotation_status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" SERIAL NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "item_type" VARCHAR(50) NOT NULL DEFAULT 'machine',
    "quotation_machine_id" INTEGER,
    "description" TEXT,
    "duration_type" VARCHAR(50),
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "has_sub_services" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_sub_items" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_sub_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "service_date" DATE NOT NULL,
    "engine_hours" DECIMAL(10,2),
    "site_location" VARCHAR(255),
    "operator" VARCHAR(255),
    "general_notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_record_services" (
    "id" SERIAL NOT NULL,
    "service_record_id" INTEGER NOT NULL,
    "service_category_id" INTEGER NOT NULL,
    "was_performed" BOOLEAN NOT NULL DEFAULT false,
    "service_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_record_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_record_sub_services" (
    "id" SERIAL NOT NULL,
    "service_record_service_id" INTEGER NOT NULL,
    "sub_service_id" INTEGER NOT NULL,
    "was_performed" BOOLEAN NOT NULL DEFAULT false,
    "sub_service_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_record_sub_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_documents" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "expiry_date" DATE NOT NULL,
    "last_renewed_date" DATE,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_notifications" (
    "id" SERIAL NOT NULL,
    "machine_document_id" INTEGER NOT NULL,
    "days_before" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_notification_logs" (
    "id" SERIAL NOT NULL,
    "machine_document_id" INTEGER NOT NULL,
    "days_before" INTEGER,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50),
    "error_message" TEXT,

    CONSTRAINT "document_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_defaults" (
    "id" SERIAL NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "days_before" JSONB NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "data" JSONB,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_for" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "our_company_details" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(255),
    "gst_number" VARCHAR(50),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "phone2" VARCHAR(20),
    "address" TEXT,
    "logo_url" VARCHAR(500),
    "signature_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "our_company_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_conditions" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "machines_machine_number_key" ON "machines"("machine_number");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE UNIQUE INDEX "machine_documents_machine_id_document_type_key" ON "machine_documents"("machine_id", "document_type");

-- CreateIndex
CREATE INDEX "email_jobs_status_scheduled_for_idx" ON "email_jobs"("status", "scheduled_for");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_machine_id_fkey" FOREIGN KEY ("quotation_machine_id") REFERENCES "quotation_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_sub_items" ADD CONSTRAINT "service_sub_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_services" ADD CONSTRAINT "service_record_services_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_services" ADD CONSTRAINT "service_record_services_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_sub_services" ADD CONSTRAINT "service_record_sub_services_service_record_service_id_fkey" FOREIGN KEY ("service_record_service_id") REFERENCES "service_record_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_sub_services" ADD CONSTRAINT "service_record_sub_services_sub_service_id_fkey" FOREIGN KEY ("sub_service_id") REFERENCES "service_sub_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_documents" ADD CONSTRAINT "machine_documents_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_notifications" ADD CONSTRAINT "document_notifications_machine_document_id_fkey" FOREIGN KEY ("machine_document_id") REFERENCES "machine_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_notification_logs" ADD CONSTRAINT "document_notification_logs_machine_document_id_fkey" FOREIGN KEY ("machine_document_id") REFERENCES "machine_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_defaults" ADD CONSTRAINT "notification_defaults_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
