// services/emailService.js
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Kiểm tra biến môi trường
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      console.error('Lỗi: Chưa cấu hình RESEND_API_KEY hoặc EMAIL_FROM.');
      return null;
    }

    console.log(`[EmailService] Đang gửi email qua Resend... (From: ${process.env.EMAIL_FROM} -> To: ${to})`);

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,  // "NeoFitness Support <no-reply@your-domain.com>"
      to,                            // có thể là string hoặc array
      subject,
      html: htmlContent,
    });

    console.log('[EmailService] Email sent:', result);
    return result;
  } catch (error) {
    console.error('[EmailService] Gửi email thất bại:', error?.message || error);
    // Có thể log chi tiết hơn nếu cần:
    // console.error(error);
    return null;
  }
};

module.exports = { sendEmail };
