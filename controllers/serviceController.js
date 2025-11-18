// controllers/serviceController.js
const db = require('../config/db');

// Lấy tất cả dịch vụ (kèm tên chi nhánh)
exports.getAllServices = async (req, res) => {
    try {
        const query = `
            SELECT dv.*, cn.ten_chi_nhanh
            FROM dich_vu dv
            LEFT JOIN chi_nhanh cn ON dv.chi_nhanh_id = cn.chi_nhanh_id
            ORDER BY dv.dich_vu_id ASC
        `;
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy dịch vụ theo ID
exports.getServiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM dich_vu WHERE dich_vu_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tạo mới dịch vụ
exports.createService = async (req, res) => {
    const { chi_nhanh_id, ten, mo_ta } = req.body;
    if (!ten) {
        return res.status(400).json({ message: 'Tên dịch vụ là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO dich_vu (chi_nhanh_id, ten, mo_ta)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const { rows } = await db.query(query, [chi_nhanh_id, ten, mo_ta]);
        res.status(201).json({ message: 'Tạo dịch vụ thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật dịch vụ
exports.updateService = async (req, res) => {
    const { id } = req.params;
    const { chi_nhanh_id, ten, mo_ta, trang_thai } = req.body;
    try {
        const query = `
            UPDATE dich_vu
            SET chi_nhanh_id = $1, ten = $2, mo_ta = $3, trang_thai = $4
            WHERE dich_vu_id = $5 RETURNING *;
        `;
        const { rows } = await db.query(query, [chi_nhanh_id, ten, mo_ta, trang_thai, id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy dịch vụ để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật dịch vụ thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa dịch vụ
exports.deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM dich_vu WHERE dich_vu_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy dịch vụ để xóa.' });
        }
        res.status(200).json({ message: 'Xóa dịch vụ thành công.' });
    } catch (error) {
        // Xử lý lỗi khóa ngoại (nếu có lịch đặt hẹn đang tham chiếu đến dịch vụ này)
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Không thể xóa dịch vụ vì vẫn còn dữ liệu liên quan (như lịch đặt hẹn).' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};