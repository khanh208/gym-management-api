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

module.exports = {
    getCustomerCheckInInfo
};