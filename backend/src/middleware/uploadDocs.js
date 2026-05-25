const multer = require('multer');
const path = require('path');
const fs = require('fs');

const docsDir = path.join(__dirname, '../../uploads/docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|png|jpg|jpeg/;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED.test(ext)) cb(null, true);
  else cb(new Error('Định dạng file không được hỗ trợ'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
