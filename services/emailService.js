// services/emailService.js
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      console.error('Lỗi: Chưa cấu hình RESEND_API_KEY hoặc EMAIL_FROM.');
      return null;
    }

    console.log(
      `[EmailService] Gửi email qua Resend... From: ${process.env.EMAIL_FROM} -> To: ${to}`
    );

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,       // "NeoFitness Support <no-reply@send.neofitness>"
      to,                                 // string hoặc array email
      subject,
      html: htmlContent,
      reply_to: 'khanh0929034803@gmail.com', // user reply sẽ về Gmail của bạn
    });

    console.log('[EmailService] Email sent OK:', result);
    return result;
  } catch (error) {
    console.error('[EmailService] Gửi email thất bại:', error?.message || error);
    return null;
  }
};

module.exports = { sendEmail };
