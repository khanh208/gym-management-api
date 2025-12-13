// routes/checkInRoutes.js
const express = require('express');
const router = express.Router();
// SỬA: Import thêm createWalkInTicket vào danh sách destructuring
const { getCustomerCheckInInfo, createWalkInTicket, getCheckInHistory } = require('../controllers/checkInController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Chỉ Admin và Trainer mới được quét check-in
router.get('/customer/:khach_id', protect, authorize('admin', 'trainer'), getCustomerCheckInInfo);

// Tạo vé vãng lai
router.post('/walk-in', protect, authorize('admin', 'staff'), createWalkInTicket);

// --- THÊM ROUTE LỊCH SỬ ---
router.get('/history', protect, authorize('admin', 'manager'), getCheckInHistory);

module.exports = router;