// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Kiểm tra biến môi trường
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS.');
        }

        // Cấu hình chi tiết thay vì dùng 'service: gmail'
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587, // Cổng TLS (thường ổn định hơn trên Cloud)
            secure: false, // false cho cổng 587, true cho cổng 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false // Giúp tránh lỗi chứng chỉ SSL trên một số mạng
            }
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
        throw error; 
    }
};

module.exports = { sendEmail };