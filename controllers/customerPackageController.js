// controllers/customerPackageController.js
const db = require('../config/db');

// --- LẤY TẤT CẢ GÓI CỦA TẤT CẢ KHÁCH HÀNG (Cho Admin) ---
const getAllCustomerPackages = async (req, res) => {
    try {
        // Câu query này JOIN nhiều bảng để lấy thông tin chi tiết
        const query = `
            SELECT
                gkh.gkh_id,
                gkh.trang_thai,
                gkh.ngay_kich_hoat,
                gkh.ngay_het_han,
                gkh.tong_so_buoi,
                gkh.so_buoi_da_tap,
                kh.ho_ten AS ten_khach_hang,
                g.ten AS ten_goi_tap,
                tt.so_tien AS so_tien_thanh_toan
            FROM goi_khach_hang gkh
            JOIN khach_hang kh ON gkh.khach_id = kh.khach_id
            JOIN gia_goi_tap gt ON gkh.gia_id = gt.gia_id
            JOIN goi_tap g ON gt.goi_tap_id = g.goi_tap_id
            JOIN thanh_toan tt ON gkh.thanh_toan_id = tt.tt_id
            ORDER BY gkh.ngay_kich_hoat DESC;
        `;
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy tất cả gói khách hàng:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT TRẠNG THÁI GÓI (Admin Hủy/Kích hoạt) ---
const updateCustomerPackageStatus = async (req, res) => {
    const { id } = req.params; // gkh_id
    const { trang_thai } = req.body;

    if (!trang_thai) {
        return res.status(400).json({ message: 'Trạng thái là bắt buộc.' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE goi_khach_hang SET trang_thai = $1 WHERE gkh_id = $2 RETURNING *',
            [trang_thai, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy gói của khách hàng.' });
        }
        res.status(200).json({ message: `Cập nhật trạng thái gói thành ${trang_thai} thành công!`, data: rows[0] });
    } catch (error) {
        console.error(`Lỗi khi cập nhật trạng thái gói ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Export các hàm
module.exports = {
    getAllCustomerPackages,
    updateCustomerPackageStatus
};