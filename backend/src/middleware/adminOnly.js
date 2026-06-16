/**
 * middleware/adminOnly.js — Phân quyền Admin
 * ────────────────────────────────────────────
 * Dùng SAU authMiddleware trong chuỗi middleware của route.
 * Kiểm tra req.user.roles === 1 (User.Roles=1 trong DB = admin).
 * Nếu không phải admin → trả về 403 Forbidden.
 *
 * Cách dùng trong route:
 *   router.delete('/users/:id', authMiddleware, adminOnly, deleteUser)
 *
 * LƯU Ý: import là default export — KHÔNG destructure:
 *   ✅ const adminOnly = require('../middleware/adminOnly')
 *   ❌ const { adminOnly } = require('../middleware/adminOnly')  ← bị undefined
 */
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
