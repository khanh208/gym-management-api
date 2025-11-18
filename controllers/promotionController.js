// controllers/promotionController.js
const db = require('../config/db');

// --- TẠO KHUYẾN MÃI MỚI ---
const createPromotion = async (req, res) => {
    const { ten_khuyen_mai, mo_ta, giam_gia_phantram, ngay_bat_dau, ngay_ket_thuc } = req.body;
    if (!ten_khuyen_mai || giam_gia_phantram === undefined) { // Phải có tên và %
        return res.status(400).json({ message: 'Tên và phần trăm giảm giá là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO khuyen_mai (ten_khuyen_mai, mo_ta, giam_gia_phantram, ngay_bat_dau, ngay_ket_thuc)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const params = [ten_khuyen_mai, mo_ta, giam_gia_phantram, ngay_bat_dau || null, ngay_ket_thuc || null];
        const { rows } = await db.query(query, params);
        res.status(201).json({ message: 'Tạo chương trình khuyến mãi thành công!', data: rows[0] });
    } catch (error) {
        console.error("Lỗi khi tạo khuyến mãi:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY TẤT CẢ KHUYẾN MÃI ---
const getAllPromotions = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM khuyen_mai ORDER BY khuyen_mai_id DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách khuyến mãi:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY MỘT KHUYẾN MÃI THEO ID ---
const getPromotionById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM khuyen_mai WHERE khuyen_mai_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Lỗi khi lấy khuyến mãi ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT KHUYẾN MÃI ---
const updatePromotion = async (req, res) => {
    const { id } = req.params;
    const { ten_khuyen_mai, mo_ta, giam_gia_phantram, ngay_bat_dau, ngay_ket_thuc, trang_thai } = req.body;

    if (!ten_khuyen_mai || giam_gia_phantram === undefined) {
        return res.status(400).json({ message: 'Tên và phần trăm giảm giá là bắt buộc.' });
    }

    try {
        const query = `
            UPDATE khuyen_mai
            SET ten_khuyen_mai = $1, mo_ta = $2, giam_gia_phantram = $3, ngay_bat_dau = $4, ngay_ket_thuc = $5, trang_thai = $6
            WHERE khuyen_mai_id = $7 RETURNING *;
        `;
        const params = [ten_khuyen_mai, mo_ta, giam_gia_phantram, ngay_bat_dau || null, ngay_ket_thuc || null, trang_thai || 'dang dien ra', id];
        const { rows } = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật khuyến mãi thành công!', data: rows[0] });
    } catch (error) {
        console.error(`Lỗi khi cập nhật khuyến mãi ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- XÓA KHUYẾN MÃI ---
const deletePromotion = async (req, res) => {
    const { id } = req.params;
    try {
        // Trước khi xóa, có thể cần cập nhật khuyen_mai_id = NULL trong gia_goi_tap
        // Hoặc để database tự xử lý (SET NULL) nếu bạn đã cài đặt ON DELETE SET NULL
        // Ví dụ: await db.query('UPDATE gia_goi_tap SET khuyen_mai_id = NULL WHERE khuyen_mai_id = $1', [id]);

        const { rowCount } = await db.query('DELETE FROM khuyen_mai WHERE khuyen_mai_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi để xóa.' });
        }
        res.status(200).json({ message: 'Xóa khuyến mãi thành công.' });
    } catch (error) {
         // Xử lý lỗi khóa ngoại nếu vẫn còn giá tham chiếu và chưa SET NULL
        if (error.code === '23503') {
             return res.status(400).json({ message: 'Không thể xóa khuyến mãi vì vẫn còn mức giá đang áp dụng.' });
        }
        console.error(`Lỗi khi xóa khuyến mãi ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};


// Export tất cả các hàm
module.exports = {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion // <-- Đảm bảo đã export hàm xóa
};