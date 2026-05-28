const express = require('express');
const router = express.Router();
const { login, logout, getMe, refreshToken, register } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const cookieParser = require('cookie-parser');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.post('/refresh', refreshToken);

// GET /api/auth/login-logs?limit=50&status=failed — admin only
router.get('/login-logs', authMiddleware, adminOnly, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const status = req.query.status; // 'failed' | 'success' | undefined
    const rows = await query(
      `SELECT TOP (@limit) LogID, Username, IP, Status, Reason, CreatedAt
       FROM LoginLog
       ${status ? 'WHERE Status = @status' : ''}
       ORDER BY LogID DESC`,
      status ? { limit, status } : { limit }
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
});

module.exports = router;
