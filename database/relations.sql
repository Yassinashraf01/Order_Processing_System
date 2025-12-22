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