// controllers/faqController.js
const db = require('../config/db');

// Lấy tất cả câu hỏi
const getAllFaqs = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM cau_hoi ORDER BY cau_hoi_id ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách FAQs:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const createFaq = async (req, res) => {
    const { cau_hoi, cau_tra_loi } = req.body;
    if (!cau_hoi || !cau_tra_loi) {
        return res.status(400).json({ message: 'Câu hỏi và câu trả lời là bắt buộc.' });
    }
    try {
        const query = 'INSERT INTO cau_hoi (cau_hoi, cau_tra_loi) VALUES ($1, $2) RETURNING *;';
        const { rows } = await db.query(query, [cau_hoi, cau_tra_loi]);
        res.status(201).json({ message: 'Tạo câu hỏi thành công!', data: rows[0] });
    } catch (error) {
        console.error("Lỗi khi tạo FAQ:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const getFaqById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM cau_hoi WHERE cau_hoi_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy câu hỏi.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Lỗi khi lấy FAQ ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const updateFaq = async (req, res) => {
    const { id } = req.params;
    const { cau_hoi, cau_tra_loi } = req.body;
    if (!cau_hoi || !cau_tra_loi) {
        return res.status(400).json({ message: 'Câu hỏi và câu trả lời là bắt buộc.' });
    }
    try {
        const query = 'UPDATE cau_hoi SET cau_hoi = $1, cau_tra_loi = $2 WHERE cau_hoi_id = $3 RETURNING *;';
        const { rows } = await db.query(query, [cau_hoi, cau_tra_loi, id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy câu hỏi để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật câu hỏi thành công!', data: rows[0] });
    } catch (error) {
        console.error(`Lỗi khi cập nhật FAQ ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const deleteFaq = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM cau_hoi WHERE cau_hoi_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy câu hỏi để xóa.' });
        }
        res.status(200).json({ message: 'Xóa câu hỏi thành công.' });
    } catch (error) {
        console.error(`Lỗi khi xóa FAQ ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- EXPORT TẤT CẢ HÀM Ở CUỐI ---
module.exports = {
    getAllFaqs,
    createFaq,
    getFaqById,
    updateFaq,
    deleteFaq
};