CREATE DATABASE IF NOT EXISTS `concreteMixerRental` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

USE `concreteMixerRental`;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  KEY `idx_customer_queries_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `priceByDay` decimal(10,2) NOT NULL DEFAULT '0.00',
  `priceByWeek` decimal(10,2) NOT NULL DEFAULT '0.00',
  `priceByMonth` decimal(10,2) NOT NULL DEFAULT '0.00',
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '18.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_machines_is_active` (`is_active`),
  KEY `idx_machines_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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


CREATE TABLE `service_description_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_description` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `service_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `service_date` date NOT NULL,
  `engine_hours` decimal(10,2) DEFAULT NULL,
  `site_location` varchar(255) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `created_by` int DEFAULT NULL COMMENT 'User who created the record',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_machine_id` (`machine_id`),
  KEY `idx_service_date` (`service_date`),
  KEY `idx_service_created_by` (`created_by`),
  CONSTRAINT `fk_service_records_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_records_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `service_record_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_record_id` int NOT NULL,
  `description_item_id` int NOT NULL,
  `custom_description` text COMMENT 'Additional details specific to this service',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_record_id` (`service_record_id`),
  KEY `idx_description_item_id` (`description_item_id`),
  CONSTRAINT `fk_service_details_record` FOREIGN KEY (`service_record_id`) REFERENCES `service_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_details_item` FOREIGN KEY (`description_item_id`) REFERENCES `service_description_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `our_company_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `gst_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `signature_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


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
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


INSERT INTO `terms_conditions` (`title`, `description`, `category`, `is_default`, `display_order`) VALUES
('Payment Terms', 'Payment should be made within 30 days of invoice date. Late payment may incur additional charges.', 'Payment', 1, 1),
('Delivery Terms', 'Equipment will be delivered to the specified site location. Customer is responsible for site accessibility.', 'Delivery', 1, 2),
('Maintenance Terms', 'Regular maintenance and servicing will be provided as per schedule. Emergency repairs available 24/7.', 'Maintenance', 1, 3),
('Insurance Terms', 'Equipment is covered under comprehensive insurance. Customer liable for damages due to misuse.', 'Insurance', 1, 4),
('Operating Terms', 'Equipment should be operated by trained personnel only. Operating manual will be provided.', 'Operation', 1, 5);

INSERT INTO `service_description_items` (`description`) VALUES
('Engine Oil Change'),
('Hydraulic Fluid Check'),
('Belt Inspection and Replacement'),
('Brake System Check'),
('Tire Inspection'),
('General Maintenance Check'),
('Emergency Repair'),
('Preventive Maintenance');


CREATE VIEW `machines_expiring_documents` AS
SELECT 
    m.name AS machine_name,
    md.document_type,
    md.expiry_date,
    DATEDIFF(md.expiry_date, CURDATE()) AS days_until_expiry,
    CASE 
        WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
        WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 3 THEN 'CRITICAL'
        WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 7 THEN 'WARNING'
        WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 14 THEN 'NOTICE'
        ELSE 'OK'
    END AS status
FROM machines m
JOIN machine_documents md ON m.id = md.machine_id
WHERE m.is_active = 1
ORDER BY md.expiry_date ASC;


CREATE VIEW `recent_queries_summary` AS
SELECT 
    id,
    company_name,
    email,
    contact_number,
    status,
    created_at,
    DATEDIFF(CURDATE(), DATE(created_at)) AS days_ago
FROM customer_queries
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY created_at DESC;


CREATE VIEW `machine_service_history` AS
SELECT 
    m.name AS machine_name,
    sr.service_date,
    sr.engine_hours,
    sr.site_location,
    sr.operator,
    GROUP_CONCAT(sdi.description SEPARATOR ', ') AS services_performed,
    u.username AS recorded_by
FROM machines m
JOIN service_records sr ON m.id = sr.machine_id
LEFT JOIN service_record_details srd ON sr.id = srd.service_record_id
LEFT JOIN service_description_items sdi ON srd.description_item_id = sdi.id
LEFT JOIN users u ON sr.created_by = u.id
GROUP BY sr.id
ORDER BY sr.service_date DESC;


DELIMITER //
CREATE PROCEDURE CheckExpiringDocuments(IN days_ahead INT)
BEGIN
    SELECT 
        m.name AS machine_name,
        md.document_type,
        md.expiry_date,
        DATEDIFF(md.expiry_date, CURDATE()) AS days_until_expiry
    FROM machines m
    JOIN machine_documents md ON m.id = md.machine_id
    WHERE m.is_active = 1 
    AND md.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL days_ahead DAY)
    ORDER BY md.expiry_date ASC;
END //
DELIMITER ;


CREATE INDEX idx_machines_pricing ON machines(priceByDay, priceByWeek, priceByMonth);
CREATE INDEX idx_email_jobs_scheduled ON email_jobs(scheduled_for, status);
CREATE INDEX idx_customer_queries_email ON customer_queries(email);
CREATE INDEX idx_service_records_composite ON service_records(machine_id, service_date);


DELIMITER //
CREATE TRIGGER check_machine_status
AFTER UPDATE ON machine_documents
FOR EACH ROW
BEGIN
    DECLARE expired_count INT;
    
    SELECT COUNT(*) INTO expired_count
    FROM machine_documents
    WHERE machine_id = NEW.machine_id 
    AND expiry_date < CURDATE();
    
    -- If any critical documents are expired, consider deactivating
    -- This is a business logic decision - adjust as needed
    IF expired_count > 0 THEN
        -- Could add logic here to flag machines with expired documents
        -- For now, just log it in email_jobs for admin notification
        INSERT INTO email_jobs (type, data, status)
        VALUES ('document_expired', 
                JSON_OBJECT('machine_id', NEW.machine_id, 'document_type', NEW.document_type),
                'pending');
    END IF;
END //
DELIMITER ;


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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(20) NOT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_contact` varchar(20) NOT NULL,  
  `machine_id` int NOT NULL,
  `duration_type` enum('day','week','month') NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `quotation_status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  `delivery_status` enum('pending','delivered','completed','cancelled') DEFAULT 'pending',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_quotation_number` (`quotation_number`),
  KEY `idx_customer_search` (`customer_name`, `customer_contact`),
  KEY `idx_quotation_machine_id` (`machine_id`),
  KEY `idx_quotation_status` (`quotation_status`),
  CONSTRAINT `fk_quotations_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_quotations_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DELIMITER //
CREATE PROCEDURE GetQuotationForPDF(IN quotation_id INT)
BEGIN
    SELECT 
        q.quotation_number,
        q.customer_name,
        q.customer_contact,
        q.machine_id,
        m.name AS machine_name,
        m.description AS machine_description,
        q.duration_type,
        q.unit_price,
        q.total_amount,
        q.notes,
        q.created_at,
        c.company_name,
        c.gst_number,
        c.email AS company_email,
        c.phone AS company_phone,
        c.address AS company_address,
        c.logo_url,
        c.signature_url
    FROM quotations q
    JOIN machines m ON q.machine_id = m.id
    CROSS JOIN our_company_details c
    WHERE q.id = quotation_id;
END //
DELIMITER ;


CREATE TABLE `quotation_counter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_number` int NOT NULL DEFAULT '0',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `quotation_counter` (`current_number`) VALUES (0);


DELIMITER //
CREATE PROCEDURE GetNextQuotationNumber()
BEGIN
    UPDATE quotation_counter 
    SET current_number = current_number + 1 
    WHERE id = 1;
    
    SELECT CONCAT('QUO-', LPAD(current_number, 3, '0')) AS quotation_number
    FROM quotation_counter 
    WHERE id = 1;
END //
DELIMITER ;



CREATE VIEW `quotation_history` AS
SELECT 
    q.id,
    q.quotation_number,
    q.customer_name,
    q.customer_contact,
    m.name AS machine_name,
    q.duration_type,
    q.total_amount,
    q.quotation_status,
    q.delivery_status,
    q.created_at,
    u.username AS created_by_user,
    DATEDIFF(CURDATE(), DATE(q.created_at)) AS days_ago
FROM quotations q
JOIN machines m ON q.machine_id = m.id
LEFT JOIN users u ON q.created_by = u.id
ORDER BY q.created_at DESC;

CREATE VIEW `customer_quotation_summary` AS
SELECT 
    q.customer_name,
    q.customer_contact,
    COUNT(*) AS total_quotations,
    AVG(q.total_amount) AS avg_quotation_amount,
    MAX(q.created_at) AS last_quotation_date,
    GROUP_CONCAT(DISTINCT m.name SEPARATOR ', ') AS machines_quoted
FROM quotations q
JOIN machines m ON q.machine_id = m.id
GROUP BY q.customer_name, q.customer_contact
ORDER BY last_quotation_date DESC;



DELIMITER //
CREATE PROCEDURE GetCustomerQuotationHistory(
    IN customer_name_param VARCHAR(100),
    IN customer_contact_param VARCHAR(20)
)
BEGIN
    SELECT 
        q.quotation_number,
        q.created_at,
        m.name AS machine_name,
        q.duration_type,
        q.unit_price,
        q.total_amount,
        q.quotation_status,
        q.delivery_status
    FROM quotations q
    JOIN machines m ON q.machine_id = m.id
    WHERE (q.customer_name = customer_name_param OR q.customer_contact = customer_contact_param)
    ORDER BY q.created_at DESC;
END //
DELIMITER ;