const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound } = require('../utils/response');

/**
 * GET /api/linerooms/room/:roomId — lịch đặt theo phòng (bao gồm attendees)
 */
const getByRoom = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr.LineRoomID, lr.UserID, lr.FacultyID, lr.RoomID,
              lr.TimeStart, lr.TimeEnd, lr.Title, lr.Content, lr.Note, lr.NumberPerson,
              lr.Status, lr.ApprovedBy, lr.ApprovedAt, lr.CreateDate,
              lr.RecurringGroupID, lr.RecurringType,
              u.FullName AS UserName, u.Avatar AS UserAvatar,
              f.FacultyName,
              r.RoomName, r.IsVIP
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr.UserID = u.UserID
       LEFT JOIN Faculty f ON lr.FacultyID = f.FacultyID
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       WHERE lr.RoomID = @roomID AND lr.Status != 3
       ORDER BY lr.TimeStart`,
      { roomID: parseInt(req.params.roomId) }
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/linerooms/my — lịch đặt của user hiện tại
 */
const getMyBookings = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr.LineRoomID, lr.RoomID, lr.TimeStart, lr.TimeEnd, lr.Title,
              lr.NumberPerson, lr.Status, lr.CreateDate,
              r.RoomName, r.Avatar AS RoomAvatar, r.IsVIP,
              a.AreaName
       FROM LineRoom lr
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE lr.UserID = @userID
       ORDER BY lr.TimeStart DESC
       LIMIT 50`,
      { userID: req.user.userID }
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/linerooms/:id — chi tiết lịch đặt (kèm attendees)
 */
