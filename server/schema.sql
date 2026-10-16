-- Run once: mysql -u root -p < server/schema.sql
CREATE DATABASE IF NOT EXISTS flavoria CHARACTER SET utf8mb4;
USE flavoria;
CREATE TABLE IF NOT EXISTS products(
  id VARCHAR(20) PRIMARY KEY, name VARCHAR(120) NOT NULL, category VARCHAR(40) NOT NULL,
  price INT NOT NULL, description VARCHAR(255), available TINYINT(1) DEFAULT 1, rating DECIMAL(2,1));
CREATE TABLE IF NOT EXISTS orders(
  ref VARCHAR(20) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_name VARCHAR(120), phone VARCHAR(20), email VARCHAR(120), address VARCHAR(255), area VARCHAR(100), notes VARCHAR(255),
  subtotal INT, delivery INT, total INT,
  method ENUM('whatsapp','bkash','cod') NOT NULL,
  bkash_trx VARCHAR(20), bkash_sender VARCHAR(20), bkash_type VARCHAR(20),
  order_status ENUM('submitted','confirmed','preparing','delivered','cancelled') DEFAULT 'submitted',
  payment_status ENUM('unverified','verified','rejected') DEFAULT 'unverified'); -- only the admin API can set 'verified'
CREATE TABLE IF NOT EXISTS order_items(
  id INT AUTO_INCREMENT PRIMARY KEY, order_ref VARCHAR(20), product_id VARCHAR(20), name VARCHAR(120), price INT, qty INT,
  FOREIGN KEY(order_ref) REFERENCES orders(ref));
