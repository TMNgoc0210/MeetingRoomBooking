const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/upload.controller');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/upload/image — mọi user đã đăng nhập đều upload được ảnh đại diện
router.post('/image', authMiddleware, upload.single('file'), uploadImage);

module.exports = router;
