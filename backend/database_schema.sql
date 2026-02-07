-- Database Schema for Document Management System

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;

-- 1. Table: machine_documents
CREATE TABLE IF NOT EXISTS `machine_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `document_type` enum('RC_Book','PUC','Fitness','Insurance') NOT NULL,
  `expiry_date` date NOT NULL,
  `last_renewed_date` date DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_machine_document` (`machine_id`,`document_type`),
  KEY `idx_expiry_date` (`expiry_date`),
  CONSTRAINT `fk_machine_documents_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Table: document_notifications
-- Stores custom notification settings (e.g., notify 30 days before, 7 days before)
CREATE TABLE IF NOT EXISTS `document_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_document_id` int NOT NULL,
  `days_before` int NOT NULL COMMENT 'Days before expiry to send notification',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_days_before` (`days_before`),
  KEY `fk_document_notifications_document` (`machine_document_id`),
  CONSTRAINT `fk_document_notifications_document` FOREIGN KEY (`machine_document_id`) REFERENCES `machine_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Table: document_notification_logs
-- Logs triggered notifications to prevent duplicates
CREATE TABLE IF NOT EXISTS `document_notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_document_id` int NOT NULL,
  `days_before` int NOT NULL,
  `notification_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_notification_log` (`machine_document_id`,`days_before`,`notification_date`),
  KEY `idx_notification_date` (`notification_date`),
  CONSTRAINT `fk_notification_logs_document` FOREIGN KEY (`machine_document_id`) REFERENCES `machine_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Table: email_jobs
-- Queue for sending emails
CREATE TABLE IF NOT EXISTS `email_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL COMMENT 'customer_query, document_expiry, service_reminder',
  `data` json NOT NULL COMMENT 'Email content and recipient data',
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `attempts` int DEFAULT '0',
  `max_attempts` int DEFAULT '3',
  `error` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  `scheduled_for` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_scheduled` (`status`,`scheduled_for`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_email_jobs_scheduled` (`scheduled_for`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*!40101 SET character_set_client = @saved_cs_client */;
