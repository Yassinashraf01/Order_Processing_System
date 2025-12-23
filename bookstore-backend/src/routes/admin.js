const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/books", adminController.addBook);
router.put('/book/:ISBN', adminController.updateBook);
router.post('/order/confirm/:order_id', adminController.confirmOrder);

module.exports = router;