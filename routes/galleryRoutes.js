const express = require('express');
const router = express.Router();
// Import specific functions
const {
    getAllGalleryItems,
    createGalleryItem,
    getGalleryItemById, // <-- Import
    updateGalleryItem,
    deleteGalleryItem
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// === Public Routes ===
// Lấy danh sách
router.get('/', getAllGalleryItems);
// Lấy chi tiết (cần cho form edit)
router.get('/:id', getGalleryItemById); // <-- ADD ROUTE

// === Admin Routes ===
// Tạo mới
router.post('/', protect, authorize('admin'), createGalleryItem);
// Cập nhật (Đã có)
router.put('/:id', protect, authorize('admin'), updateGalleryItem);
// Xóa (Đã có)
router.delete('/:id', protect, authorize('admin'), deleteGalleryItem);

module.exports = router;