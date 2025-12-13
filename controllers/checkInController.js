// controllers/checkInController.js
const db = require('../config/db');

// @desc    Lấy thông tin check-in của khách hàng (Gói + Lịch hôm nay)
// @route   GET /api/check-in/customer/:khach_id
// @access  Private (Admin/Trainer)
const getCustomerCheckInInfo = async (req, res) => {
    const { khach_id } = req.params;

    try {
        // 1. Lấy thông tin cơ bản của khách
        const customerResult = await db.query('SELECT * FROM khach_hang WHERE khach_id = $1', [khach_id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }
        const customerInfo = customerResult.rows[0];

        // 2. Lấy các gói đang active
        const packages = await db.query(
            `SELECT gkh.*, g.ten AS ten_goi_tap 
             FROM goi_khach_hang gkh
             JOIN gia_goi_tap gt ON gkh.gia_id = gt.gia_id
             JOIN goi_tap g ON gt.goi_tap_id = g.goi_tap_id
             WHERE gkh.khach_id = $1 AND gkh.trang_thai = 'active'`,
            [khach_id]
        );

        // 3. Lấy các lịch hẹn HÔM NAY (chưa hoàn thành/hủy)
        const todayBookings = await db.query(
            `SELECT dl.*, hlv.ho_ten AS ten_hlv, dv.ten AS ten_dich_vu
             FROM dat_lich dl
             LEFT JOIN huan_luyen_vien hlv ON dl.hlv_id = hlv.hlv_id
             LEFT JOIN dich_vu dv ON dl.dich_vu_id = dv.dich_vu_id
             WHERE dl.khach_id = $1
               AND DATE(dl.thoi_gian) = CURRENT_DATE
               AND dl.trang_thai NOT IN ('hoan thanh', 'da huy')
            ORDER BY dl.thoi_gian ASC`,
            [khach_id]
        );

        res.status(200).json({
            customerInfo,
            activePackages: packages.rows,
            todayBookings: todayBookings.rows
        });

    } catch (error) {
        console.error("Lỗi khi lấy thông tin check-in:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
    const createWalkInTicket = async (req, res) => {
    // 1. Lấy dữ liệu
    const { ho_ten, so_dien_thoai, chi_nhanh_id, dich_vu_id, so_tien, phuong_thuc_tt } = req.body;

    // Validation cơ bản
    if (!ho_ten || !dich_vu_id || !chi_nhanh_id) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (Tên, Dịch vụ, Chi nhánh).' });
    }

    try {
        // Bắt đầu transaction (theo phong cách dự án của bạn)
        await db.query('BEGIN');

        // 2. Tìm hoặc Tạo khách hàng mới
        let khach_id;
        const checkKhach = await db.query('SELECT khach_id FROM khach_hang WHERE so_dien_thoai = $1', [so_dien_thoai]);
        
        if (checkKhach.rows.length > 0) {
            khach_id = checkKhach.rows[0].khach_id;
        } else {
            // Tạo khách mới (loại vãng lai)
            const newGuest = await db.query(
                `INSERT INTO khach_hang (ho_ten, so_dien_thoai, loai_thanh_vien, mat_khau) 
                 VALUES ($1, $2, 'vang_lai', 'guest123') RETURNING khach_id`,
                [ho_ten, so_dien_thoai || null]
            );
            khach_id = newGuest.rows[0].khach_id;
        }

        // 3. Ghi nhận Check-in
        await db.query(
            `INSERT INTO check_in (khach_id, chi_nhanh_id, dich_vu_id, thoi_gian_vao, trang_thai, loai_hinh)
             VALUES ($1, $2, $3, NOW(), 'dang_tap', 've_le')`,
            [khach_id, chi_nhanh_id, dich_vu_id]
        );

        // Hoàn tất
        await db.query('COMMIT');
        res.status(200).json({ message: 'Tạo vé & Check-in thành công!', khach_id: khach_id });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Lỗi khi tạo vé vãng lai:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getCustomerCheckInInfo,
    createWalkInTicket
};