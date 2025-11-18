// controllers/galleryController.js
const db = require('../config/db');

// Lấy tất cả ảnh
const getAllGalleryItems = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM the_van_anh ORDER BY the_id DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách gallery:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const createGalleryItem = async (req, res) => {
    const { ten_de, hinh_anh, mo_ta } = req.body;
    if (!ten_de || !hinh_anh) {
        return res.status(400).json({ message: 'Tiêu đề (ten_de) và đường dẫn hình ảnh (hinh_anh) là bắt buộc.' });
    }
    try {
        const query = 'INSERT INTO the_van_anh (ten_de, hinh_anh, mo_ta) VALUES ($1, $2, $3) RETURNING *;';
        const { rows } = await db.query(query, [ten_de, hinh_anh, mo_ta]);
        res.status(201).json({ message: 'Tạo mục ảnh thành công!', data: rows[0] });
    } catch (error) {
        console.error("Lỗi khi tạo mục gallery:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const getGalleryItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM the_van_anh WHERE the_id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mục ảnh.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Lỗi khi lấy Gallery Item ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const updateGalleryItem = async (req, res) => {
    const { id } = req.params;
    const { ten_de, hinh_anh, mo_ta } = req.body;
    if (!ten_de || !hinh_anh) {
        return res.status(400).json({ message: 'Tiêu đề và hình ảnh là bắt buộc.' });
    }
    try {
        const query = 'UPDATE the_van_anh SET ten_de = $1, hinh_anh = $2, mo_ta = $3 WHERE the_id = $4 RETURNING *;';
        const { rows } = await db.query(query, [ten_de, hinh_anh, mo_ta, id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mục ảnh để cập nhật.' });
        }
        res.status(200).json({ message: 'Cập nhật mục ảnh thành công!', data: rows[0] });
    } catch (error) {
        console.error(`Lỗi khi cập nhật Gallery Item ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const deleteGalleryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM the_van_anh WHERE the_id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mục ảnh để xóa.' });
        }
        res.status(200).json({ message: 'Xóa mục ảnh thành công.' });
    } catch (error) {
        console.error(`Lỗi khi xóa Gallery Item ID ${id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- EXPORT TẤT CẢ HÀM Ở CUỐI ---
module.exports = {
    getAllGalleryItems,
    createGalleryItem,
    getGalleryItemById,
    updateGalleryItem,
    deleteGalleryItem
};