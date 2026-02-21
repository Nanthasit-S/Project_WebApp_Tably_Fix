-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.0.2-MariaDB-ubu2404 - mariadb.org binary distribution
-- Server OS:                    debian-linux-gnu
-- HeidiSQL Version:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for cy_project_app
CREATE DATABASE IF NOT EXISTS `cy_project_app` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `cy_project_app`;

-- Dumping structure for table cy_project_app.bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'confirmed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `slip_image_url` varchar(255) DEFAULT NULL,
  `is_hidden_from_user` tinyint(1) DEFAULT 0,
  `order_id` varchar(255) DEFAULT NULL,
  `check_in_token` varchar(255) DEFAULT NULL,
  `check_in_token_expires_at` datetime DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `table_id_booking_date_unique` (`table_id`,`booking_date`),
  KEY `user_id` (`user_id`),
  KEY `table_id` (`table_id`),
  KEY `idx_booking_lookup` (`table_id`,`booking_date`,`status`),
  KEY `idx_booking_user` (`user_id`),
  KEY `idx_bookings_table_id` (`table_id`),
  KEY `idx_bookings_user_id` (`user_id`),
  KEY `idx_bookings_date_status` (`booking_date`,`status`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.bookings: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.booking_attempts
CREATE TABLE IF NOT EXISTS `booking_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `session_id` varchar(255) NOT NULL,
  `status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `table_id` (`table_id`),
  CONSTRAINT `booking_attempts_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.booking_attempts: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.booking_orders
CREATE TABLE IF NOT EXISTS `booking_orders` (
  `id` varchar(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `total_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `expires_at` datetime DEFAULT NULL,
  `ref_nbr` varchar(64) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.booking_orders: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table cy_project_app.categories: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.events
CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `image_url` varchar(255) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `title` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'ราคาบัตรต่อใบ',
  `total_tickets` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนบัตรทั้งหมด',
  `tickets_sold` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนบัตรที่ขายไปแล้ว',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สถานะการเปิดขายบัตร',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.events: ~3 rows (approximately)
INSERT INTO `events` (`id`, `image_url`, `alt_text`, `link_url`, `sort_order`, `title`, `date`, `description`, `price`, `total_tickets`, `tickets_sold`, `is_active`) VALUES
	(6, '/uploads/1762413482604-thumbnail-V2-TYPE_F-1.jpg', '', NULL, 0, 'Three Man Down', '2026-01-01', '', 10.00, 1000, 1, 1),
	(7, '/uploads/1762413547656-hq720.jpg', '', NULL, 0, 'Saran', '2025-11-28', '', 20.00, 500, 1, 1),
	(8, '/uploads/1762413591168-1651560797_68215_ZENT_KA1.webp', '', NULL, 0, 'ZentYarb', '2025-11-21', '', 10.00, 100, 0, 1);

-- Dumping structure for table cy_project_app.event_orders
CREATE TABLE IF NOT EXISTS `event_orders` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `status` enum('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `slip_image_url` varchar(255) DEFAULT NULL,
  `ref_nbr` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `event_orders_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `event_orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table cy_project_app.event_orders: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.event_tickets
CREATE TABLE IF NOT EXISTS `event_tickets` (
  `id` varchar(255) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `purchase_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('valid','used','cancelled') NOT NULL DEFAULT 'valid',
  `qr_code_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`qr_code_data`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_event_tickets_created_at` (`created_at`),
  CONSTRAINT `event_tickets_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_tickets_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table cy_project_app.event_tickets: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.menu_items
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table cy_project_app.menu_items: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.notifications: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('pending','preparing','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table cy_project_app.orders: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.order_items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table cy_project_app.order_items: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.settings
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.settings: ~5 rows (approximately)
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
	('booking_enabled', 'true'),
	('layoutImageUrl', 'https://i.ibb.co/yjmdRHD/T-1-1.png'),
	('max_bookings_per_user', '2'),
	('promptpayAccount', '0931617671'),
	('transfer_fee', '10');

-- Dumping structure for table cy_project_app.tables
CREATE TABLE IF NOT EXISTS `tables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_number` varchar(50) NOT NULL,
  `capacity` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'available',
  `zone_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zone_id` (`zone_id`),
  KEY `idx_tables_zone_id` (`zone_id`),
  CONSTRAINT `tables_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.tables: ~14 rows (approximately)
INSERT INTO `tables` (`id`, `table_number`, `capacity`, `status`, `zone_id`) VALUES
	(9, 'A1', 4, 'available', 6),
	(10, 'A2', 4, 'available', 6),
	(11, 'A3', 4, 'available', 6),
	(12, 'A4', 4, 'available', 6),
	(13, 'B1', 6, 'available', 7),
	(14, 'B2', 6, 'available', 7),
	(15, 'B3', 6, 'available', 7),
	(17, 'C1', 6, 'available', 8),
	(18, 'C2', 6, 'available', 8),
	(22, 'D1', 4, 'available', 9),
	(23, 'D2', 4, 'available', 9),
	(24, 'VIP1', 8, 'available', 10),
	(25, 'VIP2', 8, 'available', 10),
	(26, 'VIP3', 8, 'available', 10);

-- Dumping structure for table cy_project_app.used_slip_refs
CREATE TABLE IF NOT EXISTS `used_slip_refs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ref_nbr` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ref_nbr` (`ref_nbr`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.used_slip_refs: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `line_id` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `picture_url` varchar(255) DEFAULT NULL,
  `role` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `line_id` (`line_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.users: ~0 rows (approximately)

-- Dumping structure for table cy_project_app.zones
CREATE TABLE IF NOT EXISTS `zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `booking_fee` int(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table cy_project_app.zones: ~5 rows (approximately)
INSERT INTO `zones` (`id`, `name`, `description`, `price`, `booking_fee`) VALUES
	(6, 'A', NULL, 0.00, 10),
	(7, 'B', NULL, 0.00, 10),
	(8, 'C', NULL, 0.00, 10),
	(9, 'D', NULL, 0.00, 10),
	(10, 'VIP', NULL, 0.00, 10);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
