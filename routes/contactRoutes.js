// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');

// THÊM DÒNG NÀY: Cho phép Public gửi liên hệ
router.post('/', contactController.createContact);

// SỬA LỖI TRÙNG LẶP: Giữ lại 1 dòng GET cho Admin
router.get('/', protect, authorize('admin'), contactController.getAllContacts);

// Các route khác cho Admin
router.put('/:id', protect, authorize('admin'), contactController.updateContactStatus);
router.delete('/:id', protect, authorize('admin'), contactController.deleteContact);

module.exports = router;