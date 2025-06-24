const express = require('express');
const router = express.Router();
const { createOrder, captureOrder,getPaymentDetails } = require('../controller/paymentController');

router.post('/create', createOrder);
router.post('/capture', captureOrder);
router.post('/get', getPaymentDetails);

module.exports = router;
