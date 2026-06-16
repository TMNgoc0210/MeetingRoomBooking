const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');
const { sendBookingConfirmEmail, sendAttendeeInviteEmail, sendBookingStatusEmail } = require('../utils/email');

const STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3 };
const CANCEL_LIMIT = 5;

async function getMonthCancelCount(userID) {
  const row = await queryOne(
    `SELECT COUNT(*) AS cnt FROM LineRoom
     WHERE "UserID" = @userID AND "Status" = @cancelled
       AND "CancelledAt" IS NOT NULL
       AND EXTRACT(MONTH FROM "CancelledAt") = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM "CancelledAt")  = EXTRACT(YEAR FROM NOW())`,
    { userID, cancelled: STATUS.CANCELLED }
  );
  return row?.cnt ?? 0;
}

const bookRoom = async (req, res) => {
  try {
    const {
      userID, facultyID, roomID, timeStart, timeEnd,
      title, content, note, numberPerson,
      serviceRequest = null,
      attendees = [],
      recurringType = null,
      recurringEnd = null,
    } = req.body;

    if (!userID || !roomID || !timeStart || !timeEnd || !title)
      return badRequest(res, 'Thiếu thông tin bắt buộc');
    if (timeStart >= timeEnd)
      return badRequest(res, 'Thời gian kết thúc phải sau thời gian bắt đầu');

    // Chặn đặt phòng quá khứ — UTC+7 để tránh lệch múi giờ trên server Render (UTC)
    // Admin (roles=1) được miễn để nhập dữ liệu thủ công
    const nowVN = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
    if (!req.user.roles && timeStart <= nowVN)
      return badRequest(res, 'Không thể đặt phòng cho thời gian đã qua');

    if (!req.user.roles) {
      const cancelCount = await getMonthCancelCount(userID);
      if (cancelCount >= CANCEL_LIMIT)
        return error(res, `Tài khoản bị tạm khóa đặt phòng do đã huỷ ${cancelCount} lần trong tháng này (giới hạn ${CANCEL_LIMIT} lần).`, 403);
    }

    const room = await queryOne(
      `SELECT "IsVIP","VIPCondition","VIPMinutes" FROM Room WHERE "RoomID" = @roomID`,
      { roomID: parseInt(roomID) }
    );
    if (!room) return notFound(res, 'Không tìm thấy phòng');

    const durationMin = (new Date(timeEnd) - new Date(timeStart)) / 60000;
    let needApproval = false;
    if (room.IsVIP === 1) {
      needApproval = room.VIPCondition === 0 || durationMin > (room.VIPMinutes || 60);
    }
    const initialStatus = needApproval ? STATUS.PENDING : STATUS.APPROVED;

    const slots = buildSlots({ timeStart, timeEnd, recurringType, recurringEnd });

    for (const slot of slots) {
      const conflict = await queryOne(
        `SELECT "LineRoomID" FROM LineRoom
         WHERE "RoomID" = @roomID AND "Status" != @cancelled
           AND "TimeStart" < @timeEnd AND "TimeEnd" > @timeStart`,
        { roomID: parseInt(roomID), cancelled: STATUS.CANCELLED, timeStart: slot.start, timeEnd: slot.end }
      );
      if (conflict)
        return badRequest(res, `Phòng đã được đặt trong khung giờ ${slot.start} - ${slot.end}`);
    }

    const recurringGroupID = slots.length > 1 ? Date.now() : null;
    const insertedIDs = [];

    for (const slot of slots) {
      const result = await execute(
        `INSERT INTO LineRoom
           ("UserID","FacultyID","RoomID","TimeStart","TimeEnd",
            "Title","Content","Note","ServiceRequest","NumberPerson",
            "Status","RecurringGroupID","RecurringType","RecurringEnd","CreateDate")
         VALUES
           (@userID, @facultyID, @roomID, @timeStart, @timeEnd,
            @title, @content, @note, @serviceRequest, @numberPerson,
            @status, @recurringGroupID, @recurringType, @recurringEnd,
            TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
        {
          userID, facultyID: parseInt(facultyID) || null, roomID: parseInt(roomID),
          timeStart: slot.start, timeEnd: slot.end, title,
          content: content || '', note: note || '',
          serviceRequest: serviceRequest || null,
          numberPerson: parseInt(numberPerson) || 1,
          status: initialStatus, recurringGroupID,
          recurringType: recurringType || null, recurringEnd: recurringEnd || null,
        }
      );
      const lineRoomID = result.lastInsertRowid;
      insertedIDs.push(lineRoomID);

      if (attendees.length > 0) {
        for (const aUserID of attendees) {
          if (aUserID === userID) continue;
          try {
            await execute(
              `INSERT INTO BookingAttendee ("LineRoomID","UserID","Status")
               VALUES (@lineRoomID, @aUserID, 0)
               ON CONFLICT ("LineRoomID","UserID") DO NOTHING`,
              { lineRoomID, aUserID }
            );
          } catch (_) {}
        }
      }
    }

    const msg = needApproval
      ? `Đã gửi yêu cầu đặt phòng, chờ admin phê duyệt (${slots.length} lịch)`
      : `Đặt phòng thành công (${slots.length} lịch)`;

    if (attendees.length > 0) {
      queryOne(
        `SELECT u."FullName" AS "OrganizerName", r."RoomName", a."AreaName"
         FROM "User" u, Room r
         LEFT JOIN Area a ON r."AreaID" = a."AreaID"
         WHERE u."UserID" = @userID AND r."RoomID" = @roomID`,
        { userID, roomID: parseInt(roomID) }
      ).then(async info => {
        if (!info) return;
        for (const aUserID of attendees) {
          if (aUserID === userID) continue;
          try {
            const att = await queryOne(`SELECT "Email","FullName" FROM "User" WHERE "UserID" = @aUserID`, { aUserID });
            if (!att?.Email) continue;
            await sendAttendeeInviteEmail({ to: att.Email, name: att.FullName, organizer: info.OrganizerName, title, roomName: info.RoomName, areaName: info.AreaName, timeStart: slots[0].start, timeEnd: slots[0].end });
          } catch (e) { console.error('[InviteMail]', e.message); }
        }
      }).catch(() => {});
    }

    queryOne(
      `SELECT u."Email", u."FullName", r."RoomName", a."AreaName"
       FROM "User" u, Room r
       LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE u."UserID" = @userID AND r."RoomID" = @roomID`,
      { userID, roomID: parseInt(roomID) }
    ).then(info => {
      if (!info?.Email) return;
      sendBookingConfirmEmail({ to: info.Email, name: info.FullName, title, roomName: info.RoomName, areaName: info.AreaName, timeStart: slots[0].start, timeEnd: slots[0].end, status: initialStatus, totalSlots: slots.length }).catch(e => console.error('[BookingMail]', e.message));
    }).catch(() => {});

    return success(res, { lineRoomIDs: insertedIDs, status: initialStatus, needsApproval: needApproval }, msg, 201);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const updateBooking = async (req, res) => {
  try {
    const { userID, facultyID, roomID, timeStart, timeEnd, title, content, note, numberPerson } = req.body;
    const lineRoomID = parseInt(req.params.id);

    const existing = await queryOne(`SELECT "UserID","Status" FROM LineRoom WHERE "LineRoomID" = @lineRoomID`, { lineRoomID });
    if (!existing) return notFound(res, 'Không tìm thấy lịch đặt');
    if (existing.Status === STATUS.CANCELLED) return badRequest(res, 'Không thể sửa lịch đã huỷ');
    if (!req.user.roles && req.user.userID !== existing.UserID)
      return error(res, 'Không có quyền sửa lịch này', 403);

    const conflict = await queryOne(
      `SELECT "LineRoomID" FROM LineRoom
       WHERE "RoomID" = @roomID AND "LineRoomID" != @lineRoomID
         AND "Status" != @cancelled AND "TimeStart" < @timeEnd AND "TimeEnd" > @timeStart`,
      { roomID: parseInt(roomID), lineRoomID, cancelled: STATUS.CANCELLED, timeStart, timeEnd }
    );
    if (conflict) return badRequest(res, 'Phòng đã được đặt trong khung giờ này');

    const room = await queryOne(`SELECT "IsVIP" FROM Room WHERE "RoomID" = @roomID`, { roomID: parseInt(roomID) });
    const newStatus = room?.IsVIP ? STATUS.PENDING : STATUS.APPROVED;

    await execute(
      `UPDATE LineRoom SET
         "UserID"=@userID, "FacultyID"=@facultyID, "RoomID"=@roomID,
         "TimeStart"=@timeStart, "TimeEnd"=@timeEnd, "Title"=@title,
         "Content"=@content, "Note"=@note, "NumberPerson"=@numberPerson,
         "Status"=@status, "ApprovedBy"=NULL, "ApprovedAt"=NULL
       WHERE "LineRoomID" = @lineRoomID`,
      {
        userID, facultyID: parseInt(facultyID) || null, roomID: parseInt(roomID),
        timeStart, timeEnd, title, content: content || '', note: note || '',
        numberPerson: parseInt(numberPerson) || 1, status: newStatus, lineRoomID,
      }
    );
    return success(res, { status: newStatus }, 'Cập nhật lịch đặt phòng thành công');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const approveBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const booking = await queryOne(
      `SELECT lr."Status", lr."Title", lr."TimeStart", lr."TimeEnd", lr."UserID",
              u."Email", u."FullName", r."RoomName", a."AreaName"
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr."UserID" = u."UserID"
       LEFT JOIN Room r ON lr."RoomID" = r."RoomID"
       LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE lr."LineRoomID" = @lineRoomID`,
      { lineRoomID }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status !== STATUS.PENDING) return badRequest(res, 'Lịch này không ở trạng thái chờ duyệt');

    await execute(
      `UPDATE LineRoom SET
         "Status"=@status, "ApprovedBy"=@approvedBy,
         "ApprovedAt"=TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
       WHERE "LineRoomID" = @lineRoomID`,
      { status: STATUS.APPROVED, approvedBy: req.user.userID, lineRoomID }
    );

    if (booking.Email) {
      sendBookingStatusEmail({ to: booking.Email, name: booking.FullName, title: booking.Title, roomName: booking.RoomName, areaName: booking.AreaName, timeStart: booking.TimeStart, timeEnd: booking.TimeEnd, approved: true }).catch(e => console.error('[ApproveMail]', e.message));
    }
    return success(res, null, 'Đã phê duyệt lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const rejectBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await queryOne(
      `SELECT lr."Status", lr."Title", lr."TimeStart", lr."TimeEnd", lr."UserID",
              u."Email", u."FullName", r."RoomName", a."AreaName"
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr."UserID" = u."UserID"
       LEFT JOIN Room r ON lr."RoomID" = r."RoomID"
       LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE lr."LineRoomID" = @lineRoomID`,
      { lineRoomID }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status !== STATUS.PENDING) return badRequest(res, 'Lịch này không ở trạng thái chờ duyệt');
    if (!reason?.trim()) return badRequest(res, 'Vui lòng nhập lý do từ chối');

    await execute(
      `UPDATE LineRoom SET
         "Status"=@status, "ApprovedBy"=@approvedBy,
         "ApprovedAt"=TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
         "RejectReason"=@reason
       WHERE "LineRoomID" = @lineRoomID`,
      { status: STATUS.REJECTED, approvedBy: req.user.userID, reason: reason.trim(), lineRoomID }
    );

    if (booking.Email) {
      sendBookingStatusEmail({ to: booking.Email, name: booking.FullName, title: booking.Title, roomName: booking.RoomName, areaName: booking.AreaName, timeStart: booking.TimeStart, timeEnd: booking.TimeEnd, approved: false, rejectReason: reason.trim() }).catch(e => console.error('[RejectMail]', e.message));
    }
    return success(res, null, 'Đã từ chối lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const cancelBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const booking = await queryOne(
      `SELECT "UserID","Status","TimeStart" FROM LineRoom WHERE "LineRoomID" = @lineRoomID`,
      { lineRoomID }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status === STATUS.CANCELLED) return badRequest(res, 'Lịch đã bị huỷ rồi');
    if (!req.user.roles && req.user.userID !== booking.UserID)
      return error(res, 'Không có quyền huỷ lịch này', 403);

    if (!req.user.roles) {
      const hoursLeft = (new Date(booking.TimeStart) - new Date()) / 36e5;
      if (hoursLeft < 24) return badRequest(res, 'Chỉ có thể huỷ trước ít nhất 1 ngày trước giờ họp');
      const cancelCount = await getMonthCancelCount(booking.UserID);
      if (cancelCount >= CANCEL_LIMIT)
        return error(res, `Tài khoản bị tạm khóa đặt phòng do đã huỷ ${cancelCount} lần trong tháng này (giới hạn ${CANCEL_LIMIT} lần).`, 403);
    }

    await execute(
      `UPDATE LineRoom SET "Status"=@status, "CancelledAt"=NOW() WHERE "LineRoomID" = @lineRoomID`,
      { status: STATUS.CANCELLED, lineRoomID }
    );
    return success(res, null, 'Đã huỷ lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

const getPendingBookings = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr."LineRoomID", lr."UserID", lr."RoomID", lr."TimeStart", lr."TimeEnd",
              lr."Title", lr."NumberPerson", lr."Status", lr."CreateDate",
              u."FullName" AS "UserName", u."Avatar" AS "UserAvatar",
              f."FacultyName", r."RoomName", r."IsVIP", a."AreaName"
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr."UserID" = u."UserID"
       LEFT JOIN Faculty f ON lr."FacultyID" = f."FacultyID"
       LEFT JOIN Room r ON lr."RoomID" = r."RoomID"
       LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE lr."Status" = @pending
       ORDER BY lr."CreateDate" DESC`,
      { pending: STATUS.PENDING }
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

function buildSlots({ timeStart, timeEnd, recurringType, recurringEnd }) {
  if (!recurringType || !recurringEnd) return [{ start: timeStart, end: timeEnd }];
  const slots = [];
  const endDate = new Date(recurringEnd);
  let current = new Date(timeStart);
  const durationMs = new Date(timeEnd) - current;

  while (current <= endDate) {
    const slotEnd = new Date(current.getTime() + durationMs);
    slots.push({
      start: current.toISOString().slice(0, 16).replace('T', ' '),
      end:   slotEnd.toISOString().slice(0, 16).replace('T', ' '),
    });
    if (recurringType === 'daily')        current.setDate(current.getDate() + 1);
    else if (recurringType === 'weekly')  current.setDate(current.getDate() + 7);
    else if (recurringType === 'monthly') current.setMonth(current.getMonth() + 1);
    else break;
    if (slots.length > 52) break;
  }
  return slots;
}

module.exports = { bookRoom, updateBooking, approveBooking, rejectBooking, cancelBooking, getPendingBookings };
