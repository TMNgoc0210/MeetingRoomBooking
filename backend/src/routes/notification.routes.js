/**
 * notification.routes.js — mount tại /api/notifications (xem app.js)
 * Mọi route đều cần đăng nhập (authMiddleware) vì thông báo gắn với UserID cụ thể
 * (controller lấy req.user.userID từ JWT để chỉ trả/đánh dấu thông báo của chính mình).
 */
const express = require('express');
const router = express.Router();
const { getMy, getUnreadCount, markRead, markAllRead } = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getMy);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/read-all', authMiddleware, markAllRead);
router.put('/:id/read', authMiddleware, markRead);

module.exports = router;
