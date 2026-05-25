const path = require('path');
const { success, error } = require('../utils/response');

/**
 * POST /api/upload/image
 * Multer đã xử lý file, chỉ cần trả về URL
 */
const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return error(res, 'Không có file được tải lên', 400);
    }
    const fileUrl = `/uploads/images/${req.file.filename}`;
    return success(res, { url: fileUrl }, 'Upload thành công');
  } catch (err) {
    return error(res, 'Lỗi upload', 500, err.message);
  }
};

module.exports = { uploadImage };
