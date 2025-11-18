// controllers/pricingController.js
const db = require('../config/db');

// --- HÀM TÍNH GIÁ CUỐI CÙNG (Đã cập nhật) ---
const calculateFinalPrice = (priceData) => {
    const now = new Date();
    const giaGoc = parseFloat(priceData.gia);
    let finalPrice = giaGoc;
    
    const discount = priceData.giam_gia_phantram;
    const startDate = priceData.ngay_bat_dau;
    const endDate = priceData.ngay_ket_thuc;

    const isDiscountActive = discount > 0 &&
                             (!startDate || now >= new Date(startDate)) &&
                             (!endDate || now <= new Date(endDate));

    let discountedPrice = null;
    if (isDiscountActive) {
        finalPrice = giaGoc * (1 - discount / 100);
        discountedPrice = finalPrice; // Lưu giá đã giảm
    }
    
    // Trả về đầy đủ thông tin frontend cần
    return { 
        ...priceData, 
        gia_goc: giaGoc, // Giá gốc
        gia_khuyen_mai: discountedPrice, // Giá sau khi giảm (null nếu không giảm)
        gia_cuoi_cung: finalPrice // Giá cuối cùng (bằng giá gốc hoặc giá KM)
    };
};

// --- LẤY TẤT CẢ GIÁ (Đã cập nhật) ---
const getAllPricings = async (req, res) => {
    try {
        const query = `
            SELECT
                ggt.*,
                g.ten AS ten_goi_tap,
                g.mo_ta AS mo_ta_goi_tap, -- Lấy mô tả
                km.ten_khuyen_mai,
                km.giam_gia_phantram,
                km.ngay_bat_dau,
                km.ngay_ket_thuc
            FROM gia_goi_tap ggt
            LEFT JOIN goi_tap g ON ggt.goi_tap_id = g.goi_tap_id -- JOIN với goi_tap
            LEFT JOIN khuyen_mai km ON ggt.khuyen_mai_id = km.khuyen_mai_id
            -- Không thể ORDER BY gia_cuoi_cung ở đây vì nó chưa được tính
        `;
        const { rows } = await db.query(query);
        
        // Tính toán giá cuối
        let resultsWithFinalPrice = rows.map(calculateFinalPrice);
        
        // --- SẮP XẾP Ở ĐÂY ---
        // Sắp xếp sau khi đã tính toán gia_cuoi_cung
        resultsWithFinalPrice.sort((a, b) => a.gia_cuoi_cung - b.gia_cuoi_cung);
        
        res.status(200).json(resultsWithFinalPrice);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách giá (getAllPricings):", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- LẤY MỘT MỨC GIÁ THEO ID (Đã cập nhật) ---
const getPricingById = async (req, res) => {
    const { id } = req.params;
    try {
        // --- SỬA CÂU QUERY: Thêm JOIN với khuyen_mai ---
        const query = `
            SELECT 
                ggt.*, 
                g.ten AS ten_goi_tap, -- Đổi alias cho nhất quán
                g.mo_ta AS mo_ta_goi_tap, -- Đổi alias cho nhất quán
                km.ten_khuyen_mai,
                km.giam_gia_phantram,
                km.ngay_bat_dau,
                km.ngay_ket_thuc
            FROM gia_goi_tap ggt
            JOIN goi_tap g ON ggt.goi_tap_id = g.goi_tap_id
            LEFT JOIN khuyen_mai km ON ggt.khuyen_mai_id = km.khuyen_mai_id -- Thêm JOIN
            WHERE ggt.gia_id = $1
        `;
        // --- KẾT THÚC SỬA QUERY ---
        
        const { rows } = await db.query(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mức giá.' });
        }
        
        // Tính toán lại giá cuối cùng cho 1 gói
        const priceData = rows[0];
        // Truyền priceData vào hàm calculateFinalPrice
        const finalPriceData = calculateFinalPrice(priceData); 
        
        res.status(200).json(finalPriceData); // Trả về dữ liệu đã tính
    } catch (error) {
        console.error(`Lỗi khi lấy giá ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- TẠO MỨC GIÁ MỚI ---
const createPricing = async (req, res) => {
    const { goi_tap_id, gia, thoi_han, ca_buoi, khuyen_mai_id } = req.body; // Thêm ca_buoi
    if (!goi_tap_id || gia === undefined || gia === null) {
        return res.status(400).json({ message: 'ID gói tập và giá là bắt buộc.' });
    }
    try {
        const query = `
            INSERT INTO gia_goi_tap (goi_tap_id, gia, thoi_han, ca_buoi, khuyen_mai_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const params = [goi_tap_id, parseFloat(gia), thoi_han, ca_buoi || null, khuyen_mai_id || null];
        const { rows } = await db.query(query, params);
        res.status(201).json({ message: 'Tạo mức giá thành công!', data: rows[0] });
    } catch (error) {
         if (error.code === '23503') {
            return res.status(404).json({ message: 'Gói tập hoặc Khuyến mãi không tồn tại.' });
        }
        console.error("Lỗi khi tạo mức giá:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CẬP NHẬT MỨC GIÁ ---
const updatePricing = async (req, res) => {
    const { id } = req.params;
    const { goi_tap_id, gia, thoi_han, ca_buoi, khuyen_mai_id } = req.body; // Thêm ca_buoi
     if (!goi_tap_id || gia === undefined || gia === null) {
        return res.status(400).json({ message: 'ID gói tập và giá là bắt buộc.' });
    }
    try {
        const query = `
            UPDATE gia_goi_tap
            SET goi_tap_id = $1, gia = $2, thoi_han = $3, ca_buoi = $4, khuyen_mai_id = $5
            WHERE gia_id = $6 RETURNING *;
        `;
         const params = [goi_tap_id, parseFloat(gia), thoi_han, ca_buoi || null, khuyen_mai_id || null, id];
        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mức giá để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật mức giá thành công!', data: rows[0] });
    } catch (error) {
         if (error.code === '23503') {
            return res.status(404).json({ message: 'Gói tập hoặc Khuyến mãi không tồn tại.' });
        }
        console.error(`Lỗi khi cập nhật mức giá ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- XÓA MỨC GIÁ ---
const deletePricing = async (req, res) => {
    const { id } = req.params;
    try {
        // Cần đảm bảo không có goi_khach_hang nào đang tham chiếu đến gia_id này
        const { rowCount } = await db.query('DELETE FROM gia_goi_tap WHERE gia_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mức giá để xóa.' });
        }
        res.status(200).json({ message: 'Xóa mức giá thành công.' });
    } catch (error) {
        if (error.code === '23503') {
             return res.status(400).json({ message: 'Không thể xóa mức giá này vì đã có khách hàng mua.' });
        }
        console.error(`Lỗi khi xóa mức giá ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Export tất cả các hàm
module.exports = {
    getAllPricings,
    getPricingById,
    createPricing,
    updatePricing,
    deletePricing
};