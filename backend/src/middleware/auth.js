const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');

/**
 * Middleware xác thực JWT — bắt buộc đăng nhập
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return unauthorized(res, 'Không tìm thấy token xác thực');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userID, fullName, roles, avatar }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token đã hết hạn, vui lòng đăng nhập lại');
    }
    return unauthorized(res, 'Token không hợp lệ');
  }
};

/**
 * Middleware xác thực tùy chọn — không bắt buộc đăng nhập
 * Nếu có token hợp lệ thì gán req.user, không thì bỏ qua
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
