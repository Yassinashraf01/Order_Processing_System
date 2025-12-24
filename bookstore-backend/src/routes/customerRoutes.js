const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');


router.post('/register', customerController.register);
router.put('/profile/update', customerController.updateProfile);

router.post('/logout', customerController.logout);


router.get('/search', customerController.search);


router.post('/cart/add', customerController.addToCart);

router.get('/cart/:userId', customerController.viewCart);


router.post('/checkout', customerController.checkout);

router.get('/orders/:userId', customerController.getPastOrders);

module.exports = router;