// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllPayments,
    createPayment,
    handleMomoIPN,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import

// Route để xem lịch sử (Chỉ Admin)
router.get('/', protect, authorize('admin'), getAllPayments);

// --- SỬA Ở ĐÂY ---
// Route để tạo yêu cầu thanh toán (Chỉ Customer)
// Thêm 'protect' và 'authorize('customer')' vào đây
router.post('/', protect, authorize('customer'), createPayment);
// --- KẾT THÚC SỬA ---

// Route để Momo gọi về (IPN)
router.post('/momo-ipn', handleMomoIPN);

module.exports = router;