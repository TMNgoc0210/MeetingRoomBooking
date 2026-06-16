/**
 * utils/response.js — Chuẩn hoá response trả về cho client
 * ─────────────────────────────────────────────────────────
 * Tất cả controller PHẢI dùng các hàm này thay vì gọi res.json() trực tiếp,
 * đảm bảo mọi response đều có format thống nhất: { success, message, data }
 *
 *   success(res, data, message, 200)  — thành công
 *   error(res, message, 500)          — lỗi server
 *   notFound(res, message)            — 404 không tìm thấy
 *   badRequest(res, message)          — 400 dữ liệu sai / thiếu
 *   unauthorized(res, message)        — 401 chưa đăng nhập / token hết hạn
 *   forbidden(res, message)           — 403 không đủ quyền
 */
const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV === 'development') {
    body.details = details;
  }
  return res.status(statusCode).json(body);
};

const notFound = (res, message = 'Không tìm thấy dữ liệu') => {
  return error(res, message, 404);
};

const badRequest = (res, message = 'Dữ liệu không hợp lệ') => {
  return error(res, message, 400);
};

const unauthorized = (res, message = 'Chưa đăng nhập hoặc phiên làm việc hết hạn') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Không có quyền thực hiện thao tác này') => {
  return error(res, message, 403);
};

module.exports = { success, error, notFound, badRequest, unauthorized, forbidden };
