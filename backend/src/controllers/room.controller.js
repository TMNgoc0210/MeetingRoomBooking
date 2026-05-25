const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

/**
 * GET /api/rooms — danh sách phòng visible
 */
const getListRoom = async (req, res) => {
  try {
    const rooms = await query(
      `SELECT r.RoomID, r.RoomName, r.AreaID, r.Seat, r.PhoneCall, r.VideoCall, r.IsVIP,
              r.VIPCondition, r.VIPMinutes, r.Visible, r.Desc, r.Avatar, r.CreateBy,
              a.AreaName
       FROM Room r
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE r.Visible = 1
       ORDER BY r.RoomName`
    );
    return success(res, rooms);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/rooms/all — tất cả phòng (admin)
 */
const getAllRoom = async (req, res) => {
  try {
    const rooms = await query(
      `SELECT r.RoomID, r.RoomName, r.AreaID, r.Seat, r.PhoneCall, r.VideoCall, r.IsVIP,
              r.VIPCondition, r.VIPMinutes, r.Visible, r.Desc, r.Avatar, r.CreateBy,
              a.AreaName
       FROM Room r
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       ORDER BY r.RoomName`
    );
    return success(res, rooms);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/rooms/:id — chi tiết phòng
 */
const getDetailRoom = async (req, res) => {
  try {
    const room = await queryOne(
      `SELECT r.RoomID, r.RoomName, r.AreaID, r.Seat, r.PhoneCall, r.VideoCall, r.IsVIP,
              r.VIPCondition, r.VIPMinutes, r.Visible, r.Desc, r.Avatar, r.CreateBy,
              a.AreaName
       FROM Room r
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE r.RoomID = @roomID`,
      { roomID: parseInt(req.params.id) }
    );
    if (!room) return notFound(res, 'Không tìm thấy phòng');
    return success(res, room);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/rooms/area/:areaId — phòng theo khu vực
 */
const getRoomsByArea = async (req, res) => {
  try {
    const rooms = await query(
      `SELECT r.RoomID, r.RoomName, r.Seat, r.PhoneCall, r.VideoCall, r.Avatar
       FROM Room r
       WHERE r.AreaID = @areaID AND r.Visible = 1
       ORDER BY r.RoomName`,
      { areaID: parseInt(req.params.areaId) }
    );
    return success(res, rooms);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/rooms/search?roomName=&areaID= — tìm kiếm phòng visible
 */
const searchRoom = async (req, res) => {
  try {
    const { roomName, areaID } = req.query;
    let sql = `
      SELECT r.RoomID, r.RoomName, r.AreaID, r.Seat, r.PhoneCall, r.VideoCall, r.IsVIP,
             r.VIPCondition, r.VIPMinutes, r.Visible, r.Desc, r.Avatar, a.AreaName
      FROM Room r
      LEFT JOIN Area a ON r.AreaID = a.AreaID
      WHERE r.Visible = 1
    `;
    const params = {};

    if (roomName) {
      sql += ` AND r.RoomName LIKE '%' || @roomName || '%'`;
      params.roomName = roomName;
    }
    if (areaID && parseInt(areaID) > 0) {
      sql += ` AND r.AreaID = @areaID`;
      params.areaID = parseInt(areaID);
    }
    sql += ` ORDER BY r.RoomName`;

    const rooms = await query(sql, params);
    return success(res, rooms);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/rooms/search-all — tìm kiếm tất cả phòng (admin)
 */
const searchAllRoom = async (req, res) => {
  try {
    const { roomName, areaID } = req.query;
    let sql = `
      SELECT r.RoomID, r.RoomName, r.AreaID, r.Seat, r.PhoneCall, r.VideoCall, r.IsVIP,
             r.VIPCondition, r.VIPMinutes, r.Visible, r.Desc, r.Avatar, a.AreaName
      FROM Room r
      LEFT JOIN Area a ON r.AreaID = a.AreaID
      WHERE 1=1
    `;
    const params = {};

    if (roomName) {
      sql += ` AND r.RoomName LIKE '%' || @roomName || '%'`;
      params.roomName = roomName;
    }
    if (areaID && parseInt(areaID) > 0) {
      sql += ` AND r.AreaID = @areaID`;
      params.areaID = parseInt(areaID);
    }
    sql += ` ORDER BY r.RoomName`;

    const rooms = await query(sql, params);
    return success(res, rooms);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * POST /api/rooms — thêm phòng (admin)
 */
const addRoom = async (req, res) => {
  try {
    const { roomName, areaID, seat, phoneCall, videoCall, isVIP, vipCondition, vipMinutes, visible, desc, avatar, createBy } = req.body;
    if (!roomName || !areaID) return badRequest(res, 'Thiếu tên phòng hoặc khu vực');

    const result = await execute(
      `INSERT INTO Room (RoomName, AreaID, Seat, PhoneCall, VideoCall, IsVIP, VIPCondition, VIPMinutes, Visible, "Desc", Avatar, CreateBy, CreateDate)
       VALUES (@roomName, @areaID, @seat, @phoneCall, @videoCall, @isVIP, @vipCondition, @vipMinutes, @visible, @desc, @avatar, @createBy, datetime('now','localtime'))`,
      {
        roomName,
        areaID: parseInt(areaID),
        seat: parseInt(seat) || 0,
        phoneCall: phoneCall === true || phoneCall === 'true' ? 1 : 0,
        videoCall: videoCall === true || videoCall === 'true' ? 1 : 0,
        isVIP: isVIP === true || isVIP === 'true' ? 1 : 0,
        vipCondition: parseInt(vipCondition) || 0,
        vipMinutes: parseInt(vipMinutes) || 60,
        visible: visible !== false ? 1 : 0,
        desc: desc || '',
        avatar: avatar || '/uploads/images/nopic.png',
        createBy: createBy || req.user?.userID || 'admin',
      }
    );

    return success(res, { roomID: result.lastInsertRowid }, 'Thêm phòng thành công', 201);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * PUT /api/rooms/:id — cập nhật phòng (admin)
 */
const updateRoom = async (req, res) => {
  try {
    const { roomName, areaID, seat, phoneCall, videoCall, isVIP, vipCondition, vipMinutes, visible, desc, avatar, createBy } = req.body;
    const roomID = parseInt(req.params.id);

    await execute(
      `UPDATE Room SET
         RoomName = @roomName, AreaID = @areaID, Seat = @seat,
         PhoneCall = @phoneCall, VideoCall = @videoCall, IsVIP = @isVIP,
         VIPCondition = @vipCondition, VIPMinutes = @vipMinutes,
         Visible = @visible, "Desc" = @desc, Avatar = @avatar, CreateBy = @createBy
       WHERE RoomID = @roomID`,
      {
        roomName,
        areaID: parseInt(areaID),
        seat: parseInt(seat) || 0,
        phoneCall: phoneCall === true || phoneCall === 'true' ? 1 : 0,
        videoCall: videoCall === true || videoCall === 'true' ? 1 : 0,
        isVIP: isVIP === true || isVIP === 'true' ? 1 : 0,
        vipCondition: parseInt(vipCondition) || 0,
        vipMinutes: parseInt(vipMinutes) || 60,
        visible: visible !== false ? 1 : 0,
        desc: desc || '',
        avatar: avatar || '/uploads/images/nopic.png',
        createBy: createBy || req.user?.userID || 'admin',
        roomID,
      }
    );

    return success(res, null, 'Cập nhật phòng thành công');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * DELETE /api/rooms/:id — xoá phòng (admin)
 */
const deleteRoom = async (req, res) => {
  try {
    await execute(
      `UPDATE Room SET Visible = 0 WHERE RoomID = @roomID`,
      { roomID: parseInt(req.params.id) }
    );
    return success(res, null, 'Đã xoá phòng');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = {
  getListRoom, getAllRoom, getDetailRoom, getRoomsByArea,
  searchRoom, searchAllRoom, addRoom, updateRoom, deleteRoom,
};
