// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Chỉ Admin mới được xem thống kê
router.get('/stats', protect, authorize('admin'), getDashboardStats);

module.exports = router;