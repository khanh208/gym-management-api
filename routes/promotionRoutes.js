// routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
// Import đầy đủ các hàm từ controller
const {
    createPromotion,
    getAllPromotions,
    getPromotionById,
    updatePromotion,
    deletePromotion // <-- Import hàm xóa
} = require('../controllers/promotionController');
// Import middleware phân quyền
const { protect, authorize } = require('../middleware/authMiddleware');

// === Public Routes (Ai cũng xem được) ===
// Lấy danh sách tất cả khuyến mãi
router.get('/', getAllPromotions);
// Lấy chi tiết một khuyến mãi
router.get('/:id', getPromotionById);

// === Admin Routes (Chỉ Admin mới được thực hiện) ===
// Tạo mới khuyến mãi
router.post('/', protect, authorize('admin'), createPromotion);
// Cập nhật khuyến mãi
router.put('/:id', protect, authorize('admin'), updatePromotion);
// Xóa khuyến mãi
router.delete('/:id', protect, authorize('admin'), deletePromotion); // <-- Thêm route xóa

module.exports = router; // <-- Đảm bảo export router