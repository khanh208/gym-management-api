// routes/trainerRoutes.js
const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');
const trainerServiceController = require('../controllers/trainerServiceController');

router.get('/', trainerController.getAllTrainers);
router.get('/:id', trainerController.getTrainerById);
router.get('/:trainerId/services', trainerServiceController.getServicesForTrainer);

// Chỉ ADMIN mới được sửa đổi
router.post('/', protect, authorize('admin'), trainerController.createTrainer);
router.delete('/:id', protect, authorize('admin'), trainerController.deleteTrainer);
router.post('/:trainerId/services', protect, authorize('admin'), trainerServiceController.assignServiceToTrainer);
router.delete('/:trainerId/services/:serviceId', protect, authorize('admin'), trainerServiceController.removeServiceFromTrainer);

// *** SỬA DÒNG NÀY ***
// Cho phép cả 'admin' và 'trainer' sử dụng route này
router.put('/:id', protect, authorize('admin', 'trainer'), trainerController.updateTrainer);
router.get('/my/bookings', protect, authorize('trainer'), bookingController.getMyBookings);
// --- KẾT THÚC THÊM ---
router.get('/', trainerController.getAllTrainers);
router.get('/:id', trainerController.getTrainerById);
router.get('/:trainerId/services', trainerServiceController.getServicesForTrainer);

module.exports = router;