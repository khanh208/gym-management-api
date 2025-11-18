// controllers/branchController.js
const db = require('../config/db');

// Lấy tất cả chi nhánh
exports.getAllBranches = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM chi_nhanh ORDER BY chi_nhanh_id ASC');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy một chi nhánh theo ID
exports.getBranchById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM chi_nhanh WHERE chi_nhanh_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tạo chi nhánh mới
exports.createBranch = async (req, res) => {
    const { ten_chi_nhanh, dia_chi, so_dien_thoai, gio_mo_cua } = req.body;
    if (!ten_chi_nhanh || !dia_chi) {
        return res.status(400).json({ message: 'Tên chi nhánh và địa chỉ là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO chi_nhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, gio_mo_cua)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [ten_chi_nhanh, dia_chi, so_dien_thoai, gio_mo_cua]);
        res.status(201).json({ message: 'Tạo chi nhánh thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật chi nhánh
exports.updateBranch = async (req, res) => {
    const { id } = req.params;
    const { ten_chi_nhanh, dia_chi, so_dien_thoai, gio_mo_cua, trang_thai } = req.body;
    if (!ten_chi_nhanh || !dia_chi) {
        return res.status(400).json({ message: 'Tên chi nhánh và địa chỉ là bắt buộc.' });
    }
    try {
        const query = `
            UPDATE chi_nhanh
            SET ten_chi_nhanh = $1, dia_chi = $2, so_dien_thoai = $3, gio_mo_cua = $4, trang_thai = $5
            WHERE chi_nhanh_id = $6
            RETURNING *;
        `;
        const { rows } = await db.query(query, [ten_chi_nhanh, dia_chi, so_dien_thoai, gio_mo_cua, trang_thai, id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật chi nhánh thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa chi nhánh
exports.deleteBranch = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM chi_nhanh WHERE chi_nhanh_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh để xóa.' });
        }
        res.status(200).json({ message: 'Xóa chi nhánh thành công.' });
    } catch (error) {
        // Xử lý lỗi khóa ngoại (nếu có HLV hoặc dịch vụ đang tham chiếu đến chi nhánh này)
        if (error.code === '23503') { // Mã lỗi của PostgreSQL cho foreign key violation
            return res.status(400).json({ message: 'Không thể xóa chi nhánh vì vẫn còn dữ liệu liên quan (như huấn luyện viên hoặc dịch vụ).' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};