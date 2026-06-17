/**
 * utils/notification.js — Tạo thông báo trong app (chuông trên Navbar)
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
    console.error('[Notification] create failed:', e.message);
  }
}

module.exports = { createNotification };
