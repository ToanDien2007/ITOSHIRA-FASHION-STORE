-- Itoshira Shop database schema + sample data
-- Compatible with MySQL 8.x (MySQL Workbench)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Create database
CREATE DATABASE IF NOT EXISTS `itoshira_shop`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `itoshira_shop`;

-- Drop tables (optional for re-import)
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

-- =========================
-- USERS
-- =========================
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `auth_provider` VARCHAR(30) NOT NULL DEFAULT 'local',
  `provider_id` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_provider` (`auth_provider`, `provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- CATEGORIES
-- =========================
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed categories to match your UI filters:
-- 1: Quần áo, 2: Giày dép, 3: Phụ kiện
INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
  (1, 'Quần áo', 'quan-ao'),
  (2, 'Giày dép', 'giay-dep'),
  (3, 'Phụ kiện', 'phu-kien');

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `price` INT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `gender` ENUM('Nam','Nữ','Unisex') NOT NULL DEFAULT 'Unisex',
  `category_id` INT UNSIGNED NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_filters` (`gender`, `category_id`, `price`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample products (image_url can be a filename in /public/img/ or a full http(s) URL)
INSERT INTO `products` (`name`, `price`, `image_url`, `gender`, `category_id`, `description`) VALUES
  ('Áo thun basic Itoshira', 99000, 'tee-basic.jpg', 'Unisex', 1, 'Áo thun cotton mềm, dễ phối đồ.'),
  ('Quần jeans ống suông', 349000, 'jeans-straight.jpg', 'Nam', 1, 'Form suông, chất denim dày dặn.'),
  ('Váy maxi mùa hè', 399000, 'dress-maxi.jpg', 'Nữ', 1, 'Váy maxi nhẹ, phù hợp đi biển.'),
  ('Sneaker trắng tối giản', 499000, 'sneaker-white.jpg', 'Unisex', 2, 'Sneaker basic, đi học/đi làm đều hợp.'),
  ('Áo khoác bomber premium', 750000, 'bomber.jpg', 'Unisex', 1, 'Áo khoác bomber form đẹp, chất vải dày, giữ ấm tốt.'),
  ('Giày da handcrafted', 1200000, 'giay-da.jpg', 'Nam', 2, 'Giày da thủ công, bền đẹp, phù hợp đi làm/sự kiện.'),
  ('Dép quai ngang', 129000, 'dep-quai-ngang.jpg', 'Unisex', 2, 'Êm chân, bền, dễ vệ sinh.'),
  ('Nón lưỡi trai', 159000, 'cap.jpg', 'Unisex', 3, 'Nón form chuẩn, thêu logo nhỏ.'),
  ('Túi tote canvas', 189000, 'tote.jpg', 'Unisex', 3, 'Tote canvas chắc chắn, chứa đồ thoải mái.');