const getDetail = async (req, res) => {
  try {
    const booking = await queryOne(
      `SELECT lr.LineRoomID, lr.UserID, lr.FacultyID, lr.RoomID,
              lr.TimeStart, lr.TimeEnd, lr.Title, lr.Content, lr.Note, lr.ServiceRequest, lr.NumberPerson,
              lr.Status, lr.ApprovedBy, lr.ApprovedAt, lr.RejectReason, lr.CreateDate,
              lr.RecurringGroupID, lr.RecurringType, lr.RecurringEnd,
              u.FullName AS UserName, u.Avatar AS UserAvatar, u.Email, u.Mobi,
              f.FacultyName,
              r.RoomName, r.Seat, r.PhoneCall, r.VideoCall, r.Avatar AS RoomAvatar, r.IsVIP,
              a.AreaName
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr.UserID = u.UserID
       LEFT JOIN Faculty f ON lr.FacultyID = f.FacultyID
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE lr.LineRoomID = @lineRoomID`,
      { lineRoomID: parseInt(req.params.id) }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');

    // Lấy danh sách attendees
    const attendees = await query(
      `SELECT ba.AttendeeID, ba.UserID, ba.Status, ba.InvitedAt,
              u.FullName, u.Avatar, u.Email
       FROM BookingAttendee ba
       LEFT JOIN "User" u ON ba.UserID = u.UserID
       WHERE ba.LineRoomID = @lineRoomID`,
      { lineRoomID: parseInt(req.params.id) }
    );

    return success(res, { ...booking, attendees });
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/linerooms/:id/edit — lấy data để chỉnh sửa
 */
const getForEdit = async (req, res) => {
  try {
    const booking = await queryOne(
      `SELECT lr.LineRoomID, lr.UserID, lr.FacultyID, lr.RoomID,
              lr.TimeStart, lr.TimeEnd, lr.Title, lr.Content, lr.Note, lr.NumberPerson, lr.Status
       FROM LineRoom lr
       WHERE lr.LineRoomID = @lineRoomID`,
      { lineRoomID: parseInt(req.params.id) }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (!req.user.roles && req.user.userID !== booking.UserID) {
      return error(res, 'Không có quyền chỉnh sửa lịch này', 403);
    }
    return success(res, booking);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * DELETE /api/linerooms/:id — xoá lịch đặt
 */
const deleteBooking = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const booking = await queryOne(
      `SELECT UserID FROM LineRoom WHERE LineRoomID = @lineRoomID`,
      { lineRoomID }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (!req.user.roles && req.user.userID !== booking.UserID) {
      return error(res, 'Không có quyền xoá lịch này', 403);
    }
    await execute(`DELETE FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    return success(res, null, 'Đã xoá lịch đặt phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * POST /api/linerooms/:id/attendees — thêm người tham dự
 */
const addAttendees = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const { userIDs = [] } = req.body;

    const booking = await queryOne(`SELECT UserID FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (!req.user.roles && req.user.userID !== booking.UserID) {
      return error(res, 'Không có quyền chỉnh sửa', 403);
    }

    let added = 0;
    for (const uid of userIDs) {
      try {
        await execute(
          `INSERT OR IGNORE INTO BookingAttendee (LineRoomID, UserID, Status) VALUES (@lineRoomID, @uid, 0)`,
          { lineRoomID, uid }
        );
        added++;
      } catch (_) { /* ignore */ }
    }
    return success(res, { added }, `Đã mời ${added} người tham dự`);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * DELETE /api/linerooms/:id/attendees/:userID — xoá người tham dự
 */
const removeAttendee = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    const { userID } = req.params;
    const booking = await queryOne(`SELECT UserID FROM LineRoom WHERE LineRoomID = @lineRoomID`, { lineRoomID });
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (!req.user.roles && req.user.userID !== booking.UserID) {
      return error(res, 'Không có quyền chỉnh sửa', 403);
    }
    await execute(
      `DELETE FROM BookingAttendee WHERE LineRoomID = @lineRoomID AND UserID = @userID`,
      { lineRoomID, userID }
    );
    return success(res, null, 'Đã xoá người tham dự');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/linerooms/area/:areaId — lịch đặt của tất cả phòng trong khu vực
 */
const getByArea = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr.LineRoomID, lr.UserID, lr.FacultyID, lr.RoomID,
              lr.TimeStart, lr.TimeEnd, lr.Title, lr.Content, lr.Note, lr.NumberPerson,
              lr.Status, lr.ApprovedBy, lr.ApprovedAt, lr.CreateDate,
              lr.RecurringGroupID, lr.RecurringType,
              u.FullName AS UserName, u.Avatar AS UserAvatar,
              f.FacultyName,
              r.RoomName, r.IsVIP,
              a.AreaName
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr.UserID = u.UserID
       LEFT JOIN Faculty f ON lr.FacultyID = f.FacultyID
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE r.AreaID = @areaID AND lr.Status != 3
       ORDER BY lr.TimeStart`,
      { areaID: parseInt(req.params.areaId) }
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/linerooms/all — lịch đặt của tất cả phòng
 */
const getAllBookings = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT lr.LineRoomID, lr.UserID, lr.FacultyID, lr.RoomID,
              lr.TimeStart, lr.TimeEnd, lr.Title, lr.Content, lr.Note, lr.NumberPerson,
              lr.Status, lr.ApprovedBy, lr.ApprovedAt, lr.CreateDate,
              lr.RecurringGroupID, lr.RecurringType,
              u.FullName AS UserName, u.Avatar AS UserAvatar,
              f.FacultyName,
              r.RoomName, r.IsVIP,
              a.AreaName
       FROM LineRoom lr
       LEFT JOIN "User" u ON lr.UserID = u.UserID
       LEFT JOIN Faculty f ON lr.FacultyID = f.FacultyID
       LEFT JOIN Room r ON lr.RoomID = r.RoomID
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE lr.Status != 3
       ORDER BY lr.TimeStart`,
      {}
    );
    return success(res, bookings);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = {
  getByRoom, getByArea, getAllBookings,
  getMyBookings, getDetail, getForEdit,
  deleteBooking, addAttendees, removeAttendee,
};
