// routes/customerPackageRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllCustomerPackages,
    updateCustomerPackageStatus
} = require('../controllers/customerPackageController');
const { protect, authorize } = require('../middleware/authMiddleware');

// === Admin Routes ===
// Lấy tất cả các gói (của mọi khách hàng)
router.get('/', protect, authorize('admin'), getAllCustomerPackages);

// Cập nhật trạng thái (ví dụ: Hủy gói)
router.put('/:id/status', protect, authorize('admin'), updateCustomerPackageStatus);

module.exports = router;