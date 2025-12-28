const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    addBook,
    updateBook,
    confirmOrder,
    getSalesPreviousMonth,
    getSalesByDate,
    getTop5Customers,
    getTop10Books,
    getBookOrderCount,
    getPendingOrders
} = require('../controllers/adminController');

// ✅ ALL ROUTES NOW REQUIRE ADMIN TOKEN
// Apply middleware to ALL admin routes
router.use(verifyToken, isAdmin);

// 1. Add New Book
router.post('/books', addBook);

// 2. Update Book (Modify quantity)
router.put('/books/:ISBN', updateBook);

// 3. Confirm Order from Publisher
router.get('/orders/pending', getPendingOrders);
router.post('/orders/:order_id/confirm', confirmOrder);

// 4. Reports
router.get('/reports/sales/previous-month', getSalesPreviousMonth);
router.get('/reports/sales/by-date', getSalesByDate);
router.get('/reports/top-customers', getTop5Customers);
router.get('/reports/top-books', getTop10Books);
router.get('/reports/book-orders/:ISBN', getBookOrderCount);

module.exports = router;