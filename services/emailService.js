// ...existing code...
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
        throw new Error('Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS trong biến môi trường.');
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = (process.env.SMTP_SECURE === 'true') || port === 465;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    // Kiểm tra kết nối SMTP (nếu thất bại sẽ ném lỗi rõ ràng)
    try {
        await transporter.verify();
    } catch (err) {
        console.error('SMTP verify failed:', err.message || err);
        throw new Error('Không thể kết nối tới SMTP server: ' + (err.message || err));
    }

    const mailOptions = {
        from: `"NeoFitness Support" <${user}>`,
        to,
        subject,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId || info.response);
        return info;
    } catch (error) {
        console.error('Lỗi gửi email:', error.message || error);
        throw error;
    }
};

module.exports = { sendEmail };
// ...existing code...