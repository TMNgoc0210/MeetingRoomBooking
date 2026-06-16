const { success, error } = require('../utils/response');

const uploadImage = (req, res) => {
  try {
    if (!req.file) return error(res, 'Không có file được tải lên', 400);
    // Cloudinary trả về URL đầy đủ trong req.file.path
    return success(res, { url: req.file.path }, 'Upload thành công');
  } catch (err) {
    return error(res, 'Lỗi upload', 500, err.message);
  }
};

module.exports = { uploadImage };
