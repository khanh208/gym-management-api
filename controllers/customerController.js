// controllers/customerController.js
const db = require('../config/db');

// --- LẤY TẤT CẢ KHÁCH HÀNG (Cho Admin) ---
const getAllCustomers = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM khach_hang ORDER BY khach_id ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy tất cả khách hàng:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY KHÁCH HÀNG THEO ID (Admin & Chính chủ) ---
const getCustomerById = async (req, res) => {
    const { id: customerIdToView } = req.params;
    const loggedInUser = req.user; // Lấy từ middleware 'protect'

    try {
        const query = 'SELECT * FROM khach_hang WHERE khach_id = $1';
        const { rows } = await db.query(query, [customerIdToView]);
        const customer = rows[0];

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }

        // Logic phân quyền: Admin hoặc chính chủ
        if (loggedInUser.role === 'customer' && customer.tai_khoan_id != loggedInUser.user_id) {
            return res.status(403).json({ message: 'Cấm! Bạn không có quyền xem hồ sơ của người khác.' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error(`Lỗi khi lấy khách hàng ID ${customerIdToView}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- TẠO KHÁCH HÀNG MỚI (Dùng nội bộ khi đăng ký) ---
const createCustomer = async (ho_ten, email, tai_khoan_id) => {
    try {
        const query = `
            INSERT INTO khach_hang (ho_ten, email, tai_khoan_id)
            VALUES ($1, $2, $3) RETURNING khach_id;
        `;
        const { rows } = await db.query(query, [ho_ten, email, tai_khoan_id]);
        return rows[0]; // Trả về hồ sơ khách hàng mới
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ khách hàng tự động:", error);
        throw error; // Ném lỗi để authController xử lý
    }
};

// --- CẬP NHẬT KHÁCH HÀNG (Admin & Chính chủ) ---
const updateCustomer = async (req, res) => {
    const { id: customerIdToUpdate } = req.params;
    const { ho_ten, email, so_dien_thoai } = req.body;
    const loggedInUser = req.user; // Lấy từ middleware 'protect'

    try {
        // Lấy hồ sơ khách hàng để kiểm tra quyền
        const customerResult = await db.query('SELECT tai_khoan_id FROM khach_hang WHERE khach_id = $1', [customerIdToUpdate]);
        const customer = customerResult.rows[0];

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }

        // Logic phân quyền: Admin hoặc chính chủ
        if (loggedInUser.role === 'customer' && customer.tai_khoan_id != loggedInUser.user_id) {
            return res.status(403).json({ message: 'Cấm! Bạn không có quyền cập nhật hồ sơ của người khác.' });
        }

        // Admin hoặc chính chủ thì được cập nhật
        const query = `
            UPDATE khach_hang
            SET ho_ten = $1, email = $2, so_dien_thoai = $3
            WHERE khach_id = $4 RETURNING *;
        `;
        const { rows } = await db.query(query, [ho_ten, email, so_dien_thoai, customerIdToUpdate]);
        
        res.status(200).json({ message: 'Cập nhật thông tin khách hàng thành công!', data: rows[0] });
    } catch (error) {
        console.error(`Lỗi khi cập nhật khách hàng ID ${customerIdToUpdate}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- XÓA KHÁCH HÀNG (Chỉ Admin) ---
const deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        // Cần xem xét xử lý các bảng liên quan trước khi xóa
        // VD: TRUNCATE TABLE goi_khach_hang CASCADE an toàn hơn
        
        const { rowCount } = await db.query('DELETE FROM khach_hang WHERE khach_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng để xóa.' });
        }
        res.status(200).json({ message: 'Xóa khách hàng thành công.' });
    } catch (error) {
        console.error(`Lỗi khi xóa khách hàng ID ${id}:`, error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Không thể xóa khách hàng vì vẫn còn dữ liệu liên quan (thanh toán, lịch hẹn...).' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY GÓI TẬP CỦA TÔI (Cho Customer) ---
const getMyPackages = async (req, res) => {
    const tai_khoan_id = req.user.user_id; // Lấy tài khoản ID từ token

    try {
        const customerResult = await db.query(
            'SELECT khach_id FROM khach_hang WHERE tai_khoan_id = $1',
            [tai_khoan_id]
        );
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ khách hàng.' });
        }
        const khach_id = customerResult.rows[0].khach_id;

        // JOIN 3 bảng để lấy đủ thông tin
        const packages = await db.query(
            `SELECT
                gkh.gkh_id,
                gkh.khach_id,
                gkh.ngay_kich_hoat,
                gkh.ngay_het_han,
                gkh.trang_thai,
                gkh.tong_so_buoi,
                gkh.so_buoi_da_tap,
                gt.thoi_han,
                gt.gia AS gia_goc_bang_gia,
                g.ten AS ten_goi_tap,
                tt.so_tien AS so_tien_thanh_toan,
                tt.ngay_tt AS ngay_thanh_toan
            FROM goi_khach_hang gkh
            JOIN gia_goi_tap gt ON gkh.gia_id = gt.gia_id
            JOIN goi_tap g ON gt.goi_tap_id = g.goi_tap_id
            JOIN thanh_toan tt ON gkh.thanh_toan_id = tt.tt_id
            WHERE gkh.khach_id = $1
            ORDER BY gkh.ngay_kich_hoat DESC`,
            [khach_id]
        );

        res.status(200).json(packages.rows);

    } catch (error) {
        console.error("Lỗi khi lấy gói tập của khách hàng:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy gói tập.' });
    }
};

// --- ĐĂNG KÝ GÓI THỬ MIỄN PHÍ (Cho Customer) ---
const registerFreeTrial = async (req, res) => {
    const { gia_id, ngay_kich_hoat } = req.body;
    const tai_khoan_id = req.user.user_id;

    if (!gia_id || !ngay_kich_hoat) {
        return res.status(400).json({ message: 'Vui lòng cung cấp ID gói giá và Ngày mong muốn kích hoạt.' });
    }
    if (new Date(ngay_kich_hoat) < new Date().setHours(0, 0, 0, 0)) {
         return res.status(400).json({ message: 'Ngày kích hoạt không thể là một ngày trong quá khứ.' });
    }

    const transaction = await db.query('BEGIN');
    try {
        // 1. Lấy khach_id
        const customerProfile = await db.query(
            'SELECT khach_id FROM khach_hang WHERE tai_khoan_id = $1',
            [tai_khoan_id]
        );
        if (customerProfile.rows.length === 0) {
            throw new Error('Không tìm thấy hồ sơ khách hàng.');
        }
        const khach_id = customerProfile.rows[0].khach_id;

        // 2. Lấy thông tin gói giá và KIỂM TRA
        const packageInfoResult = await db.query(
            `SELECT goi_tap_id, thoi_han, ca_buoi, gia FROM gia_goi_tap WHERE gia_id = $1`,
            [gia_id]
        );
        if (packageInfoResult.rows.length === 0) {
            throw new Error('Gói giá không tồn tại.');
        }
        
        const { goi_tap_id, thoi_han, ca_buoi, gia } = packageInfoResult.rows[0];
        
        if (parseFloat(gia) !== 0) {
            return res.status(400).json({ message: 'Đây không phải là gói tập miễn phí.' });
        }
        
        // Check 2: Khách hàng đã TỪNG DÙNG (active, pending, used, expired) gói này CHƯA?
        const existingTrial = await db.query(
            `SELECT 1 FROM goi_khach_hang 
             WHERE khach_id = $1 
               AND gia_id = $2
               AND trang_thai != 'cancelled'`, // Chỉ cấm nếu chưa bị Admin hủy (đã dùng hết/active/pending)
            [khach_id, gia_id]
        );
        if (existingTrial.rows.length > 0) {
            return res.status(400).json({ message: 'Bạn đã đăng ký hoặc đã sử dụng gói thử này rồi.' });
        }
        
        // 3. Tạo bản ghi thanh toán "giả" (0 VND)
        const insertPaymentResult = await db.query(
            `INSERT INTO thanh_toan (goi_tap_id, khach_id, so_tien, phuong_thuc, trang_thai, ngay_tt)
             VALUES ($1, $2, 0, 'free_trial', 'da thanh toan', NOW()) RETURNING tt_id`,
            [goi_tap_id, khach_id]
        );
        const tt_id = insertPaymentResult.rows[0].tt_id;

        // 4. Logic xếp hàng và kích hoạt
        let newPackageStatus = 'pending';
        let activationDate = new Date(ngay_kich_hoat);
        
        const activeCheck = await db.query(
            `SELECT ngay_het_han FROM goi_khach_hang 
             WHERE khach_id = $1 AND trang_thai = 'active' AND ngay_het_han IS NOT NULL
             ORDER BY ngay_het_han DESC LIMIT 1`,
            [khach_id]
        );

        if (activeCheck.rows.length > 0) {
            const lastExpiryDate = new Date(activeCheck.rows[0].ngay_het_han);
            if (activationDate <= lastExpiryDate) { 
                activationDate = new Date(lastExpiryDate.setDate(lastExpiryDate.getDate() + 1));
            }
        } else {
            if (activationDate <= new Date()) {
                activationDate = new Date();
                newPackageStatus = 'active';
            }
        }
        
        // 5. Tính toán ngày hết hạn
        let ngay_het_han = null;
        let tong_so_buoi = ca_buoi;
        if (thoi_han) {
            const parts = thoi_han.toLowerCase().split(' ');
            const value = parseInt(parts[0]);
            const unit = parts[1];
            if (!isNaN(value)) {
                ngay_het_han = new Date(activationDate);
                if (unit.includes('thang') || unit.includes('tháng')) {
                    ngay_het_han.setMonth(ngay_het_han.getMonth() + value);
                } else if (unit.includes('nam') || unit.includes('năm')) {
                    ngay_het_han.setFullYear(ngay_het_han.getFullYear() + value);
                } else if (unit.includes('ngay') || unit.includes('ngày')) {
                    ngay_het_han.setDate(ngay_het_han.getDate() + value);
                } else {
                    ngay_het_han = null;
                }
            }
        }
        
        // 6. INSERT vào bảng goi_khach_hang
        await db.query(
            `INSERT INTO goi_khach_hang (
                khach_id, gia_id, thanh_toan_id,
                tong_so_buoi, so_buoi_da_tap,
                ngay_kich_hoat, ngay_het_han, trang_thai
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [khach_id, gia_id, tt_id, tong_so_buoi, 0, activationDate, ngay_het_han, newPackageStatus]
        );

        await db.query('COMMIT');
        res.status(201).json({ message: 'Đăng ký gói thử thành công! Gói sẽ được kích hoạt vào ngày bạn chọn.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Lỗi khi đăng ký gói thử:", error);
        if (error.message.includes('Gói giá không tồn tại') || error.message.includes('Không tìm thấy hồ sơ')) {
             return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Lỗi server' });
    }
};

// --- EXPORT TẤT CẢ HÀM ---
module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getMyPackages,
    registerFreeTrial
};