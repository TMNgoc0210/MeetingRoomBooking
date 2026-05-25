const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

// Status constants
const STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3 };

/**
 * POST /api/bookings — đặt phòng
 * Phòng thường → Status=1 (Approved tự động)
 * Phòng VIP (IsVIP=1) → Status=0 (Pending, chờ admin duyệt)
 */
const bookRoom = async (req, res) => {
  try {
    const {
      userID, facultyID, roomID, timeStart, timeEnd,
      title, content, note, numberPerson,
      serviceRequest = null,    // yêu cầu dịch vụ (nước, đồ ăn nhẹ...)
      attendees = [],           // mảng userID được mời
      recurringType = null,     // 'daily'|'weekly'|'monthly'|null
      recurringEnd = null,      // ISO date string
    } = req.body;

    if (!userID || !roomID || !timeStart || !timeEnd || !title) {
      return badRequest(res, 'Thiếu thông tin bắt buộc');
    }
    if (timeStart >= timeEnd) {
      return badRequest(res, 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Xác định status dựa vào phòng có phải VIP không + điều kiện VIP
    const room = await queryOne(`SELECT IsVIP, VIPCondition, VIPMinutes FROM Room WHERE RoomID = @roomID`, { roomID: parseInt(roomID) });
    if (!room) return notFound(res, 'Không tìm thấy phòng');

    // Tính duration (phút) để so với VIPMinutes
    const durationMs = new Date(timeEnd) - new Date(timeStart);
    const durationMin = durationMs / 60000;

    let needApproval = false;
    if (room.IsVIP === 1) {
      if (room.VIPCondition === 0) {
        // Mọi cuộc họp đều cần duyệt
        needApproval = true;
      } else {
        // Chỉ cuộc họp vượt quá VIPMinutes
        needApproval = durationMin > (room.VIPMinutes || 60);
      }
    }
    const initialStatus = needApproval ? STATUS.PENDING : STATUS.APPROVED;

    // Tạo danh sách các slot cần insert (hỗ trợ recurring)
    const slots = buildSlots({ timeStart, timeEnd, recurringType, recurringEnd });

    // Kiểm tra conflict cho tất cả slots
    for (const slot of slots) {
      const conflict = await queryOne(
        `SELECT LineRoomID FROM LineRoom
         WHERE RoomID = @roomID AND Status != @cancelled
           AND TimeStart < @timeEnd AND TimeEnd > @timeStart`,
        { roomID: parseInt(roomID), cancelled: STATUS.CANCELLED, timeStart: slot.start, timeEnd: slot.end }
      );
      if (conflict) {
        return badRequest(res, `Phòng đã được đặt trong khung giờ ${slot.start} - ${slot.end}`);
      }
    }

    // Insert tất cả slots
    const recurringGroupID = slots.length > 1 ? Date.now() : null;
    const insertedIDs = [];

    for (const slot of slots) {
      const result = await execute(
        `INSERT INTO LineRoom
           (UserID, FacultyID, RoomID, TimeStart, TimeEnd, Title, Content, Note, ServiceRequest, NumberPerson, Status, RecurringGroupID, RecurringType, RecurringEnd, CreateDate)
         VALUES
           (@userID, @facultyID, @roomID, @timeStart, @timeEnd, @title, @content, @note, @serviceRequest, @numberPerson, @status, @recurringGroupID, @recurringType, @recurringEnd, datetime('now','localtime'))`,
        {
          userID,
          facultyID: parseInt(facultyID) || null,
          roomID: parseInt(roomID),
          timeStart: slot.start,
          timeEnd: slot.end,
          title,
          content: content || '',
          note: note || '',
          serviceRequest: serviceRequest || null,
          numberPerson: parseInt(numberPerson) || 1,
          status: initialStatus,
          recurringGroupID,
          recurringType: recurringType || null,
          recurringEnd: recurringEnd || null,
        }
      );

      const lineRoomID = result.lastInsertRowid;
      insertedIDs.push(lineRoomID);

      // Thêm attendees
      if (attendees.length > 0) {
        for (const aUserID of attendees) {
          if (aUserID === userID) continue;
          try {
            await execute(
              `INSERT OR IGNORE INTO BookingAttendee (LineRoomID, UserID, Status) VALUES (@lineRoomID, @aUserID, 0)`,
              { lineRoomID, aUserID }
            );
          } catch (_) { /* ignore duplicate */ }
        }
      }
    }

    const msg = needApproval
      ? `Đã gửi yêu cầu đặt phòng, chờ admin phê duyệt (${slots.length} lịch)`
      : `Đặt phòng thành công (${slots.length} lịch)`;

    return success(res, { lineRoomIDs: insertedIDs, status: initialStatus, needsApproval: needApproval }, msg, 201);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * PUT /api/bookings/:id — cập nhật lịch đặt
 */
const updateBooking = async (req, res) => {
  try {
    const { userID, facultyID, roomID, timeStart, timeEnd, title, content, note, numberPerson } = req.body;
    const lineRoomID = parseInt(req.params.id);

    const existing = await queryOne(`SELECT UserID, Status FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!existing) return notFound(res, 'Không tìm thấy lịch đặt');
    if (existing.Status === STATUS.CANCELLED) return badRequest(res, 'Không thể sửa lịch đã huỷ');

    if (!req.user.roles && req.user.userID !== existing.UserID) {
      return error(res, 'Không có quyền sửa lịch này', 403);
    }

    const conflict = await queryOne(
      `SELECT LineRoomID FROM LineRoom
       WHERE RoomID = @roomID AND LineRoomID != @lineRoomID
         AND Status != @cancelled
         AND TimeStart < @timeEnd AND TimeEnd > @timeStart`,
      { roomID: parseInt(roomID), lineRoomID, cancelled: STATUS.CANCELLED, timeStart, timeEnd }
    );
    if (conflict) return badRequest(res, 'Phòng đã được đặt trong khung giờ này');

    // Sửa → reset về Pending nếu phòng VIP
    const room = await queryOne(`SELECT IsVIP FROM Room WHERE RoomID = @roomID`, { roomID: parseInt(roomID) });
    const newStatus = room?.IsVIP ? STATUS.PENDING : STATUS.APPROVED;

    await execute(
      `UPDATE LineRoom SET
         UserID=@userID, FacultyID=@facultyID, RoomID=@roomID,
         TimeStart=@timeStart, TimeEnd=@timeEnd, Title=@title,
         Content=@content, Note=@note, NumberPerson=@numberPerson,
         Status=@status, ApprovedBy=NULL, ApprovedAt=NULL
       WHERE LineRoomID = @lineRoomID`,
      {
        userID, facultyID: parseInt(facultyID) || null, roomID: parseInt(roomID),
        timeStart, timeEnd, title,
        content: content || '', note: note || '',
        numberPerson: parseInt(numberPerson) || 1,
        status: newStatus, lineRoomID,
      }
    );

    return success(res, { status: newStatus }, 'Cập nhật lịch đặt phòng thành công');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * PUT /api/bookings/:id/approve — Admin duyệt lịch
 */
const approveBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const booking = await queryOne(`SELECT Status FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status !== STATUS.PENDING) return badRequest(res, 'Lịch này không ở trạng thái chờ duyệt');

    await execute(
      `UPDATE LineRoom SET Status=@status, ApprovedBy=@approvedBy, ApprovedAt=datetime('now','localtime')
       WHERE LineRoomID = @lineRoomID`,
      { status: STATUS.APPROVED, approvedBy: req.user.userID, lineRoomID }
    );
    return success(res, null, 'Đã phê duyệt lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * PUT /api/bookings/:id/reject — Admin từ chối lịch
 */
const rejectBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await queryOne(`SELECT Status FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status !== STATUS.PENDING) return badRequest(res, 'Lịch này không ở trạng thái chờ duyệt');

    if (!reason || !reason.trim()) return badRequest(res, 'Vui lòng nhập lý do từ chối');

    await execute(
      `UPDATE LineRoom SET Status=@status, ApprovedBy=@approvedBy, ApprovedAt=datetime('now','localtime'),
         RejectReason=@reason
       WHERE LineRoomID = @lineRoomID`,
      { status: STATUS.REJECTED, approvedBy: req.user.userID, reason: reason.trim(), lineRoomID }
    );
    return success(res, null, 'Đã từ chối lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * PUT /api/bookings/:id/cancel — Huỷ lịch (owner hoặc admin)
 */
const cancelBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const booking = await queryOne(`SELECT UserID, Status FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (booking.Status === STATUS.CANCELLED) return badRequest(res, 'Lịch đã bị huỷ rồi');
    if (!req.user.roles && req.user.userID !== booking.UserID) {
      return error(res, 'Không có quyền huỷ lịch này', 403);
    }

    await execute(
      `UPDATE LineRoom SET Status=@status WHERE LineRoomID = @lineRoomID`,
      { status: STATUS.CANCELLED, lineRoomID }
    );
    return success(res, null, 'Đã huỷ lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/bookings/pending — Danh sách lịch chờ duyệt (admin)
 */
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr.LineRoomID, lr.UserID, lr.RoomID, lr.TimeStart, lr.TimeEnd,
              lr.Title, lr.NumberPerson, lr.Status, lr.CreateDate,
              u.FullName AS UserName, u.Avatar AS UserAvatar,
              f.FacultyName,
              r.RoomName, r.IsVIP,
              a.AreaName
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr.UserID = u.UserID
       LEFT JOIN Faculty f ON lr.FacultyID = f.FacultyID
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE lr.Status = @pending
       ORDER BY lr.CreateDate DESC`,
      { pending: STATUS.PENDING }
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

// ─── Helper: tạo danh sách slots từ recurring settings ───────────────────────
function buildSlots({ timeStart, timeEnd, recurringType, recurringEnd }) {
  if (!recurringType || !recurringEnd) return [{ start: timeStart, end: timeEnd }];

  const slots = [];
  const endDate = new Date(recurringEnd);
  let current = new Date(timeStart);
  let currentEnd = new Date(timeEnd);
  const durationMs = currentEnd - current;

  while (current <= endDate) {
    slots.push({
      start: current.toISOString().slice(0, 16).replace('T', ' '),
      end: new Date(current.getTime() + durationMs).toISOString().slice(0, 16).replace('T', ' '),
    });

    if (recurringType === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (recurringType === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (recurringType === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      break;
    }

    if (slots.length > 52) break; // giới hạn tối đa 52 slots (1 năm weekly)
  }

  return slots;
}

module.exports = { bookRoom, updateBooking, approveBooking, rejectBooking, cancelBooking, getPendingBookings };
