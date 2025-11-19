// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Lỗi: Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS.');
      return null;
    }

    console.log(`[EmailService] Đang cố gắng kết nối SMTP tới Gmail... (User: ${process.env.EMAIL_USER})`);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // 465 = SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // phải là App Password
      },
      // Nếu muốn, có thể bỏ luôn tls:
      // tls: { rejectUnauthorized: true },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    await transporter.verify();

    const mailOptions = {
      from: `"NeoFitness Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('[EmailService] Gửi email thất bại:', error);
    return null;
  }
};

module.exports = { sendEmail };