// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const trainerServiceController = require('../controllers/trainerServiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);
router.get('/:serviceId/trainers', trainerServiceController.getTrainersForService);

// Chỉ ADMIN mới được sửa đổi
router.post('/', protect, authorize('admin'), serviceController.createService);
router.put('/:id', protect, authorize('admin'), serviceController.updateService);
router.delete('/:id', protect, authorize('admin'), serviceController.deleteService);
module.exports = router;