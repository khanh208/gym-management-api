// controllers/trainerController.js
const db = require('../config/db');

// --- LẤY TẤT CẢ HLV (kèm tên chi nhánh nếu có) ---
const getAllTrainers = async (req, res) => {
    try {
        const query = `
            SELECT hlv.*, cn.ten_chi_nhanh 
            FROM huan_luyen_vien hlv
            LEFT JOIN chi_nhanh cn ON hlv.chi_nhanh_id = cn.chi_nhanh_id
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
        const { rows } = await db.query('SELECT * FROM huan_luyen_vien WHERE hlv_id = $1', [id]);
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

// --- TẠO MỚI HLV ---
const createTrainer = async (req, res) => {
    const { chi_nhanh_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh } = req.body;
    if (!ho_ten) {
        return res.status(400).json({ message: 'Họ tên HLV là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO huan_luyen_vien (chi_nhanh_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        // Đảm bảo chi_nhanh_id là null nếu không được cung cấp hoặc rỗng
        const params = [chi_nhanh_id || null, ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh];
        const { rows } = await db.query(query, params);
        res.status(201).json({ message: 'Thêm HLV thành công!', data: rows[0] });
    } catch (error) {
        console.error("Lỗi khi tạo HLV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT THÔNG TIN HLV (Phân quyền Admin/Trainer) ---
const updateTrainer = async (req, res) => {
    const { id: hlvIdToUpdate } = req.params; // ID của HLV cần sửa
    const { chi_nhanh_id, ho_ten, mo_ta, chung_chi, kinh_nghiem, hinh_anh, trang_thai } = req.body;
    const loggedInUser = req.user; // Lấy từ middleware 'protect'

    try {
        let query = '';
        let params = [];

        if (loggedInUser.role === 'admin') {
            // == LOGIC ADMIN ==
            console.log(`[Admin Update] Admin ${loggedInUser.email} đang cập nhật HLV ID: ${hlvIdToUpdate}`);
            query = `
                UPDATE huan_luyen_vien
                SET chi_nhanh_id = $1, ho_ten = $2, mo_ta = $3, chung_chi = $4, kinh_nghiem = $5, hinh_anh = $6, trang_thai = $7
                WHERE hlv_id = $8 RETURNING *;
            `;
            // Đảm bảo chi_nhanh_id là null nếu rỗng
            params = [chi_nhanh_id || null, ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh, trang_thai || 'dang hoat dong', hlvIdToUpdate];

        } else if (loggedInUser.role === 'trainer') {
            // == LOGIC TRAINER ==
            console.log(`[Trainer Update] Trainer ${loggedInUser.email} đang cập nhật hồ sơ.`);
            const trainerProfile = await db.query('SELECT tai_khoan_id FROM huan_luyen_vien WHERE hlv_id = $1', [hlvIdToUpdate]);

            if (trainerProfile.rows.length === 0) {
                 return res.status(404).json({ message: 'Không tìm thấy hồ sơ HLV.' });
            }
            if (trainerProfile.rows[0].tai_khoan_id != loggedInUser.user_id) {
                return res.status(403).json({ message: 'Cấm! Bạn không có quyền cập nhật hồ sơ của HLV khác.' });
            }

            // HLV tự cập nhật hồ sơ (không được đổi chi nhánh, trạng thái)
            query = `
                UPDATE huan_luyen_vien
                SET ho_ten = $1, mo_ta = $2, chung_chi = $3, kinh_nghiem = $4, hinh_anh = $5
                WHERE hlv_id = $6 AND tai_khoan_id = $7 RETURNING *;
            `;
            params = [ho_ten, mo_ta, chung_chi, kinh_nghiem || 0, hinh_anh, hlvIdToUpdate, loggedInUser.user_id];
        } else {
             return res.status(403).json({ message: 'Không có quyền thực hiện hành động này.' });
        }

        // Chạy query
        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            // Điều này có thể xảy ra nếu ID không đúng, hoặc Trainer cố sửa khi liên kết tai_khoan_id sai
            return res.status(404).json({ message: 'Không tìm thấy HLV để cập nhật hoặc không có quyền.' });
        }
        res.status(200).json({ message: 'Cập nhật thông tin HLV thành công!', data: rows[0] });

    } catch (error) {
        console.error(`Lỗi khi cập nhật HLV ID ${hlvIdToUpdate}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- XÓA HLV (Chỉ Admin) ---
const deleteTrainer = async (req, res) => {
    const { id } = req.params;
    console.log(`[Delete Trainer] Nhận yêu cầu xóa ID: ${id}`);
    try {
        console.log(`[Delete Trainer] Chuẩn bị chạy query xóa ID: ${id}`);
        // Có thể cần xử lý các liên kết trước khi xóa (ví dụ: gán lại lịch hẹn, xóa liên kết dịch vụ)
        // await db.query('DELETE FROM hv_dv_bichnt WHERE hlv_id = $1', [id]); // Xóa liên kết dịch vụ
        // await db.query('UPDATE dat_lich SET hlv_id = NULL WHERE hlv_id = $1', [id]); // Gán lại lịch hẹn

        const { rowCount } = await db.query('DELETE FROM huan_luyen_vien WHERE hlv_id = $1', [id]);
        console.log(`[Delete Trainer] Query xóa hoàn tất, rowCount: ${rowCount}`);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy HLV để xóa.' });
        }
        res.status(200).json({ message: 'Xóa HLV thành công.' });
    } catch (error) {
        console.error(`[Delete Trainer] Lỗi khi xóa ID ${id}:`, error);
         // Xử lý lỗi khóa ngoại nếu vẫn còn liên kết chưa xử lý
        if (error.code === '23503') {
             return res.status(400).json({ message: 'Không thể xóa HLV vì vẫn còn dữ liệu liên quan (lịch hẹn, liên kết dịch vụ). Vui lòng xử lý các liên kết trước.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Export tất cả các hàm
module.exports = {
    getAllTrainers,
    getTrainerById,
    getTrainersByBranch,
    createTrainer,
    updateTrainer,
    deleteTrainer // <-- Chỉ có một hàm deleteTrainer
};