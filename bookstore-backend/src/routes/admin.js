const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/books", adminController.addBook);
router.put('/book/:ISBN', adminController.updateBook);
router.post('/order/confirm/:order_id', adminController.confirmOrder);
router.get('/reports/sales/previous-month', adminController.getSalesPreviousMonth);
router.get('/reports/sales/by-date', adminController.getSalesByDate);
router.get('/reports/customers/top5', adminController.getTop5Customers);
router.get('/reports/books/top10', adminController.getTop10Books);
router.get('/reports/books/:ISBN/orders', adminController.getBookOrderCount);

module.exports = router;