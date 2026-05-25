const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/setting.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', getSettings);                            // public — ai cũng đọc được
router.put('/', authMiddleware, adminOnly, updateSettings); // admin only

module.exports = router;
