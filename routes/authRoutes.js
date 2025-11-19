// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


// Thêm route mới để xử lý OTP
router.post('/verify-otp', authController.verifyOtp);

router.post('/register', authController.register);
router.post('/login', authController.login);

// KÍCH HOẠT LẠI DÒNG NÀY
router.post('/forgot-password', authController.forgotPassword); 
router.post('/reset-password', authController.resetPassword);
module.exports = router;