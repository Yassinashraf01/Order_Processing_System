CREATE DATABASE IF NOT EXISTS bookstore_db;
USE bookstore_db;

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

DELIMITER //

-- Requirement 2c: Prevent quantity from being negative
-- Logic: If an update tries to set stock < 0, the transaction fails
CREATE TRIGGER before_book_update
BEFORE UPDATE ON Books
FOR EACH ROW
BEGIN
    IF NEW.quantity_in_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Update would cause negative stock';
    END IF;
END //

-- Requirement 3a: Auto-order when stock drops below threshold
-- Logic: Fires when stock moves from above to below the threshold 
CREATE TRIGGER after_book_update
AFTER UPDATE ON Books
FOR EACH ROW
BEGIN
    IF OLD.quantity_in_stock >= OLD.threshold AND NEW.quantity_in_stock < NEW.threshold THEN
        INSERT INTO Orders_From_Publisher (ISBN, quantity_ordered, status)
        VALUES (NEW.ISBN, 50, 'Pending');
    END IF;
END //

DELIMITER ;