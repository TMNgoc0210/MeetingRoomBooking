/**
 * utils/notification.js — Helper tạo 1 dòng thông báo trong bảng Notification
 * ─────────────────────────────────────────────────────────────────────────
 * Được gọi từ các nơi phát sinh sự kiện cần báo cho user:
 *   - booking.controller.js: bookRoom (đặt phòng), approveBooking (duyệt),
 *     rejectBooking (từ chối), cancelBooking (huỷ)
 *   - reminder-cron.js: nhắc trước giờ họp
 *
 * Cách dùng: KHÔNG await khi gọi (fire-and-forget) — vì đây chỉ là tác vụ
 * phụ (ghi log thông báo), không được làm chậm hoặc làm fail response chính
 * của API (ví dụ: lỡ tạo thông báo lỗi thì việc đặt phòng vẫn phải thành công).
 * Đó là lý do try/catch ở đây tự nuốt lỗi (chỉ console.error) thay vì throw.
 *
 * type: 'booked' | 'approved' | 'rejected' | 'cancelled' | 'reminder'
 *   — FE (NotificationBell.jsx) dùng field này để chọn icon + màu hiển thị.
 */
const { execute } = require('../config/db');

async function createNotification({ userID, type, message, lineRoomID = null }) {
  try {
    await execute(
      `INSERT INTO Notification ("UserID","Type","Message","LineRoomID","CreateDate")
       VALUES (@userID, @type, @message, @lineRoomID, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
      { userID, type, message, lineRoomID }
    );
  } catch (e) {
    // Không throw — lỗi tạo thông báo không được làm hỏng luồng chính (đặt/duyệt/huỷ phòng)
    console.error('[Notification] create failed:', e.message);
  }
}

module.exports = { createNotification };
