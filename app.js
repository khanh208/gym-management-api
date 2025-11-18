// app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const packageRoutes = require('./routes/packageRoutes');
const trainerRoutes = require('./routes/trainerRoutes'); 
const trainerController = require('./controllers/trainerController');
const serviceRoutes = require('./routes/serviceRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const paymentController = require('./controllers/paymentController');
const bookingRoutes = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController')
const faqRoutes = require('./routes/faqRoutes');
const contactRoutes = require('./routes/contactRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const { protect, authorize } = require('./middleware/authMiddleware');
const uploadRoutes = require('./routes/uploadRoutes');
const customerPackageRoutes = require('./routes/customerPackageRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');




const app = express();
app.use(cors());
// Middlewares
app.use(express.json()); // Cho phép server đọc body của request dưới dạng JSON

// Routes

app.get('/api/customers/:customerId/payments', paymentController.getPaymentsByCustomer);
app.get('/api/branches/:branchId/trainers', trainerController.getTrainersByBranch);
app.get('/api/customers/:customerId/bookings', bookingController.getBookingsByCustomer);
app.get('/api/customers/:customerId/bookings', protect, authorize('admin', 'customer'), bookingController.getBookingsByCustomer);
app.use('/api/check-in', checkInRoutes);



app.get('/api/branches/:branchId/trainers', trainerController.getTrainersByBranch);
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/pricings', pricingRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/customer', customerRoutes)
app.use('/api/customer-packages', customerPackageRoutes);
app.use('/api/dashboard', dashboardRoutes);


const dirname = path.resolve();
app.use('/uploads', express.static(path.join(dirname, '/uploads')));

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});