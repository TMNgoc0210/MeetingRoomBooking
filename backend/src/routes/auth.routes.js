const express = require('express');
const router = express.Router();
const { login, logout, getMe, refreshToken, register } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const cookieParser = require('cookie-parser');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.post('/refresh', refreshToken);

module.exports = router;
