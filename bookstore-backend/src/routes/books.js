const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Get all books
router.get("/", bookController.getAllBooks);

// Search by ISBN (exact match)
router.get("/isbn/:isbn", bookController.searchByISBN);

// Search by Title (partial match)
router.get("/search/title", bookController.searchByTitle);

// Search by Category
router.get("/category/:category", bookController.searchByCategory);

// Search by Author (partial match)
router.get("/search/author", bookController.searchByAuthor);

// Search by Publisher (partial match)
router.get("/search/publisher", bookController.searchByPublisher);

module.exports = router;