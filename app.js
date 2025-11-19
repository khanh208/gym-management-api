const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const packageRoutes = require('./routes/packageRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const customerRoutes = require('./routes/customerRoutes'); // Dùng cho cả /customer và /customers
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const faqRoutes = require('./routes/faqRoutes');
const contactRoutes = require('./routes/contactRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const customerPackageRoutes = require('./routes/customerPackageRoutes'); // Quản lý gói đã bán
const checkInRoutes = require('./routes/checkInRoutes'); // Quét QR
const dashboardRoutes = require('./routes/dashboardRoutes'); // Thống kê
const uploadRoutes = require('./routes/uploadRoutes'); // Upload ảnh

const app = express();

// --- Middlewares ---
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Cho phép đọc JSON body

// --- Cấu hình Static Folder cho ảnh Upload ---
// Giúp truy cập ảnh qua đường dẫn: http://domain.com/uploads/ten-anh.jpg
const dirname = path.resolve();
app.use('/uploads', express.static(path.join(dirname, '/uploads')));

// --- Routes Definitions ---

// 1. Auth & User
app.use('/api/auth', authRoutes);

// 2. Quản lý cơ bản (Master Data)
app.use('/api/branches', branchRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/pricings', pricingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/trainers', trainerRoutes);

// 3. Khách hàng & Gói tập
// Map cả 2 đường dẫn để tương thích với code frontend cũ và mới
app.use('/api/customer', customerRoutes);   // Cho các API cá nhân (my-packages, profile)
app.use('/api/customers', customerRoutes);  // Cho Admin quản lý danh sách
app.use('/api/customer-packages', customerPackageRoutes); // Admin quản lý/hủy gói

// 4. Nghiệp vụ (Booking, Payment, Check-in)
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/check-in', checkInRoutes);

// 5. CMS (Nội dung)
app.use('/api/faqs', faqRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/gallery', galleryRoutes);

// 6. Tiện ích & Thống kê
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);


// --- Global Error Handlers (Xử lý lỗi chung) ---

// 404 Handler: Nếu gọi sai đường dẫn API
app.use((req, res, next) => {
    res.status(404).json({ 
        message: `Không tìm thấy đường dẫn: ${req.originalUrl}` 
    });
});

// 500 Handler: Bắt các lỗi crash server
app.use((err, req, res, next) => {
  console.error('🔥 Lỗi Server:', err.stack);
  res.status(500).json({ 
      message: 'Lỗi server nội bộ', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error' 
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});