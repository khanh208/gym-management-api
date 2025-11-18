// controllers/contactController.js
const db = require('../config/db');

// Lấy tất cả yêu cầu liên hệ
exports.getAllContacts = async (req, res) => {
    try {
        // Câu lệnh SQL có đúng tên bảng và tên cột không?
        const { rows } = await db.query('SELECT * FROM yeu_cau_lien_he ORDER BY tao_luc DESC'); 
        res.status(200).json(rows);
    } catch (error) {
        // Log lỗi ra console backend để xem chi tiết
        console.error("Lỗi khi lấy danh sách liên hệ:", error); 
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tạo yêu cầu liên hệ mới
exports.createContact = async (req, res) => {
    const { ho_ten, email, so_dien_thoai, noi_dung } = req.body;
    if (!ho_ten || !email || !noi_dung) {
        return res.status(400).json({ message: 'Họ tên, email và nội dung là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO yeu_cau_lien_he (ho_ten, email, so_dien_thoai, noi_dung, trang_thai)
            VALUES ($1, $2, $3, $4, 'moi') RETURNING *;
        `;
        const { rows } = await db.query(query, [ho_ten, email, so_dien_thoai, noi_dung]);
        res.status(201).json({ message: 'Gửi yêu cầu liên hệ thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật trạng thái yêu cầu
exports.updateContactStatus = async (req, res) => {
    const { id } = req.params;
    const { trang_thai } = req.body; // VD: 'da xu ly'
    
    if (!trang_thai) {
        return res.status(400).json({ message: 'Trạng thái là bắt buộc.' });
    }
    
    try {
        const query = 'UPDATE yeu_cau_lien_he SET trang_thai = $1 WHERE yc_id = $2 RETURNING *;';
        const { rows } = await db.query(query, [trang_thai, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
        }
        res.status(200).json({ message: 'Cập nhật trạng thái thành công!', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa yêu cầu
exports.deleteContact = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM yeu_cau_lien_he WHERE yc_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu để xóa.' });
        }
        res.status(200).json({ message: 'Xóa yêu cầu thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
