// 1. Middleware: Kiểm tra đăng nhập (Bảo vệ)
// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 1. Middleware: Kiểm tra đăng nhập (Bảo vệ)
exports.protect = async (req, res, next) => {
    let token;
    
    // Kiểm tra xem header 'Authorization' có tồn tại và bắt đầu bằng 'Bearer' không
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header (format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Xác thực token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // --- ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT ---
            // Gán thông tin user (đã giải mã) vào req.user
            req.user = decoded; 
            // --- KẾT THÚC DÒNG QUAN TRỌNG ---
            
            next(); // Cho phép đi tiếp
        } catch (error) {
            console.error("Lỗi xác thực token:", error);
            return res.status(401).json({ message: 'Xác thực thất bại, token không hợp lệ.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Xác thực thất bại, không tìm thấy token.' });
    }
};

// 2. Middleware: Kiểm tra vai trò (Phân quyền)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Hàm này chạy SAU hàm 'protect', nên nó mong đợi 'req.user' đã tồn tại
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Vai trò ${req.user ? req.user.role : 'không xác định'} không có quyền thực hiện chức năng này.` 
            });
        }
        next(); // Cho phép đi tiếp
    };
};