const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

router.get("/", bookController.getAllBooks);
router.get("/isbn/:isbn", bookController.searchByISBN);
router.get("/search/title", bookController.searchByTitle);
router.get("/category/:category", bookController.searchByCategory);
router.get("/search/author", bookController.searchByAuthor);
router.get("/search/publisher", bookController.searchByPublisher);

module.exports = router;