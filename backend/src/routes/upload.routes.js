const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/upload.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const upload = require('../middleware/upload');

// POST /api/upload/image
router.post('/image', authMiddleware, adminOnly, upload.single('file'), uploadImage);

module.exports = router;
