// routes/checkInRoutes.js
const express = require('express');
const router = express.Router();
// SỬA: Import thêm createWalkInTicket vào danh sách destructuring
const { getCustomerCheckInInfo, createWalkInTicket } = require('../controllers/checkInController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Chỉ Admin và Trainer mới được quét check-in
router.get('/customer/:khach_id', protect, authorize('admin', 'trainer'), getCustomerCheckInInfo);

// SỬA: Gọi trực tiếp hàm createWalkInTicket (thay vì checkInController.createWalkInTicket)
router.post('/walk-in', createWalkInTicket);

module.exports = router;