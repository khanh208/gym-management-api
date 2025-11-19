// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Kiểm tra biến môi trường
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS.');
        }

        // Cấu hình sử dụng cổng 465 (SSL) thay vì 587
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465, 
            secure: true, // true cho cổng 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Thêm các timeout để tránh bị treo mãi mãi
            connectionTimeout: 10000, // 10 giây
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        const mailOptions = {
            from: `"NeoFitness Support" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Lỗi gửi email:', error);
        // Không ném lỗi ra ngoài nữa để tránh làm sập API đăng ký
        // Chúng ta sẽ trả về false để controller biết là gửi mail thất bại nhưng vẫn đăng ký được
        return null; 
    }
};

module.exports = { sendEmail };