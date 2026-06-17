const { query, execute } = require('../config/db');
const { success, error } = require('../utils/response');

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

const getUnreadCount = async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM Notification WHERE "UserID" = @userID AND "IsRead" = 0`,
      { userID: req.user.userID }
    );
    return success(res, { count: Number(rows[0]?.cnt || 0) });
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

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
