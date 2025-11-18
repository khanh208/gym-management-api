// controllers/dashboardController.js
const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Tổng doanh thu (tính tổng tiền các giao dịch thành công)
        const revenueRes = await db.query(
            "SELECT SUM(so_tien) AS total FROM thanh_toan WHERE (trang_thai = 'da thanh toan' OR trang_thai = 'success') AND so_tien > 0"
        );
        const totalRevenue = revenueRes.rows[0].total || 0;

        // 2. Tổng số khách hàng
        const customerRes = await db.query("SELECT COUNT(*) AS count FROM khach_hang");
        const totalCustomers = customerRes.rows[0].count;

        // 3. Số gói tập đang hoạt động (Active)
        const activePkgRes = await db.query("SELECT COUNT(*) AS count FROM goi_khach_hang WHERE trang_thai = 'active'");
        const activePackages = activePkgRes.rows[0].count;

        // 4. Số lịch hẹn trong ngày hôm nay (cần xử lý/đang chờ)
        const todayBookingsRes = await db.query(
            "SELECT COUNT(*) AS count FROM dat_lich WHERE DATE(thoi_gian) = CURRENT_DATE AND trang_thai != 'da huy'"
        );
        const todayBookings = todayBookingsRes.rows[0].count;

        // 5. (Tùy chọn) Lấy 5 giao dịch gần nhất
        const recentPaymentsRes = await db.query(`
            SELECT tt.*, kh.ho_ten 
            FROM thanh_toan tt 
            JOIN khach_hang kh ON tt.khach_id = kh.khach_id 
            ORDER BY tt.ngay_tt DESC LIMIT 5
        `);

        res.status(200).json({
            totalRevenue,
            totalCustomers,
            activePackages,
            todayBookings,
            recentPayments: recentPaymentsRes.rows
        });

    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};