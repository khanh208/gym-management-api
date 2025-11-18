// routes/faqRoutes.js
const express = require('express');
const router = express.Router();
// Import specific functions
const {
    getAllFaqs,
    createFaq,
    getFaqById, // <-- Import
    updateFaq,
    deleteFaq
} = require('../controllers/faqController');
const { protect, authorize } = require('../middleware/authMiddleware');

// === Public Routes ===
// Lấy danh sách
router.get('/', getAllFaqs);
// Lấy chi tiết (cần cho form edit)
router.get('/:id', getFaqById); // <-- ADD ROUTE

// === Admin Routes ===
// Tạo mới
router.post('/', protect, authorize('admin'), createFaq);
// Cập nhật (Đã có)
router.put('/:id', protect, authorize('admin'), updateFaq);
// Xóa (Đã có)
router.delete('/:id', protect, authorize('admin'), deleteFaq);

module.exports = router;