const cron = require('node-cron');
const { query, execute } = require('../config/db');
const { sendReminderEmail } = require('./email');

// Nhắc trước bao nhiêu phút (default 60). Window ± 15 phút để cron 15 phút không bỏ sót.
const REMIND_BEFORE = parseInt(process.env.REMINDER_MINUTES_BEFORE) || 60;
const WINDOW = 15;

async function runReminder() {
  try {
    // Tìm các booking đã duyệt, chưa gửi nhắc, sắp diễn ra trong cửa sổ thời gian
    const upcoming = await query(
      `SELECT lr.LineRoomID, lr.UserID, lr.Title, lr.TimeStart, lr.TimeEnd,
              u.Email  AS OwnerEmail,  u.FullName  AS OwnerName,
              r.RoomName, a.AreaName
       FROM LineRoom lr
       JOIN [User]  u ON lr.UserID  = u.UserID
       JOIN Room    r ON lr.RoomID  = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE lr.Status       = 1
         AND lr.ReminderSent = 0
         AND lr.TimeStart >= CONVERT(NVARCHAR(20),DATEADD(MINUTE,${REMIND_BEFORE - WINDOW},GETDATE()),120)
         AND lr.TimeStart <  CONVERT(NVARCHAR(20),DATEADD(MINUTE,${REMIND_BEFORE + WINDOW},GETDATE()),120)`,
      {}
    );

    if (upcoming.length === 0) return;

    console.log(`[Reminder] Gửi nhắc cho ${upcoming.length} lịch họp...`);

    for (const booking of upcoming) {
      const minutesBefore = Math.round(
        (new Date(booking.TimeStart) - new Date()) / 60000
      );
      const emailOpts = {
        name: booking.OwnerName,
        title: booking.Title,
        roomName: booking.RoomName,
        areaName: booking.AreaName,
        timeStart: booking.TimeStart,
        timeEnd: booking.TimeEnd,
        minutesBefore: minutesBefore > 0 ? minutesBefore : REMIND_BEFORE,
      };

      // Gửi cho chủ lịch
      if (booking.OwnerEmail) {
        try {
          await sendReminderEmail({ to: booking.OwnerEmail, ...emailOpts });
        } catch (e) {
          console.error(`[Reminder] Lỗi gửi mail cho ${booking.OwnerEmail}:`, e.message);
        }
      }

      // Gửi cho danh sách attendees
      const attendees = await query(
        `SELECT u.Email, u.FullName
         FROM BookingAttendee ba
         JOIN [User] u ON ba.UserID = u.UserID
         WHERE ba.LineRoomID = @lineRoomID AND u.Email != '' AND u.Email IS NOT NULL`,
        { lineRoomID: booking.LineRoomID }
      );

      for (const att of attendees) {
        try {
          await sendReminderEmail({ to: att.Email, ...emailOpts, name: att.FullName });
        } catch (e) {
          console.error(`[Reminder] Lỗi gửi mail cho ${att.Email}:`, e.message);
        }
      }

      // Đánh dấu đã gửi
      await execute(
        `UPDATE LineRoom SET ReminderSent = 1 WHERE LineRoomID = @lineRoomID`,
        { lineRoomID: booking.LineRoomID }
      );

      console.log(`[Reminder] ✓ LineRoomID=${booking.LineRoomID} — "${booking.Title}"`);
    }
  } catch (err) {
    console.error('[Reminder] Cron error:', err.message);
  }
}

function startReminderCron() {
  // Chạy mỗi 15 phút
  cron.schedule('*/15 * * * *', runReminder);
  console.log(`📧 Email reminder cron started (nhắc trước ${REMIND_BEFORE} phút, mỗi 15 phút/lần)`);
}

module.exports = { startReminderCron };
