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
        cb(null, 'image-' + Date.now() + path.extname(file.originalname));
    }
});

// 3. Bộ lọc chỉ chấp nhận ảnh và giới hạn dung lượng
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!'));
        }
    }
});

// 4. API Upload
router.post('/', (req, res) => {
    // Sử dụng upload.single bên trong để bắt lỗi Multer thủ công (tránh crash server)
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Lỗi từ Multer (ví dụ quá dung lượng)
            return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
        } else if (err) {
            // Lỗi khác (ví dụ sai định dạng file)
            return res.status(400).json({ message: err.message });
        }

        // Kiểm tra xem có file không
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });
        }

        // Trả về đường dẫn tương đối (Client sẽ ghép với Domain sau)
        // Thay thế dấu gạch chéo ngược (Windows) thành gạch chéo xuôi (Web)
        const normalizedPath = req.file.path.replace(/\\/g, '/');
        const imagePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

        res.status(201).json({ 
            message: 'Upload thành công!', 
            imagePath: imagePath // QUAN TRỌNG: Key này phải khớp với Frontend
        });
    });
});

module.exports = router;