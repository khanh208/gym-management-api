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
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html: htmlContent,
      reply_to: 'khanh0929034803@gmail.com',
    });

    console.log('[EmailService] Resend result =', JSON.stringify(result, null, 2));

    if (result.error) {
      console.error('[EmailService] Resend báo lỗi:', result.error);
      return null;
    }

    console.log('[EmailService] Gửi email thành công, id =', result.data?.id);
    return result.data;
  } catch (error) {
    console.error('[EmailService] Gửi email thất bại (exception):', error);
    return null;
  }
};

module.exports = { sendEmail };