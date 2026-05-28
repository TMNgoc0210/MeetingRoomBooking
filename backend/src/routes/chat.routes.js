const express = require('express');
const router = express.Router();
const { sendMessage, streamMessage, getHistory } = require('../controllers/chat.controller');
const { authMiddleware } = require('../middleware/auth');

router.post('/message', authMiddleware, sendMessage);
router.post('/stream',  authMiddleware, streamMessage);
router.get('/history',  authMiddleware, getHistory);

module.exports = router;
