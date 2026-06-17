const express = require('express');
const router = express.Router();
const { getMy, getUnreadCount, markRead, markAllRead } = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getMy);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/read-all', authMiddleware, markAllRead);
router.put('/:id/read', authMiddleware, markRead);

module.exports = router;
