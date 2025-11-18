// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Sử dụng biến môi trường DATABASE_URL để chứa toàn bộ chuỗi URI của Supabase.
// Nếu DATABASE_URL tồn tại (tức là trên Render), nó sẽ được sử dụng.
// Nếu không (tức là chạy local), nó sẽ cố gắng đọc các biến cũ (nhưng cách này không khuyến nghị).
const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres:khanh208@db.iyxngxwugmmzrdvnithj.supabase.co:5432/postgres`;

const pool = new Pool({
    connectionString: connectionString,
    // Cấu hình SSL là BẮT BUỘC khi kết nối với Supabase/Cloud DB
    // Chúng ta bật SSL nếu không chạy trong môi trường phát triển (DEV)
    ssl: process.env.NODE_ENV === 'production' ? {
        // Tùy chọn này giúp kết nối ổn định hơn trên Render
        rejectUnauthorized: false
    } : false 
});

pool.on('error', (err, client) => {
    console.error('Lỗi nghiêm trọng trên kết nối CSDL', err);
    process.exit(1); 
});

console.log("Đã khởi tạo Pool kết nối CSDL thành công.");

module.exports = {
    query: (text, params) => pool.query(text, params),
};