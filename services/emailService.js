// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Kiểm tra biến môi trường
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('Lỗi: Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS.');
            return null;
        }

        console.log(`[EmailService] Đang cố gắng kết nối SMTP tới Gmail... (User: ${process.env.EMAIL_USER})`);

        const transporter = nodemailer.createTransport({
            host: '64.233.184.108',
            port: 465, // Cổng 587 (STARTTLS) thường ổn định hơn trên Cloud
            secure: true, // false cho cổng 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false, // Bỏ qua lỗi chứng chỉ SSL (quan trọng trên Cloud)
                ciphers: 'SSLv3' // Tăng tính tương const nodemailer = require('nodemailer');
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
thích
            },
            // Tăng thời gian chờ lên 30 giây (mạng Render free có thể chậm)
            connectionTimeout: 60000, 
            greetingTimeout: 60000,
            socketTimeout: 60000
        });

        // Kiểm tra kết nối trước khi gửi
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error('[EmailService] Lỗi kết nối SMTP:', error);
                    reject(error);
                } else {
                    console.log('[EmailService] Kết nối SMTP sẵn sàng.');
                    resolve(success);
                }
            });
        });

        const mailOptions = {
            from: `"NeoFitness Support" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Email sent: ' + info.response);
        return info;

    } catch (error) {
        console.error('[EmailService] Gửi email thất bại:', error.message);
        // Trả về null để controller không bị crash
        return null; 
    }
};

module.exports = { sendEmail };