/**
 * notification.controller.js — API cho chuông thông báo (chỉ đọc/đánh dấu đã đọc)
 * ─────────────────────────────────────────────────────────────────────────
 * Việc TẠO thông báo không nằm ở đây — nó nằm rải rác trong booking.controller.js
 * và reminder-cron.js (gọi createNotification() từ utils/notification.js).
 * File này chỉ phục vụ việc user XEM lại thông báo của chính mình.
 *
 * 4 endpoint (xem notification.routes.js), tất cả đều lọc theo
 * "UserID" = req.user.userID (từ JWT) — user chỉ thấy thông báo của bản thân.
 */
const { query, execute } = require('../config/db');
const { success, error } = require('../utils/response');

// GET /api/notifications — lấy danh sách thông báo gần nhất (mặc định 20, tối đa 50)
const getMy = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const rows = await query(
      `SELECT "NotificationID","Type","Message","LineRoomID","IsRead","CreateDate"
       FROM Notification WHERE "UserID" = @userID
       ORDER BY "NotificationID" DESC LIMIT @limit`,
      { userID: req.user.userID, limit }
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

// GET /api/notifications/unread-count — chỉ trả số lượng, dùng để hiện badge đỏ
// trên icon chuông mà KHÔNG cần tải cả danh sách (đỡ tốn băng thông, poll mỗi 30s)
const getUnreadCount = async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM Notification WHERE "UserID" = @userID AND "IsRead" = 0`,
      { userID: req.user.userID }
    );
    // Number(...) bắt buộc — pg trả COUNT() dạng bigint/string, không phải number JS
    return success(res, { count: Number(rows[0]?.cnt || 0) });
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

// PUT /api/notifications/:id/read — đánh dấu 1 thông báo đã đọc (bấm vào item trong dropdown)
// "AND UserID = @userID" để chặn user A đánh dấu đọc thông báo của user B
const markRead = async (req, res) => {
  try {
    await execute(
      `UPDATE Notification SET "IsRead" = 1 WHERE "NotificationID" = @id AND "UserID" = @userID`,
      { id: parseInt(req.params.id), userID: req.user.userID }
    );
    return success(res, null, 'Đã đánh dấu đã đọc');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

// PUT /api/notifications/read-all — nút "Đánh dấu đã đọc hết" trong dropdown
const markAllRead = async (req, res) => {
  try {
    await execute(
      `UPDATE Notification SET "IsRead" = 1 WHERE "UserID" = @userID AND "IsRead" = 0`,
      { userID: req.user.userID }
    );
    return success(res, null, 'Đã đánh dấu tất cả đã đọc');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { getMy, getUnreadCount, markRead, markAllRead };
