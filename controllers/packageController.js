// controllers/packageController.js
const db = require('../config/db');

// Lấy tất cả gói tập
exports.getAllPackages = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM goi_tap ORDER BY goi_tap_id ASC');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy một gói tập theo ID
exports.getPackageById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM goi_tap WHERE goi_tap_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy gói tập.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tạo gói tập mới
exports.createPackage = async (req, res) => {
    const { ten, mo_ta } = req.body;
    if (!ten) {
        return res.status(400).json({ message: 'Tên gói tập là bắt buộc.' });
    }
    try {
        const query = 'INSERT INTO goi_tap (ten, mo_ta) VALUES ($1, $2) RETURNING *;';
        const { rows } = await db.query(query, [ten, mo_ta]);
        res.status(201).json({ message: 'Tạo gói tập thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật gói tập
exports.updatePackage = async (req, res) => {
    const { id } = req.params;
    const { ten, mo_ta } = req.body;
    if (!ten) {
        return res.status(400).json({ message: 'Tên gói tập là bắt buộc.' });
    }
    try {
        const query = 'UPDATE goi_tap SET ten = $1, mo_ta = $2 WHERE goi_tap_id = $3 RETURNING *;';
        const { rows } = await db.query(query, [ten, mo_ta, id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy gói tập để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật gói tập thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa gói tập
exports.deletePackage = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM goi_tap WHERE goi_tap_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy gói tập để xóa.' });
        }
        res.status(200).json({ message: 'Xóa gói tập thành công.' });
    } catch (error) {
        // Xử lý lỗi khóa ngoại nếu có thanh toán hoặc giá đang tham chiếu đến gói tập
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Không thể xóa gói tập vì vẫn còn dữ liệu liên quan (như giá hoặc thanh toán).' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};