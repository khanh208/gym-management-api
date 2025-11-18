// routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', branchController.getAllBranches);

router.get('/:id', branchController.getBranchById);
router.post('/', protect, authorize('admin'), branchController.createBranch);
router.put('/:id', protect, authorize('admin'), branchController.updateBranch);
router.delete('/:id', protect, authorize('admin'), branchController.deleteBranch);

module.exports = router;