// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');

const MAX_OTP_ATTEMPTS = 3; // Số lần thử sai tối đa

// --- 1. CẬP NHẬT HÀM ĐĂNG KÝ (register) ---
exports.register = async (req, res) => {
    const { ho_ten, email, password } = req.body;

    if (!ho_ten || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    try {
        // 1. Kiểm tra email đã tồn tại trong tai_khoan chưa
        const userExists = await db.query('SELECT * FROM tai_khoan WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Email đã tồn tại.' });
        }

        // 2. Tạo tài khoản đăng nhập (tai_khoan)
        const salt = await bcrypt.genSalt(10);
        const mat_khau_hash = await bcrypt.hash(password, salt);
        
        const newUserQuery = `
            INSERT INTO tai_khoan (ho_ten, email, mat_khau_hash, role) 
            VALUES ($1, $2, $3, 'customer') 
            RETURNING user_id, email, ho_ten`; // Lấy lại user_id
            
        const newUserResult = await db.query(newUserQuery, [ho_ten, email, mat_khau_hash]);
        const newAccount = newUserResult.rows[0];

        // 3. TỰ ĐỘNG TẠO HỒ SƠ KHÁCH HÀNG (khach_hang)
        // Lấy user_id vừa tạo để liên kết
        const newCustomerId = newAccount.user_id;
        const customerQuery = `
            INSERT INTO khach_hang (ho_ten, email, tai_khoan_id)
            VALUES ($1, $2, $3) RETURNING khach_id;
        `;
        await db.query(customerQuery, [newAccount.ho_ten, newAccount.email, newCustomerId]);

        // 4. Tạo và gửi OTP (giữ nguyên logic cũ)
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const otp_hash = await bcrypt.hash(otp, otpSalt);
        const het_han_luc = new Date(Date.now() + 10 * 60 * 1000); 

        const upsertOtpQuery = `
            INSERT INTO ma_xac_thuc (email, otp_hash, het_han_luc) VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, het_han_luc = EXCLUDED.het_han_luc, so_lan_thu_sai = 0;
        `;
        await db.query(upsertOtpQuery, [email, otp_hash, het_han_luc]);

        const subject = 'Mã xác thực tài khoản của bạn';
        const htmlBody = `<p>Mã OTP để kích hoạt tài khoản của bạn là: <b>${otp}</b>. Mã này có hiệu lực trong 10 phút.</p>`;
        await sendEmail(email, subject, htmlBody);

        res.status(201).json({
            message: 'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP xác thực.',
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// --- 2. THÊM HÀM XÁC THỰC OTP (verifyOtp) MỚI ---
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email và mã OTP.' });
    }

    try {
        // Tìm OTP trong database
        const result = await db.query('SELECT * FROM ma_xac_thuc WHERE email = $1', [email]);
        const verificationData = result.rows[0];

        // 1. Kiểm tra OTP có tồn tại không
        if (!verificationData) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        // 2. Kiểm tra số lần thử sai
        if (verificationData.so_lan_thu_sai >= MAX_OTP_ATTEMPTS) {
            return res.status(400).json({ message: 'Bạn đã nhập sai quá số lần cho phép. Vui lòng đăng ký lại để nhận mã mới.' });
        }
        
        // 3. Kiểm tra OTP đã hết hạn chưa
        if (new Date() > new Date(verificationData.het_han_luc)) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }

        // 4. So sánh OTP người dùng nhập với hash trong DB
        const isMatch = await bcrypt.compare(otp, verificationData.otp_hash);

        if (!isMatch) {
            // Nếu sai, tăng bộ đếm lỗi
            await db.query('UPDATE ma_xac_thuc SET so_lan_thu_sai = so_lan_thu_sai + 1 WHERE email = $1', [email]);
            return res.status(400).json({ message: 'Mã OTP không chính xác.' });
        }

        // Nếu đúng, kích hoạt tài khoản và xóa OTP
        await db.query('UPDATE tai_khoan SET email_xac_thuc_at = NOW() WHERE email = $1', [email]);
        await db.query('DELETE FROM ma_xac_thuc WHERE email = $1', [email]);

        res.status(200).json({ message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// --- 3. HÀM ĐĂNG NHẬP (login) - Giữ nguyên, không thay đổi ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Lấy user VÀ role
        const result = await db.query('SELECT * FROM tai_khoan WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }
        if (!user.email_xac_thuc_at) {
            return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt.' });
        }

        const isMatch = await bcrypt.compare(password, user.mat_khau_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }
        
        // **THÊM "role: user.role" VÀO PAYLOAD**
        const payload = { 
            user_id: user.user_id, 
            email: user.email, 
            role: user.role // <-- Dòng mới
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            accessToken: token,
            role: user.role, // Gửi kèm role về cho client
            userId: user.user_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
// controllers/authController.js

// ... (các hàm khác giữ nguyên) ...

// THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email.' });
    }

    try {
        console.log(`[Forgot Password] Bắt đầu yêu cầu cho email: ${email}`);

        // 1. Kiểm tra xem email có tồn tại trong bảng tai_khoan không
        const userResult = await db.query('SELECT * FROM tai_khoan WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            console.log(`[Forgot Password] Email ${email} không tồn tại trong hệ thống. Vẫn trả về thành công để bảo mật.`);
            // Luôn trả về thành công để tránh bị dò tìm email
            return res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một mã OTP.' });
        }
        
        console.log(`[Forgot Password] Email ${email} hợp lệ. Bắt đầu tạo OTP.`);

        // 2. Tạo OTP và thời gian hết hạn
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const otp_hash = await bcrypt.hash(otp, otpSalt);
        const het_han_luc = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

        // 3. Lưu OTP vào bảng ma_xac_thuc
        const upsertOtpQuery = `
            INSERT INTO ma_xac_thuc (email, otp_hash, het_han_luc) VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, het_han_luc = EXCLUDED.het_han_luc, so_lan_thu_sai = 0;
        `;
        await db.query(upsertOtpQuery, [email, otp_hash, het_han_luc]);

        // 4. Gửi email
        console.log(`[Forgot Password] Chuẩn bị gửi OTP ${otp} tới ${email}...`);
        const subject = 'Yêu cầu đặt lại mật khẩu';
        const htmlBody = `<p>Mã OTP để đặt lại mật khẩu của bạn là: <b>${otp}</b>. Vui lòng không chia sẻ mã này. Mã có hiệu lực trong 10 phút.</p>`;
        
        // SỬA LẠI: Kiểm tra kết quả trả về của hàm sendEmail
        const emailSent = await sendEmail(email, subject, htmlBody);

        if (emailSent) {
            console.log(`[Forgot Password] Gửi email thành công tới ${email}.`);
            res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một mã OTP.' });
        } else {
            // Nếu gửi mail thất bại, báo lỗi rõ ràng
            console.error(`[Forgot Password] GỬI EMAIL THẤT BẠI tới ${email}. Vui lòng kiểm tra cấu hình emailService hoặc file .env.`);
            res.status(500).json({ message: 'Lỗi hệ thống khi gửi email.' });
        }

    } catch (error) {
        console.error('[Forgot Password] Đã xảy ra lỗi nghiêm trọng:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ email, OTP và mật khẩu mới.' });
    }

    try {
        // 1. Tìm OTP trong database
        const result = await db.query('SELECT * FROM ma_xac_thuc WHERE email = $1', [email]);
        const verificationData = result.rows[0];

        // 2. Thực hiện các bước xác thực
        if (!verificationData) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        if (verificationData.so_lan_thu_sai >= 3) {
            return res.status(400).json({ message: 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.' });
        }
        if (new Date() > new Date(verificationData.het_han_luc)) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }

        // 3. So sánh OTP người dùng nhập
        const isMatch = await bcrypt.compare(otp, verificationData.otp_hash);
        if (!isMatch) {
            await db.query('UPDATE ma_xac_thuc SET so_lan_thu_sai = so_lan_thu_sai + 1 WHERE email = $1', [email]);
            return res.status(400).json({ message: 'Mã OTP không chính xác.' });
        }

        // 4. Nếu OTP hợp lệ, cập nhật mật khẩu người dùng
        const salt = await bcrypt.genSalt(10);
        const mat_khau_hash = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE tai_khoan SET mat_khau_hash = $1 WHERE email = $2', [mat_khau_hash, email]);

        // 5. Quan trọng: Xóa OTP đã sử dụng để nó không thể dùng lại
        await db.query('DELETE FROM ma_xac_thuc WHERE email = $1', [email]);

        res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công! Bây giờ bạn có thể đăng nhập.' });

    } catch (error) {
        console.error('[Reset Password] Đã xảy ra lỗi:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};