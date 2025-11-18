// routes/pricingRoutes.js
const express = require('express');
const router = express.Router();
// Import đầy đủ hàm
const {
    getAllPricings,
    getPricingById,
    createPricing,
    updatePricing,
    deletePricing
} = require('../controllers/pricingController');
// Import middleware
const { protect, authorize } = require('../middleware/authMiddleware');

// === Public Routes ===
// Lấy danh sách (đã JOIN)
router.get('/', getAllPricings);
// Lấy chi tiết 1 giá (dữ liệu thô cho form) - Có thể cần protect nếu bạn muốn
router.get('/:id', getPricingById); // <-- THÊM ROUTE NÀY

// === Admin Routes ===
// Tạo mới
router.post('/', protect, authorize('admin'), createPricing);
// Cập nhật
router.put('/:id', protect, authorize('admin'), updatePricing); // <-- THÊM ROUTE NÀY
// Xóa
router.delete('/:id', protect, authorize('admin'), deletePricing);

module.exports = router;