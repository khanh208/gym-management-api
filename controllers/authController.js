// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');

const MAX_OTP_ATTEMPTS = 3; // Số lần thử sai tối đa

// --- 1. ĐĂNG KÝ (register) ---
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

        // 2. Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const mat_khau_hash = await bcrypt.hash(password, salt);
        
        // 3. Tạo OTP và hash OTP
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const otp_hash = await bcrypt.hash(otp, otpSalt);
        const het_han_luc = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

        // 4. Gửi email OTP (Gửi trước khi ghi DB để tránh dữ liệu rác nếu gửi lỗi)
        const subject = 'Mã xác thực tài khoản của bạn';
        const htmlBody = `<p>Mã OTP để kích hoạt tài khoản của bạn là: <b>${otp}</b>. Mã này có hiệu lực trong 10 phút.</p>`;
        
        try {
            await sendEmail(email, subject, htmlBody);
        } catch (emailError) {
            console.error('Lỗi gửi email đăng ký:', emailError);
            return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng kiểm tra lại email của bạn.' });
        }

        // 5. Bắt đầu Transaction để lưu dữ liệu
        const client = await db.query('BEGIN');
        try {
            // 5a. Tạo tài khoản (tai_khoan) - Chưa active
            const newUserQuery = `
                INSERT INTO tai_khoan (ho_ten, email, mat_khau_hash, role, trang_thai) 
                VALUES ($1, $2, $3, 'customer', 'pending') 
                RETURNING user_id, email, ho_ten`;
            const newUserResult = await db.query(newUserQuery, [ho_ten, email, mat_khau_hash]);
            const newAccount = newUserResult.rows[0];

            // 5b. Tạo hồ sơ khách hàng (khach_hang)
            const customerQuery = `
                INSERT INTO khach_hang (ho_ten, email, tai_khoan_id)
                VALUES ($1, $2, $3) RETURNING khach_id;
            `;
            await db.query(customerQuery, [newAccount.ho_ten, newAccount.email, newAccount.user_id]);

            // 5c. Lưu OTP (ma_xac_thuc)
            const upsertOtpQuery = `
                INSERT INTO ma_xac_thuc (email, otp_hash, het_han_luc) VALUES ($1, $2, $3)
                ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, het_han_luc = EXCLUDED.het_han_luc, so_lan_thu_sai = 0;
            `;
            await db.query(upsertOtpQuery, [email, otp_hash, het_han_luc]);

            await db.query('COMMIT'); // Lưu tất cả

            res.status(201).json({
                message: 'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP xác thực.',
            });
        } catch (dbError) {
            await db.query('ROLLBACK'); // Hủy nếu lỗi DB
            console.error("Lỗi DB khi đăng ký:", dbError);
            throw dbError;
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký.', error: error.message });
    }
};

// --- 2. XÁC THỰC OTP (verifyOtp) ---
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
        await db.query("UPDATE tai_khoan SET email_xac_thuc_at = NOW(), trang_thai = 'active' WHERE email = $1", [email]);
        await db.query('DELETE FROM ma_xac_thuc WHERE email = $1', [email]);

        res.status(200).json({ message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// --- 3. ĐĂNG NHẬP (login) ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Lấy user VÀ role
        const result = await db.query('SELECT * FROM tai_khoan WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }
        // Kiểm tra tài khoản đã kích hoạt chưa (Optional nhưng nên có)
        if (user.trang_thai !== 'active' && !user.email_xac_thuc_at) {
             return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt. Vui lòng xác thực email.' });
        }

        const isMatch = await bcrypt.compare(password, user.mat_khau_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }
        
        // Tạo Payload cho Token
        const payload = { 
            user_id: user.user_id, 
            email: user.email, 
            role: user.role
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            accessToken: token,
            role: user.role, // Gửi kèm role về cho client
            userId: user.user_id // Gửi kèm userId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// --- 4. QUÊN MẬT KHẨU (forgotPassword) ---
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
            console.log(`[Forgot Password] Email ${email} không tồn tại. Trả về thành công giả.`);
            // Luôn trả về thành công để bảo mật
            return res.status(200).json({ message: 'Nếu email tồn tại, chúng tôi đã gửi mã OTP.' });
        }
        
        // 2. Tạo OTP
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const otp_hash = await bcrypt.hash(otp, otpSalt);
        const het_han_luc = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

        // 3. Lưu OTP
        const upsertOtpQuery = `
            INSERT INTO ma_xac_thuc (email, otp_hash, het_han_luc) VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, het_han_luc = EXCLUDED.het_han_luc, so_lan_thu_sai = 0;
        `;
        await db.query(upsertOtpQuery, [email, otp_hash, het_han_luc]);

        // 4. Gửi email OTP
        const subject = 'Mã xác thực tài khoản của bạn';
        const htmlBody = `<p>Mã OTP... <b>${otp}</b>...</p>`; // (Giữ nguyên nội dung HTML cũ của bạn)
        
        // Gửi mail nhưng không await kết quả để chặn luồng, hoặc await nhưng không throw error
        // Ở đây chúng ta await để đảm bảo gửi xong mới báo thành công
        const emailInfo = await sendEmail(email, subject, htmlBody);

        if (!emailInfo) {
            console.warn("Đăng ký thành công nhưng Gửi email thất bại.");
            // Bạn có thể chọn:
            // 1. Vẫn cho đăng ký thành công và báo user "Liên hệ admin để lấy OTP"
            // 2. Hoặc Rollback (như code cũ) nếu bắt buộc phải có email.
            
            // Ở đây tôi đề xuất giữ nguyên logic Rollback cũ nếu bạn muốn chặt chẽ:
            throw new Error("Không thể kết nối đến máy chủ Email (Timeout).");
        }

// --- 5. ĐẶT LẠI MẬT KHẨU (resetPassword) ---
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    try {
        // 1. Tìm OTP
        const result = await db.query('SELECT * FROM ma_xac_thuc WHERE email = $1', [email]);
        const verificationData = result.rows[0];

        if (!verificationData) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        if (verificationData.so_lan_thu_sai >= 3) {
            return res.status(400).json({ message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' });
        }
        if (new Date() > new Date(verificationData.het_han_luc)) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }

        // 2. So khớp OTP
        const isMatch = await bcrypt.compare(otp, verificationData.otp_hash);
        if (!isMatch) {
            await db.query('UPDATE ma_xac_thuc SET so_lan_thu_sai = so_lan_thu_sai + 1 WHERE email = $1', [email]);
            return res.status(400).json({ message: 'Mã OTP không chính xác.' });
        }

        // 3. Cập nhật mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const mat_khau_hash = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE tai_khoan SET mat_khau_hash = $1 WHERE email = $2', [mat_khau_hash, email]);

        // 4. Xóa OTP đã dùng
        await db.query('DELETE FROM ma_xac_thuc WHERE email = $1', [email]);

        res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công! Bây giờ bạn có thể đăng nhập.' });

    } catch (error) {
        console.error('[Reset Password] Lỗi server:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};