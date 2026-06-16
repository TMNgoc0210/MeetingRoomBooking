/**
 * middleware/upload.js — Upload ảnh phòng họp (Multer)
 * ───────────────────────────────────────────────────────
 * Xử lý upload file ảnh từ admin khi thêm/sửa phòng.
 *
 * Cấu hình:
 *   Đích lưu   : backend/uploads/images/
 *   Tên file   : timestamp_<originalname> (tránh trùng tên)
 *   Loại file  : chỉ chấp nhận image/* (JPG, PNG, WebP...)
 *   Giới hạn   : 5MB
 *
 * Ảnh được serve công khai qua /uploads/images/<filename>
 * (không cần xác thực — ảnh phòng là thông tin công khai)
 *
 * File tài liệu (PDF/Word/Excel) dùng middleware riêng: uploadDocs.js
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
