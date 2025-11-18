// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Sử dụng biến môi trường DATABASE_URL để chứa toàn bộ chuỗi URI của Supabase
// Nếu DATABASE_URL không tồn tại, nó sẽ cố gắng đọc các biến cũ (nhưng chúng ta sẽ không dùng chúng nữa)
const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
    connectionString: connectionString,
    // BẮT BUỘC: Thêm cấu hình SSL khi kết nối với Supabase/Cloud DB
    ssl: {
        rejectUnauthorized: false // Cho phép kết nối ngay cả khi chứng chỉ không được chứng nhận hoàn toàn
    }
});

pool.on('error', (err, client) => {
    console.error('Lỗi không mong muốn trên client PostgreSQL', err);
    process.exit(1); // Thoát ứng dụng khi có lỗi nghiêm trọng
});

console.log("Đã khởi tạo Pool kết nối CSDL.");

module.exports = {
    query: (text, params) => pool.query(text, params),
};