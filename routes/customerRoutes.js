// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getMyPackages,
    registerFreeTrial // Đảm bảo đã import hàm này
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- SỬA THỨ TỰ ---
// Route "cụ thể" (/my-packages) PHẢI đặt TRƯỚC route "chung" (/:id)
router.get('/my-packages', protect, authorize('customer'), getMyPackages);
router.get('/my-packages', protect, authorize('customer'), getMyPackages);
router.post('/register-free-trial', protect, authorize('customer'), registerFreeTrial);

// --- CÁC ROUTE KHÁC ---
router.get('/', protect, authorize('admin'), getAllCustomers);
router.get('/:id', protect, authorize('admin', 'customer'), getCustomerById);
router.put('/:id', protect, authorize('admin', 'customer'), updateCustomer);
router.delete('/:id', protect, authorize('admin'), deleteCustomer);

module.exports = router;