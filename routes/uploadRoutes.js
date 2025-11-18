// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware'); // Bảo vệ route

// Cấu hình nơi lưu file (lưu vào thư mục 'uploads' ở thư mục gốc)
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // Thư mục 'uploads' phải tồn tại
    },
    filename(req, file, cb) {
        // Tạo tên file duy nhất: fieldname-timestamp.extension
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Kiểm tra loại file (chỉ cho phép ảnh)
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file hình ảnh (jpeg, jpg, png, gif)!'));
    }
}

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Định nghĩa API endpoint: POST /api/upload
// 'protect' đảm bảo chỉ người đã đăng nhập mới được upload
router.post('/', protect, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Không có file nào được chọn.' });
    }
    
    // Trả về đường dẫn của file đã upload
    // Dấu \ cần được thay bằng / để URL hợp lệ trên web
    const filePath = `/${req.file.path.replace(/\\/g, '/')}`;
    
    res.status(201).json({
        message: 'Upload ảnh thành công!',
        imagePath: filePath // Ví dụ: /uploads/image-1698420000.jpg
    });
});

module.exports = router;