// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), bookingController.getAllBookings);
router.post('/', protect, authorize('customer'), bookingController.createBooking);
router.put('/:id', protect, authorize('admin', 'trainer'), bookingController.updateBookingStatus);

module.exports = router;