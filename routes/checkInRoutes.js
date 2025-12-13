// routes/checkInRoutes.js
const express = require('express');
const router = express.Router();
const { getCustomerCheckInInfo } = require('../controllers/checkInController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Chỉ Admin và Trainer mới được quét check-in
router.get('/customer/:khach_id', protect, authorize('admin', 'trainer'), getCustomerCheckInInfo);
router.post('/walk-in', checkInController.createWalkInTicket);

module.exports = router;