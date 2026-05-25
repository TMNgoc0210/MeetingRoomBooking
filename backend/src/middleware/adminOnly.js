const { forbidden } = require('../utils/response');

/**
 * Middleware kiểm tra quyền Admin (Roles = true)
 * Phải dùng sau authMiddleware
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return forbidden(res, 'Chưa xác thực');
  }
  if (!req.user.roles) {
    return forbidden(res, 'Chỉ Admin mới có quyền thực hiện thao tác này');
  }
  next();
};

module.exports = adminOnly;
