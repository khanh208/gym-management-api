// routes/packageRoutes.js
const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageById);

router.post('/', protect, authorize('admin'), packageController.createPackage);
router.put('/:id', protect, authorize('admin'), packageController.updatePackage);
router.delete('/:id', protect, authorize('admin'), packageController.deletePackage);

module.exports = router;