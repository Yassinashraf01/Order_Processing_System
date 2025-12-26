const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Registration
router.post('/register', customerController.register);

// Login (ADD THIS IF IT'S MISSING)
router.post('/login', customerController.login);

// Profile
router.put('/profile', customerController.updateProfile);

// Search
router.get('/search', customerController.search);

// Cart
router.post('/cart/add', customerController.addToCart);
router.get('/cart/:userId', customerController.viewCart);

// Checkout
router.post('/checkout', customerController.checkout);

// Orders
router.get('/orders/:userId', customerController.getPastOrders);

// Logout
router.post('/logout', customerController.logout);

module.exports = router;