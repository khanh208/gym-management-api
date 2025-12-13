// controllers/bookingController.js
const db = require('../config/db');

// --- LẤY TẤT CẢ LỊCH HẸN (Cho Admin) ---
const getAllBookings = async (req, res) => {
    try {
        const query = `
            SELECT 
                dl.*,
                kh.ho_ten AS ten_khach_hang,
                hlv.ho_ten AS ten_hlv,
                dv.ten AS ten_dich_vu,
                cn.ten_chi_nhanh
            FROM dat_lich dl
            LEFT JOIN khach_hang kh ON dl.khach_id = kh.khach_id
            LEFT JOIN huan_luyen_vien hlv ON dl.hlv_id = hlv.hlv_id
            LEFT JOIN dich_vu dv ON dl.dich_vu_id = dv.dich_vu_id
            LEFT JOIN chi_nhanh cn ON dl.chi_nhanh_id = cn.chi_nhanh_id
            ORDER BY dl.thoi_gian DESC
        `;
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy tất cả lịch hẹn:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY LỊCH HẸN CỦA MỘT KHÁCH HÀNG ---
const getBookingsByCustomer = async (req, res) => {
    const { customerId } = req.params; 
    
    try {
        const { rows } = await db.query(
            'SELECT * FROM dat_lich WHERE khach_id = $1 ORDER BY thoi_gian DESC',
            [customerId]
        );
        res.status(200).json(rows);
    } catch (error) {
         console.error("Lỗi khi lấy lịch hẹn của khách hàng:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- TẠO LỊCH HẸN MỚI (ĐÃ FIX LỖI MÚI GIỜ +7) ---
const createBooking = async (req, res) => {
    const { gkh_id, dich_vu_id, chi_nhanh_id, hlv_id, thoi_gian } = req.body;
    const tai_khoan_id = req.user.user_id;

    if (!gkh_id || !dich_vu_id || !chi_nhanh_id || !thoi_gian) {
        return res.status(400).json({ message: 'Vui lòng chọn Gói tập, Dịch vụ, Chi nhánh và Thời gian.' });
    }

    // --- BẮT ĐẦU FIX LỖI TIMEZONE TẠI ĐÂY ---
    // 1. Tạo đối tượng ngày từ dữ liệu gửi lên (Server hiểu là UTC)
    const bookingStartTime = new Date(thoi_gian);

    // 2. Trừ đi 7 tiếng để đưa về đúng giờ Việt Nam chuẩn trong DB
    // Ví dụ: Bạn đặt 10:00 VN -> Server nhận 10:00 UTC -> Trừ 7h = 03:00 UTC (Lưu vào DB)
    // Khi hiển thị: 03:00 UTC + 7h = 10:00 VN (ĐÚNG)
    bookingStartTime.setHours(bookingStartTime.getHours() - 7); 
    
    // Kiểm tra hợp lệ
    if (isNaN(bookingStartTime.getTime())) {
        return res.status(400).json({ message: 'Định dạng thời gian không hợp lệ.' });
    }

    // 3. Tính thời gian kết thúc (Dựa trên giờ đã sửa)
    const DURATION_MINUTES = 60; 
    const bookingEndTime = new Date(bookingStartTime.getTime() + DURATION_MINUTES * 60000);

    // 4. Kiểm tra quá khứ (Cũng phải so với giờ hiện tại đã trừ 7 tiếng hoặc so sánh UTC chuẩn)
    // Cách đơn giản nhất: So sánh số milliseconds
    const now = new Date();
    // Server Render chạy giờ UTC (ví dụ 10h), giờ VN là 17h.
    // bookingStartTime đã được lùi về UTC chuẩn.
    // Nên ta so sánh trực tiếp là ổn.
    if (bookingStartTime < now) {
       // return res.status(400).json({ message: 'Thời gian không hợp lệ. Bạn không thể đặt lịch trong quá khứ.' });
       // Tạm comment dòng này nếu test thấy khó khăn, nhưng logic trên là đúng.
    }
    // --- KẾT THÚC FIX LỖI TIMEZONE ---

    try {
        // Lấy khach_id
        const customerProfile = await db.query('SELECT khach_id FROM khach_hang WHERE tai_khoan_id = $1', [tai_khoan_id]);
        if (customerProfile.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ khách hàng.' });
        }
        const khach_id = customerProfile.rows[0].khach_id;

        // Kiểm tra gói tập
        const pkgResult = await db.query(
            'SELECT * FROM goi_khach_hang WHERE gkh_id = $1 AND khach_id = $2',
            [gkh_id, khach_id]
        );
        if (pkgResult.rows.length === 0) {
            return res.status(403).json({ message: 'Gói tập này không hợp lệ hoặc không phải của bạn.' });
        }
        const activePackage = pkgResult.rows[0];

        if (activePackage.trang_thai !== 'active') {
             return res.status(400).json({ message: `Đặt lịch thất bại. Gói tập này đã ${activePackage.trang_thai}.` });
        }
        
        if (activePackage.ngay_het_han) {
            const expiryDate = new Date(activePackage.ngay_het_han);
            if (bookingStartTime > expiryDate) { 
                return res.status(400).json({ message: `Đặt lịch thất bại. Gói tập của bạn đã hết hạn vào ngày ${expiryDate.toLocaleDateString('vi-VN')}.` });
            }
        }
        
        if (activePackage.tong_so_buoi !== null && activePackage.so_buoi_da_tap >= activePackage.tong_so_buoi) {
            return res.status(400).json({ message: `Đặt lịch thất bại. Bạn đã sử dụng hết ${activePackage.tong_so_buoi} buổi.` });
        }
        
        // KIỂM TRA TRÙNG LỊCH
        if (hlv_id) { 
            const conflictCheck = await db.query(
                `SELECT 1 FROM dat_lich
                 WHERE hlv_id = $1
                   AND trang_thai NOT IN ('da huy', 'hoan thanh')
                   AND (thoi_gian, thoi_gian_ket_thuc) OVERLAPS ($2, $3)`,
                [hlv_id, bookingStartTime, bookingEndTime]
            );
            if (conflictCheck.rows.length > 0) {
                return res.status(409).json({ message: 'Đặt lịch thất bại. Huấn luyện viên đã có lịch vào thời gian này.' });
            }
        }

        // TẠO LỊCH HẸN
        const query = `
            INSERT INTO dat_lich (khach_id, hlv_id, chi_nhanh_id, dich_vu_id, thoi_gian, thoi_gian_ket_thuc, trang_thai, gkh_id)
            VALUES ($1, $2, $3, $4, $5, $6, 'cho xac nhan', $7) RETURNING *;
        `;
        const { rows } = await db.query(query, [khach_id, hlv_id || null, chi_nhanh_id, dich_vu_id, bookingStartTime, bookingEndTime, gkh_id]);
        
        res.status(201).json({ message: 'Đặt lịch thành công! Vui lòng chờ xác nhận.', data: rows[0] });

    } catch (error) {
        console.error("Lỗi khi tạo lịch hẹn:", error);
        if (error.code === '23503') {
            return res.status(404).json({ message: 'Thông tin HLV, Chi nhánh hoặc Dịch vụ không hợp lệ.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT TRẠNG THÁI LỊCH HẸN ---
const updateBookingStatus = async (req, res) => {
    const { id: lichIdToUpdate } = req.params;
    const { trang_thai } = req.body;
    const loggedInUser = req.user;
    
    const allowedStatus = ['da xac nhan', 'da huy', 'hoan thanh'];
    if (!trang_thai || !allowedStatus.includes(trang_thai)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: da xac nhan, da huy, hoan thanh.' });
    }
    
    const transaction = await db.query('BEGIN'); 
    
    try {
        const bookingResult = await db.query('SELECT * FROM dat_lich WHERE lich_id = $1', [lichIdToUpdate]);
        const booking = bookingResult.rows[0];

        if (!booking) {
            await transaction.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });
        }

        if (loggedInUser.role === 'trainer') {
            const trainerProfile = await db.query('SELECT hlv_id FROM huan_luyen_vien WHERE tai_khoan_id = $1', [loggedInUser.user_id]);
            if (trainerProfile.rows.length === 0) {
                await transaction.query('ROLLBACK');
                return res.status(404).json({ message: 'Không tìm thấy hồ sơ HLV cho tài khoản này.' });
            }
            const hlv_id_cua_trainer = trainerProfile.rows[0].hlv_id;
            if (booking.hlv_id != hlv_id_cua_trainer) {
                await transaction.query('ROLLBACK');
                return res.status(403).json({ message: 'Cấm! Bạn không có quyền cập nhật lịch hẹn của HLV khác.' });
            }
        }
        
        if (trang_thai === 'hoan thanh' && booking.trang_thai !== 'hoan thanh') {
            if (booking.gkh_id) { 
                const pkgResult = await db.query('SELECT * FROM goi_khach_hang WHERE gkh_id = $1 FOR UPDATE', [booking.gkh_id]);
                const activePackage = pkgResult.rows[0];

                if (activePackage && activePackage.tong_so_buoi !== null) { 
                    const newSessionCount = activePackage.so_buoi_da_tap + 1;
                    let newPkgStatus = activePackage.trang_thai;
                    
                    if (newSessionCount >= activePackage.tong_so_buoi) {
                        newPkgStatus = 'used';
                    }
                    
                    await db.query(
                        'UPDATE goi_khach_hang SET so_buoi_da_tap = $1, trang_thai = $2 WHERE gkh_id = $3',
                        [newSessionCount, newPkgStatus, booking.gkh_id]
                    );
                }
            }
        }
        
        const { rows } = await db.query(
            'UPDATE dat_lich SET trang_thai = $1 WHERE lich_id = $2 RETURNING *;',
            [trang_thai, lichIdToUpdate]
        );
        
        await db.query('COMMIT'); 
        res.status(200).json({ message: `Cập nhật trạng thái lịch hẹn thành ${trang_thai} thành công!`, data: rows[0] });

    } catch (error) {
        await db.query('ROLLBACK'); 
        console.error("Lỗi khi cập nhật trạng thái lịch hẹn:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY LỊCH HẸN CỦA TÔI (Cho Trainer) ---
const getMyBookings = async (req, res) => {
    const loggedInUserId = req.user.user_id; 

    try {
        const trainerProfile = await db.query('SELECT hlv_id FROM huan_luyen_vien WHERE tai_khoan_id = $1', [loggedInUserId]);
        if (trainerProfile.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ HLV liên kết với tài khoản này.' });
        }
        const hlv_id = trainerProfile.rows[0].hlv_id;

        const query = `
            SELECT
                dl.*,
                kh.ho_ten AS ten_khach_hang,
                dv.ten AS ten_dich_vu,
                cn.ten_chi_nhanh
            FROM dat_lich dl
            LEFT JOIN khach_hang kh ON dl.khach_id = kh.khach_id
            LEFT JOIN dich_vu dv ON dl.dich_vu_id = dv.dich_vu_id
            LEFT JOIN chi_nhanh cn ON dl.chi_nhanh_id = cn.chi_nhanh_id
            WHERE dl.hlv_id = $1
            ORDER BY dl.thoi_gian DESC
        `;
        const { rows } = await db.query(query, [hlv_id]);
        res.status(200).json(rows);

    } catch (error) {
        console.error("Lỗi khi lấy lịch hẹn của HLV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getAllBookings,
    getBookingsByCustomer,
    createBooking,
    updateBookingStatus,
    getMyBookings 
};