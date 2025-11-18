// controllers/trainerServiceController.js
const db = require('../config/db');

// Gán một dịch vụ cho HLV
exports.assignServiceToTrainer = async (req, res) => {
    const { trainerId } = req.params;
    const { dich_vu_id } = req.body;

    if (!dich_vu_id) {
        return res.status(400).json({ message: 'dich_vu_id là bắt buộc.' });
    }
    try {
        const query = 'INSERT INTO hv_dv_bichnt (hlv_id, dich_vu_id) VALUES ($1, $2) RETURNING *;';
        const { rows } = await db.query(query, [trainerId, dich_vu_id]);
        res.status(201).json({ message: 'Gán dịch vụ cho HLV thành công!', data: rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Lỗi trùng lặp
            return res.status(409).json({ message: 'HLV này đã được gán dịch vụ này rồi.' });
        }
        if (error.code === '23503') { // Lỗi khóa ngoại
            return res.status(404).json({ message: 'Không tìm thấy HLV hoặc Dịch vụ.' });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa dịch vụ khỏi HLV
exports.removeServiceFromTrainer = async (req, res) => {
    const { trainerId, serviceId } = req.params;
    try {
        const { rowCount } = await db.query(
            'DELETE FROM hv_dv_bichnt WHERE hlv_id = $1 AND dich_vu_id = $2',
            [trainerId, serviceId]
        );
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy liên kết này để xóa.' });
        }
        res.status(200).json({ message: 'Xóa liên kết thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy tất cả dịch vụ của một HLV
exports.getServicesForTrainer = async (req, res) => {
    const { trainerId } = req.params;
    try {
        const query = `
            SELECT dv.* FROM dich_vu dv
            JOIN hv_dv_bichnt hdv ON dv.dich_vu_id = hdv.dich_vu_id
            WHERE hdv.hlv_id = $1;
        `;
        const { rows } = await db.query(query, [trainerId]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy tất cả HLV của một dịch vụ
exports.getTrainersForService = async (req, res) => {
    const { serviceId } = req.params;
    try {
        const query = `
            SELECT hlv.* FROM huan_luyen_vien hlv
            JOIN hv_dv_bichnt hdv ON hlv.hlv_id = hdv.hlv_id
            WHERE hdv.dich_vu_id = $1;
        `;
        const { rows } = await db.query(query, [serviceId]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};