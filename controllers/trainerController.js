// controllers/trainerController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs'); // BẮT BUỘC: Phải có thư viện này để mã hóa mật khẩu

// --- LẤY TẤT CẢ HLV (kèm tên chi nhánh và email nếu có) ---
const getAllTrainers = async (req, res) => {
    try {
        const query = `
            SELECT hlv.*, cn.ten_chi_nhanh, tk.email
            FROM huan_luyen_vien hlv
            LEFT JOIN chi_nhanh cn ON hlv.chi_nhanh_id = cn.chi_nhanh_id
            LEFT JOIN tai_khoan tk ON hlv.tai_khoan_id = tk.user_id
            ORDER BY hlv.hlv_id ASC
        `;
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách HLV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY HLV THEO ID ---
const getTrainerById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(`
            SELECT hlv.*, tk.email 
            FROM huan_luyen_vien hlv
            LEFT JOIN tai_khoan tk ON hlv.tai_khoan_id = tk.user_id
            WHERE hlv.hlv_id = $1
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy huấn luyện viên.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Lỗi khi lấy HLV ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY DANH SÁCH HLV THEO CHI NHÁNH ---
const getTrainersByBranch = async (req, res) => {
    const { branchId } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM huan_luyen_vien WHERE chi_nhanh_id = $1 ORDER BY hlv_id ASC', [branchId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Lỗi khi lấy HLV cho chi nhánh ID ${branchId}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- TẠO MỚI HLV (QUAN TRỌNG: Tạo cả tài khoản) ---
const createTrainer = async (req, res) => {
    // 1. Nhận thêm email và password từ Frontend gửi lên
    const { chi_nhanh_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh, email, password } = req.body;

    // Validate dữ liệu bắt buộc
    if (!ho_ten || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu cho HLV.' });
    }

    try {
        // Bắt đầu Transaction (để đảm bảo tạo cả 2 bảng cùng lúc)
        await db.query('BEGIN');

        // 2. Kiểm tra Email đã tồn tại trong bảng tai_khoan chưa
        const userExists = await db.query('SELECT * FROM tai_khoan WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            await db.query('ROLLBACK');
            return res.status(409).json({ message: 'Email này đã được sử dụng.' });
        }

        // 3. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. INSERT vào bảng TAI_KHOAN (Tạo user để đăng nhập)
        const accountQuery = `
            INSERT INTO tai_khoan (ho_ten, email, mat_khau_hash, role, trang_thai, email_xac_thuc_at) 
            VALUES ($1, $2, $3, 'trainer', 'active', NOW()) 
            RETURNING user_id;
        `;
        const accountResult = await db.query(accountQuery, [ho_ten, email, hashedPassword]);
        const newUserId = accountResult.rows[0].user_id; // Lấy được ID tài khoản vừa tạo

        // 5. INSERT vào bảng HUAN_LUYEN_VIEN (Liên kết với tai_khoan_id)
        const trainerQuery = `
            INSERT INTO huan_luyen_vien (chi_nhanh_id, tai_khoan_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        // Chú ý tham số thứ 2 là newUserId
        const params = [chi_nhanh_id || null, newUserId, ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh];
        const trainerResult = await db.query(trainerQuery, params);

        // Lưu tất cả
        await db.query('COMMIT');

        res.status(201).json({ 
            message: 'Tạo HLV và tài khoản thành công!', 
            data: trainerResult.rows[0],
            account: { email: email, user_id: newUserId }
        });

    } catch (error) {
        await db.query('ROLLBACK'); // Hủy nếu có lỗi
        console.error("Lỗi khi tạo HLV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT THÔNG TIN HLV ---
const updateTrainer = async (req, res) => {
    const { id: hlvIdToUpdate } = req.params;
    const { chi_nhanh_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh, trang_thai } = req.body;
    const loggedInUser = req.user;

    try {
        let query = '';
        let params = [];

        if (loggedInUser.role === 'admin') {
            query = `
                UPDATE huan_luyen_vien
                SET chi_nhanh_id = $1, ho_ten = $2, mo_ta = $3, chung_chi = $4, kinh_nghiem = $5, hinh_anh = $6, trang_thai = $7
                WHERE hlv_id = $8 RETURNING *;
            `;
            params = [chi_nhanh_id || null, ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh, trang_thai || 'dang hoat dong', hlvIdToUpdate];
        } else if (loggedInUser.role === 'trainer') {
            const trainerProfile = await db.query('SELECT tai_khoan_id FROM huan_luyen_vien WHERE hlv_id = $1', [hlvIdToUpdate]);
            if (trainerProfile.rows.length === 0 || trainerProfile.rows[0].tai_khoan_id != loggedInUser.user_id) {
                return res.status(403).json({ message: 'Không có quyền cập nhật.' });
            }
            query = `
                UPDATE huan_luyen_vien
                SET ho_ten = $1, mo_ta = $2, chung_chi = $3, kinh_nghiem = $4, hinh_anh = $5
                WHERE hlv_id = $6 AND tai_khoan_id = $7 RETURNING *;
            `;
            params = [ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh, hlvIdToUpdate, loggedInUser.user_id];
        } else {
             return res.status(403).json({ message: 'Không có quyền.' });
        }

        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy HLV.' });
        }
        res.status(200).json({ message: 'Cập nhật thành công!', data: rows[0] });

    } catch (error) {
        console.error(`Lỗi cập nhật HLV ID ${hlvIdToUpdate}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- XÓA HLV ---
const deleteTrainer = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('BEGIN');

        // Lấy tai_khoan_id trước khi xóa
        const trainerInfo = await db.query('SELECT tai_khoan_id FROM huan_luyen_vien WHERE hlv_id = $1', [id]);
        
        if (trainerInfo.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy HLV để xóa.' });
        }
        
        const taiKhoanId = trainerInfo.rows[0].tai_khoan_id;

        // Xóa HLV
        await db.query('DELETE FROM huan_luyen_vien WHERE hlv_id = $1', [id]);

        // Xóa luôn tài khoản đăng nhập (nếu có)
        if (taiKhoanId) {
            await db.query('DELETE FROM tai_khoan WHERE user_id = $1', [taiKhoanId]);
        }

        await db.query('COMMIT');
        res.status(200).json({ message: 'Xóa HLV và tài khoản thành công.' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(`Lỗi xóa HLV ID ${id}:`, error);
        if (error.code === '23503') { // Lỗi khóa ngoại
             return res.status(400).json({ message: 'Không thể xóa HLV do còn dữ liệu liên quan.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getAllTrainers,
    getTrainerById,
    getTrainersByBranch,
    createTrainer,
    updateTrainer,
    deleteTrainer
};