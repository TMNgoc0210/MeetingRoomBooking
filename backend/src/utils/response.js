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
