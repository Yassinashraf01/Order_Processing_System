-- =====================================================
-- Database Schema & Documentation
-- Project: Order Processing System (Online Bookstore)
-- Description:
-- This file defines the database schema, relations,
-- and core triggers required to enforce integrity
-- constraints and automate inventory replenishment.
-- =====================================================
CREATE DATABASE IF NOT EXISTS bookstore_db;
USE bookstore_db;

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    role ENUM('ADMIN', 'CUSTOMER') NOT NULL
);
CREATE TABLE Customer_profiles (
user_id INT PRIMARY KEY,
phone_number VARCHAR(20) NOT NULL,
shipping_address TEXT NOT NULL,
FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE

);

CREATE TABLE Sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_price DECIMAL(10,2) NOT NULL,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);




CREATE TABLE Publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    telephone VARCHAR(20)
);

CREATE TABLE Books (
    ISBN VARCHAR(13) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    publisher_id INT,
    publication_year INT,
    selling_price DECIMAL(10, 2) NOT NULL,
    category ENUM('Science', 'Art', 'Religion', 'History', 'Geography') NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    threshold INT DEFAULT 10,
    FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id)
);
CREATE TABLE Shopping_Cart (
user_id INT,
ISBN VARCHAR(13),
quantity INT NOT NULL DEFAULT 1,
PRIMARY KEY(user_id , ISBN),
FOREIGN KEY (user_id) REFERENCES Users(user_id),
FOREIGN KEY (ISBN) REFERENCES Books(ISBN)

);
CREATE TABLE Sale_Items (
    sale_id INT,
    ISBN VARCHAR(13),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (sale_id, ISBN), -- Both are primary key not to make the same book appear twice in the invoice
    FOREIGN KEY (sale_id) REFERENCES Sales(sale_id),
    FOREIGN KEY (ISBN) REFERENCES Books(ISBN)
);


CREATE TABLE Authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(255) NOT NULL
);

CREATE TABLE Book_Authors (
    ISBN VARCHAR(13),
    author_id INT,
    PRIMARY KEY (ISBN, author_id),
    FOREIGN KEY (ISBN) REFERENCES Books(ISBN),
    FOREIGN KEY (author_id) REFERENCES Authors(author_id)
);

CREATE TABLE Orders_From_Publisher (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    ISBN VARCHAR(13),
    quantity_ordered INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Confirmed') DEFAULT 'Pending',
    confirmed_date DATETIME,
    FOREIGN KEY (ISBN) REFERENCES Books(ISBN)
);

-- Triggers 

DELIMITER $$

-- Trigger 1: Prevent updating book stock to a negative value
-- Requirement: Page 2, Part 2c: "admin cannot update quantity if it causes negative stock"
CREATE TRIGGER before_book_update
BEFORE UPDATE ON Books
FOR EACH ROW
BEGIN
    IF NEW.quantity_in_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Update would cause negative stock';
    END IF;
END$$

-- Trigger 2: Auto-order when stock drops below threshold
-- Requirement: Page 2, Part 3a: "place orders when quantity drops below threshold"
CREATE TRIGGER after_book_update
AFTER UPDATE ON Books
FOR EACH ROW
BEGIN
    IF OLD.quantity_in_stock >= OLD.threshold 
       AND NEW.quantity_in_stock < NEW.threshold THEN
        INSERT INTO Orders_From_Publisher (ISBN, quantity_ordered, status)
        VALUES (NEW.ISBN, 50, 'Pending');
    END IF;
END$$

DELIMITER ;