const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, isCustomer } = require('../middleware/auth'); // ✅ Correct path

// Public routes (no authentication needed)
router.post('/register', customerController.register);
router.post('/login', customerController.login);

// Protected routes (require authentication)
router.put('/profile', verifyToken, isCustomer, customerController.updateProfile);
router.post('/cart/add', verifyToken, isCustomer, customerController.addToCart);
router.get('/cart', verifyToken, isCustomer, customerController.viewCart);
router.delete('/cart/remove', verifyToken, isCustomer, customerController.removeFromCart);
router.post('/checkout', verifyToken, isCustomer, customerController.checkout);
router.get('/orders', verifyToken, isCustomer, customerController.getPastOrders);
router.post('/logout', verifyToken, isCustomer, customerController.logout);

module.exports = router;