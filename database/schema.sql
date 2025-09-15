-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: concretemixerrental
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `customer_queries`
--

DROP TABLE IF EXISTS `customer_queries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_queries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `site_location` text NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `duration` varchar(100) NOT NULL,
  `work_description` text NOT NULL,
  `status` enum('new','in_progress','completed') DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_queries_status` (`status`),
  KEY `idx_customer_queries_created` (`created_at`),
  KEY `idx_customer_queries_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_queries`
--

LOCK TABLES `customer_queries` WRITE;
/*!40000 ALTER TABLE `customer_queries` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_queries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `customer_quotation_summary`
--

DROP TABLE IF EXISTS `customer_quotation_summary`;
/*!50001 DROP VIEW IF EXISTS `customer_quotation_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `customer_quotation_summary` AS SELECT 
 1 AS `customer_name`,
 1 AS `customer_contact`,
 1 AS `company_name`,
 1 AS `total_quotations`,
 1 AS `avg_quotation_amount`,
 1 AS `total_quoted_amount`,
 1 AS `last_quotation_date`,
 1 AS `accepted_quotations`,
 1 AS `machines_quoted`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text,
  `site_location` text,
  `gst_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_company_name` (`company_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_notification_logs`
--

DROP TABLE IF EXISTS `document_notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_notification_logs` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_notification_logs`
--

LOCK TABLES `document_notification_logs` WRITE;
/*!40000 ALTER TABLE `document_notification_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_notification_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_notifications`
--

DROP TABLE IF EXISTS `document_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_notifications` (
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_notifications`
--

LOCK TABLES `document_notifications` WRITE;
/*!40000 ALTER TABLE `document_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_jobs`
--

DROP TABLE IF EXISTS `email_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_jobs` (
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

--
-- Dumping data for table `email_jobs`
--

LOCK TABLES `email_jobs` WRITE;
/*!40000 ALTER TABLE `email_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_documents`
--

DROP TABLE IF EXISTS `machine_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_documents` (
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_documents`
--

LOCK TABLES `machine_documents` WRITE;
/*!40000 ALTER TABLE `machine_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `machine_service_history`
--

DROP TABLE IF EXISTS `machine_service_history`;
/*!50001 DROP VIEW IF EXISTS `machine_service_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `machine_service_history` AS SELECT 
 1 AS `machine_number`,
 1 AS `machine_name`,
 1 AS `service_date`,
 1 AS `engine_hours`,
 1 AS `site_location`,
 1 AS `operator`,
 1 AS `general_notes`,
 1 AS `services_performed`,
 1 AS `recorded_by`,
 1 AS `service_record_id`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `machine_number` varchar(50) NOT NULL COMMENT 'Unique identifier number for each machine (e.g., CMR-001, MX-101)',
  `description` text,
  `priceByDay` decimal(10,2) NOT NULL DEFAULT '0.00',
  `priceByWeek` decimal(10,2) NOT NULL DEFAULT '0.00',
  `priceByMonth` decimal(10,2) NOT NULL DEFAULT '0.00',
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '18.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `machine_number` (`machine_number`),
  UNIQUE KEY `machine_number_2` (`machine_number`),
  KEY `idx_machines_is_active` (`is_active`),
  KEY `idx_machines_name` (`name`),
  KEY `idx_machines_pricing` (`priceByDay`,`priceByWeek`,`priceByMonth`),
  KEY `idx_machines_machine_number` (`machine_number`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machines`
--

LOCK TABLES `machines` WRITE;
/*!40000 ALTER TABLE `machines` DISABLE KEYS */;
INSERT INTO `machines` VALUES (1,'Fiori DB 350 Self Loading Mixer','','Self-loading concrete mixer with 3.5 cubic meter capacity',2500.00,15000.00,45000.00,18.00,1,'2025-09-06 19:47:49','2025-09-12 18:17:27'),(2,'Concrete Mixer 5 Cubic Meter','CMR-001','High capacity concrete mixer for large construction projects',2500.00,15000.00,50000.00,18.00,1,'2025-09-10 15:14:26','2025-09-10 15:14:26'),(3,'Concrete Mixer 3 Cubic Meter','CMR-002','Medium capacity concrete mixer for residential projects',2000.00,12000.00,40000.00,18.00,1,'2025-09-10 15:14:26','2025-09-12 18:16:20'),(4,'Concrete Mixer 7 Cubic Meter','CMR-003','Heavy duty concrete mixer for commercial construction',3000.00,18000.00,60000.00,18.00,1,'2025-09-10 15:14:26','2025-09-10 15:14:26');
/*!40000 ALTER TABLE `machines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `machines_expiring_documents`
--

DROP TABLE IF EXISTS `machines_expiring_documents`;
/*!50001 DROP VIEW IF EXISTS `machines_expiring_documents`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `machines_expiring_documents` AS SELECT 
 1 AS `machine_name`,
 1 AS `document_type`,
 1 AS `expiry_date`,
 1 AS `days_until_expiry`,
 1 AS `status`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `notification_defaults`
--

DROP TABLE IF EXISTS `notification_defaults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_defaults` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` enum('RC_Book','PUC','Fitness','Insurance','ALL') NOT NULL DEFAULT 'ALL',
  `days_before` json NOT NULL COMMENT 'Array of notification days [14,7,3,1]',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_document_type` (`document_type`),
  KEY `fk_notification_defaults_user` (`created_by`),
  CONSTRAINT `fk_notification_defaults_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_defaults`
--

LOCK TABLES `notification_defaults` WRITE;
/*!40000 ALTER TABLE `notification_defaults` DISABLE KEYS */;
INSERT INTO `notification_defaults` VALUES (1,'ALL','[14, 7, 3, 1]',1,NULL,'2025-09-11 16:01:47','2025-09-11 16:01:47'),(2,'RC_Book','[30, 14, 7, 3, 1]',1,7,'2025-09-11 16:01:47','2025-09-13 13:05:37'),(3,'PUC','[14, 7, 3, 1]',1,NULL,'2025-09-11 16:01:47','2025-09-11 16:01:47'),(4,'Fitness','[21, 14, 7, 3]',1,NULL,'2025-09-11 16:01:47','2025-09-11 16:01:47'),(5,'Insurance','[30, 14, 7]',1,NULL,'2025-09-11 16:01:47','2025-09-11 16:01:47');
/*!40000 ALTER TABLE `notification_defaults` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `our_company_details`
--

DROP TABLE IF EXISTS `our_company_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `our_company_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `gst_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `phone2` varchar(20) DEFAULT NULL,
  `address` text NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `signature_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `our_company_details`
--

LOCK TABLES `our_company_details` WRITE;
/*!40000 ALTER TABLE `our_company_details` DISABLE KEYS */;
INSERT INTO `our_company_details` VALUES (2,'M/S Ochhavlal Chhotalal Shah','24AAAFO2654G1ZK','ocsfiori@gmail.com','+91-9913737777','+91-9898020677','E-706, Radhe infinity, Raksha Shakti Circle Kudasan, Gandhinagar, Gujarat - 382426','/uploads/company/logo.png','/uploads/company/signature.png','2025-09-14 07:18:30','2025-09-14 08:54:43');
/*!40000 ALTER TABLE `our_company_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_counter`
--

DROP TABLE IF EXISTS `quotation_counter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_counter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_number` int NOT NULL DEFAULT '0',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_counter`
--

LOCK TABLES `quotation_counter` WRITE;
/*!40000 ALTER TABLE `quotation_counter` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_counter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `quotation_history`
--

DROP TABLE IF EXISTS `quotation_history`;
/*!50001 DROP VIEW IF EXISTS `quotation_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `quotation_history` AS SELECT 
 1 AS `id`,
 1 AS `quotation_number`,
 1 AS `customer_name`,
 1 AS `customer_contact`,
 1 AS `company_name`,
 1 AS `grand_total`,
 1 AS `quotation_status`,
 1 AS `delivery_status`,
 1 AS `created_at`,
 1 AS `created_by_user`,
 1 AS `days_ago`,
 1 AS `total_items`,
 1 AS `machines`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `item_type` enum('machine','additional_charge') NOT NULL,
  `machine_id` int DEFAULT NULL COMMENT 'Only for machine items',
  `description` varchar(500) NOT NULL,
  `duration_type` varchar(50) DEFAULT NULL COMMENT 'day/week/month for machines, One-time for additional charges',
  `quantity` decimal(8,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(10,2) NOT NULL,
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '18.00',
  `gst_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quotation_items_quotation_id` (`quotation_id`),
  KEY `idx_quotation_items_machine_id` (`machine_id`),
  KEY `idx_quotation_items_type` (`item_type`),
  KEY `idx_quotation_items_calculations` (`quotation_id`,`total_amount`),
  KEY `idx_quotation_items_machine_lookup` (`machine_id`,`item_type`),
  CONSTRAINT `fk_quotation_items_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_quotation_items_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(20) NOT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_contact` varchar(20) NOT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_gst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `terms_conditions` json DEFAULT NULL COMMENT '{"default_term_ids": [1,2,3], "custom_terms": ["Custom term 1", "Custom term 2"]}',
  `additional_notes` text,
  `quotation_status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  `delivery_status` enum('pending','delivered','completed','cancelled') DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_quotation_number` (`quotation_number`),
  KEY `idx_customer_search` (`customer_name`,`customer_contact`,`company_name`),
  KEY `idx_quotation_status` (`quotation_status`),
  KEY `idx_quotation_customer_id` (`customer_id`),
  KEY `idx_quotation_created_by` (`created_by`),
  KEY `idx_quotations_customer_search` (`customer_name`,`customer_contact`),
  KEY `idx_quotations_company_search` (`company_name`),
  KEY `idx_quotations_date_range` (`created_at`,`quotation_status`),
  CONSTRAINT `fk_quotations_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `recent_queries_summary`
--

DROP TABLE IF EXISTS `recent_queries_summary`;
/*!50001 DROP VIEW IF EXISTS `recent_queries_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `recent_queries_summary` AS SELECT 
 1 AS `id`,
 1 AS `company_name`,
 1 AS `email`,
 1 AS `contact_number`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `days_ago`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `service_categories`
--

DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `has_sub_services` tinyint(1) DEFAULT '0' COMMENT 'Whether this category has sub-services',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_service_category_name` (`name`),
  KEY `idx_service_categories_active` (`is_active`),
  KEY `idx_service_categories_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (8,'Kelosker Service','Complete Kelosker engine maintenance and filter services',1,1,1,'2025-09-13 21:03:04','2025-09-13 21:03:04');
/*!40000 ALTER TABLE `service_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_record_services`
--

DROP TABLE IF EXISTS `service_record_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_record_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_record_id` int NOT NULL,
  `service_category_id` int NOT NULL,
  `was_performed` tinyint(1) DEFAULT '1' COMMENT 'Whether this service category was performed',
  `service_notes` text COMMENT 'Notes specific to this service category',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_record_services_record_id` (`service_record_id`),
  KEY `idx_record_services_category_id` (`service_category_id`),
  CONSTRAINT `fk_record_services_category` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_record_services_record` FOREIGN KEY (`service_record_id`) REFERENCES `service_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_record_services`
--

LOCK TABLES `service_record_services` WRITE;
/*!40000 ALTER TABLE `service_record_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_record_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_record_sub_services`
--

DROP TABLE IF EXISTS `service_record_sub_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_record_sub_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_record_service_id` int NOT NULL,
  `sub_service_id` int NOT NULL,
  `was_performed` tinyint(1) DEFAULT '1' COMMENT 'Whether this sub-service was performed (checkbox state)',
  `sub_service_notes` text COMMENT 'Notes specific to this sub-service',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_record_sub_services_record_service_id` (`service_record_service_id`),
  KEY `idx_record_sub_services_sub_service_id` (`sub_service_id`),
  CONSTRAINT `fk_record_sub_services_record_service` FOREIGN KEY (`service_record_service_id`) REFERENCES `service_record_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_record_sub_services_sub_service` FOREIGN KEY (`sub_service_id`) REFERENCES `service_sub_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_record_sub_services`
--

LOCK TABLES `service_record_sub_services` WRITE;
/*!40000 ALTER TABLE `service_record_sub_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_record_sub_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_records`
--

DROP TABLE IF EXISTS `service_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `service_date` date NOT NULL,
  `engine_hours` decimal(10,2) DEFAULT NULL,
  `site_location` varchar(255) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `general_notes` text COMMENT 'General notes for the entire service session',
  `created_by` int DEFAULT NULL COMMENT 'User who created the record',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_machine_id` (`machine_id`),
  KEY `idx_service_date` (`service_date`),
  KEY `idx_service_created_by` (`created_by`),
  CONSTRAINT `fk_service_records_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_records_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_records`
--

LOCK TABLES `service_records` WRITE;
/*!40000 ALTER TABLE `service_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_sub_items`
--

DROP TABLE IF EXISTS `service_sub_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_sub_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_items_category` (`category_id`),
  KEY `idx_sub_items_active` (`is_active`),
  KEY `idx_sub_items_order` (`display_order`),
  CONSTRAINT `fk_sub_items_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_sub_items`
--

LOCK TABLES `service_sub_items` WRITE;
/*!40000 ALTER TABLE `service_sub_items` DISABLE KEYS */;
INSERT INTO `service_sub_items` VALUES (30,8,'Oil Filter Change','Replace engine oil filter for optimal lubrication',1,1,'2025-09-13 21:03:24','2025-09-13 21:06:05'),(31,8,'Diesel Filter Change','Replace diesel fuel filter for clean fuel supply',1,2,'2025-09-13 21:03:35','2025-09-13 21:06:05'),(32,8,'Diesel Sensor Filter Change','Replace diesel sensor filter for accurate fuel monitoring',1,3,'2025-09-13 21:03:42','2025-09-13 21:06:05');
/*!40000 ALTER TABLE `service_sub_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `terms_conditions`
--

DROP TABLE IF EXISTS `terms_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terms_conditions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_display_order` (`display_order`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terms_conditions`
--

LOCK TABLES `terms_conditions` WRITE;
/*!40000 ALTER TABLE `terms_conditions` DISABLE KEYS */;
INSERT INTO `terms_conditions` VALUES (1,'Payment Terms','Payment should be made within 30 days of invoice date. Late payment may incur additional charges.','Payment',1,1,'2025-09-06 19:19:57','2025-09-14 06:42:12'),(2,'Delivery Terms','Equipment will be delivered to the specified site location. Customer is responsible for site accessibility.','Delivery',0,2,'2025-09-06 19:19:57','2025-09-14 06:42:12'),(3,'Maintenance Terms','Regular maintenance and servicing will be provided as per schedule. Emergency repairs available 24/7.','Maintenance',1,3,'2025-09-06 19:19:57','2025-09-14 06:42:12'),(4,'Insurance Terms','Equipment is covered under comprehensive insurance. Customer liable for damages due to misuse.','Insurance',0,4,'2025-09-06 19:19:57','2025-09-14 06:41:49'),(5,'Operating Terms','Equipment should be operated by trained personnel only. Operating manual will be provided.','Operation',1,5,'2025-09-06 19:19:57','2025-09-14 06:41:49');
/*!40000 ALTER TABLE `terms_conditions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_reset_token` (`reset_token`),
  KEY `idx_users_last_login` (`last_login`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (7,'Krushang','$2b$12$2S6iLvGyFlMuj/rY78E4N.bcbtYKvI8x6lyjDYJ5mCeMupiNdsslO','krushangshah18@gmail.com','2025-09-14 05:41:42',NULL,NULL,'2025-09-12 14:00:40','2025-09-14 05:41:42'),(8,'Ajay','$2b$12$fNKV7z9aEmLDdH5WxVxN/eFbKEo0xyat8trJnCVRI04m0PLFJq9Mm','talodman@yahoo.com',NULL,NULL,NULL,'2025-09-12 14:00:40','2025-09-12 14:00:40'),(9,'Mayur','$2b$12$GqYZhq3/st7skcdp9F.us.WO9z1rzX7V5xJ0kOEmjiFXG0CxmJ1IO','ocsfiori@gmail.com',NULL,NULL,NULL,'2025-09-12 14:00:41','2025-09-12 14:00:41'),(10,'Yashraj','$2b$12$NVKp.KMshjF0w5Y61veX/.C5/OVkWp4hq0tAvghprpWxv64I/tA8.','ypchauhan47@gmail.com',NULL,NULL,NULL,'2025-09-12 14:00:41','2025-09-12 14:00:41'),(11,'Vairanya','$2b$12$A1DCgdJ8JIiI.aLUzTuZcuL9Xr5aEuVoqpRaQ.53CcK4gIOef6aoW','vairanya_shah@yahoo.co.in',NULL,NULL,NULL,'2025-09-12 14:00:41','2025-09-12 14:00:41');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `customer_quotation_summary`
--

/*!50001 DROP VIEW IF EXISTS `customer_quotation_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `customer_quotation_summary` AS select `q`.`customer_name` AS `customer_name`,`q`.`customer_contact` AS `customer_contact`,`q`.`company_name` AS `company_name`,count(0) AS `total_quotations`,avg(`q`.`grand_total`) AS `avg_quotation_amount`,sum(`q`.`grand_total`) AS `total_quoted_amount`,max(`q`.`created_at`) AS `last_quotation_date`,count((case when (`q`.`quotation_status` = 'accepted') then 1 end)) AS `accepted_quotations`,group_concat(distinct `m`.`name` separator ', ') AS `machines_quoted` from ((`quotations` `q` left join `quotation_items` `qi` on((`q`.`id` = `qi`.`quotation_id`))) left join `machines` `m` on((`qi`.`machine_id` = `m`.`id`))) group by `q`.`customer_name`,`q`.`customer_contact`,`q`.`company_name` order by `last_quotation_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `machine_service_history`
--

/*!50001 DROP VIEW IF EXISTS `machine_service_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `machine_service_history` AS select `m`.`machine_number` AS `machine_number`,`m`.`name` AS `machine_name`,`sr`.`service_date` AS `service_date`,`sr`.`engine_hours` AS `engine_hours`,`sr`.`site_location` AS `site_location`,`sr`.`operator` AS `operator`,`sr`.`general_notes` AS `general_notes`,group_concat(distinct `sc`.`name` separator ', ') AS `services_performed`,`u`.`username` AS `recorded_by`,`sr`.`id` AS `service_record_id` from ((((`machines` `m` join `service_records` `sr` on((`m`.`id` = `sr`.`machine_id`))) left join `service_record_services` `srs` on((`sr`.`id` = `srs`.`service_record_id`))) left join `service_categories` `sc` on((`srs`.`service_category_id` = `sc`.`id`))) left join `users` `u` on((`sr`.`created_by` = `u`.`id`))) group by `sr`.`id` order by `sr`.`service_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `machines_expiring_documents`
--

/*!50001 DROP VIEW IF EXISTS `machines_expiring_documents`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `machines_expiring_documents` AS select `m`.`name` AS `machine_name`,`md`.`document_type` AS `document_type`,`md`.`expiry_date` AS `expiry_date`,(to_days(`md`.`expiry_date`) - to_days(curdate())) AS `days_until_expiry`,(case when ((to_days(`md`.`expiry_date`) - to_days(curdate())) <= 0) then 'EXPIRED' when ((to_days(`md`.`expiry_date`) - to_days(curdate())) <= 3) then 'CRITICAL' when ((to_days(`md`.`expiry_date`) - to_days(curdate())) <= 7) then 'WARNING' when ((to_days(`md`.`expiry_date`) - to_days(curdate())) <= 14) then 'NOTICE' else 'OK' end) AS `status` from (`machines` `m` join `machine_documents` `md` on((`m`.`id` = `md`.`machine_id`))) where (`m`.`is_active` = 1) order by `md`.`expiry_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `quotation_history`
--

/*!50001 DROP VIEW IF EXISTS `quotation_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `quotation_history` AS select `q`.`id` AS `id`,`q`.`quotation_number` AS `quotation_number`,`q`.`customer_name` AS `customer_name`,`q`.`customer_contact` AS `customer_contact`,`q`.`company_name` AS `company_name`,`q`.`grand_total` AS `grand_total`,`q`.`quotation_status` AS `quotation_status`,`q`.`delivery_status` AS `delivery_status`,`q`.`created_at` AS `created_at`,`u`.`username` AS `created_by_user`,(to_days(curdate()) - to_days(cast(`q`.`created_at` as date))) AS `days_ago`,count(`qi`.`id`) AS `total_items`,group_concat(distinct `m`.`name` separator ', ') AS `machines` from (((`quotations` `q` left join `users` `u` on((`q`.`created_by` = `u`.`id`))) left join `quotation_items` `qi` on((`q`.`id` = `qi`.`quotation_id`))) left join `machines` `m` on((`qi`.`machine_id` = `m`.`id`))) group by `q`.`id` order by `q`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `recent_queries_summary`
--

/*!50001 DROP VIEW IF EXISTS `recent_queries_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `recent_queries_summary` AS select `customer_queries`.`id` AS `id`,`customer_queries`.`company_name` AS `company_name`,`customer_queries`.`email` AS `email`,`customer_queries`.`contact_number` AS `contact_number`,`customer_queries`.`status` AS `status`,`customer_queries`.`created_at` AS `created_at`,(to_days(curdate()) - to_days(cast(`customer_queries`.`created_at` as date))) AS `days_ago` from `customer_queries` where (`customer_queries`.`created_at` >= (curdate() - interval 30 day)) order by `customer_queries`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-14 15:16:27
