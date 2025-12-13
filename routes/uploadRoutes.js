// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Đảm bảo thư mục uploads tồn tại
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 2. Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Lưu vào thư mục uploads
    },
    filename: function (req, file, cb) {
        // Đặt tên file = timestamp + đuôi file gốc (để tránh trùng tên)
        // Ví dụ: image-123456789.jpg
        cb(null, 'image-' + Date.now() + path.extname(file.originalname));
    }
});

// 3. Bộ lọc chỉ chấp nhận ảnh
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png)!'));
        }
    }
});



// 4. API Upload
router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });
        }
        // Trả về đường dẫn tương đối (Client sẽ ghép với Domain sau)
        const filePath = `/uploads/${req.file.filename}`;
        
        res.status(200).json({ 
            message: 'Upload thành công!', 
            filePath: filePath 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi upload file', error: error.message });
    }
});

module.exports = router;