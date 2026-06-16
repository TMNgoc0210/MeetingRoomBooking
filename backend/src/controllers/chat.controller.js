/**
 * controllers/chat.controller.js — AI Chatbot (Claude Sonnet 4.5)
 * Tích hợp AI chatbot dùng Claude Sonnet 4.5 qua ShopAIKey (OpenAI-compatible API).
 * Chatbot hỗ trợ đặt phòng bằng ngôn ngữ tự nhiên qua Function Calling.
 */

const OpenAI = require('openai');
const { query, queryOne, execute } = require('../config/db');
const { success, error, badRequest } = require('../utils/response');

// Singleton client — khởi tạo 1 lần, tái dùng cho mọi request
let _client = null;
function getGroq() {
  if (!_client && process.env.SHOPAIKEY_API_KEY) {
    _client = new OpenAI({
      apiKey:  process.env.SHOPAIKEY_API_KEY,
      baseURL: 'https://api.shopaikey.com/v1',
    });
  }
  return _client;
}

const GROQ_MODEL = 'claude-sonnet-4-5';

// ─── Server-side Session Memory ──────────────────────────────────────────────
const sessionStore = new Map();
const SESSION_TTL  = 30 * 60 * 1000;

function getSession(userID) {
  const now = Date.now();
  let s = sessionStore.get(userID);
  if (!s || now - s.lastActive > SESSION_TTL) {
    s = { messages: [], lastActive: now };
    sessionStore.set(userID, s);
  } else {
    s.lastActive = now;
  }
  return s;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessionStore) {
    if (now - v.lastActive > SESSION_TTL) sessionStore.delete(k);
  }
}, 10 * 60 * 1000);

// ─── Tool 1: Tìm phòng trống ─────────────────────────────────────────────────
async function searchAvailableRooms({ date, startTime, durationMinutes, minSeat, roomName }) {
  if (!date || !startTime) return { error: 'Thiếu ngày hoặc giờ bắt đầu' };

  const parts = startTime.split(':').map(Number);
  const hh = parts[0], mm = parts[1] || 0;
  if (isNaN(hh) || isNaN(mm)) return { error: 'Giờ không hợp lệ, dùng format HH:mm' };

  const dur      = parseInt(durationMinutes) || 60;
  const totalMin = hh * 60 + mm + dur;
  const endH     = Math.floor(totalMin / 60);
  const endM     = totalMin % 60;

  if (hh < 7 || endH > 21 || (endH === 21 && endM > 0))
    return { error: 'Hệ thống phục vụ trong giờ 07:00–21:00' };

  const timeStart  = `${date} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
  const timeEnd    = `${date} ${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`;
  // Chặn tìm phòng cho thời gian đã qua (UTC+7)
  const nowVN = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
  if (timeStart <= nowVN)
    return { error: 'Không thể tìm phòng cho thời gian đã qua. Vui lòng chọn thời gian trong tương lai.' };
  const cap        = parseInt(minSeat) || 1;
  const nameFilter = roomName ? `AND r."RoomName" LIKE '%' || @roomName || '%'` : '';
  const params     = { cap, timeStart, timeEnd };
  if (roomName) params.roomName = roomName;

  const rooms = await query(
    `SELECT r."RoomID", r."RoomName", r."Seat", r."IsVIP", r."Desc", a."AreaName"
     FROM Room r LEFT JOIN Area a ON r."AreaID" = a."AreaID"
     WHERE r."Visible" = 1 AND r."Seat" >= @cap
       AND r."RoomID" NOT IN (
         SELECT "RoomID" FROM LineRoom
         WHERE "Status" != 3 AND "TimeStart" < @timeEnd AND "TimeEnd" > @timeStart
       )
       ${nameFilter}
     ORDER BY r."Seat"`,
    params
  );

  if (rooms.length === 0) {
    const anyRooms = await query(
      `SELECT r."RoomID", r."RoomName", r."Seat", a."AreaName"
       FROM Room r LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE r."Visible" = 1 AND r."Seat" >= @cap ORDER BY r."Seat" LIMIT 3`,
      { cap }
    );
    return {
      found: false,
      message: `Không có phòng trống ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}–${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')} ngày ${date}.`,
      alternatives: anyRooms.map(r => ({ roomID: r.RoomID, name: r.RoomName, seat: r.Seat, area: r.AreaName })),
    };
  }

  return {
    found: true, timeStart, timeEnd,
    rooms: rooms.map(r => ({
      roomID: r.RoomID, name: r.RoomName, area: r.AreaName,
      seat: r.Seat, isVIP: r.IsVIP === 1, desc: r.Desc || '',
    })),
  };
}

// ─── Tool: Đặt phòng ─────────────────────────────────────────────────────────
async function bookRoom({ roomID, date, startTime, durationMinutes, title, numberPerson, userID, serviceRequest }) {
  const dur    = parseInt(durationMinutes) || 60;
  const parts  = startTime.split(':').map(Number);
  const hh     = parts[0], mm = parts[1] || 0;
  const total  = hh * 60 + mm + dur;
  const endH   = String(Math.floor(total / 60)).padStart(2,'0');
  const endM   = String(total % 60).padStart(2,'0');
  const timeStart = `${date} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
  const timeEnd   = `${date} ${endH}:${endM}:00`;
  const num       = parseInt(numberPerson) || 1;
  // Chặn đặt phòng cho thời gian đã qua (UTC+7)
  const nowVN = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
  if (timeStart <= nowVN)
    return { success: false, error: 'Không thể đặt phòng cho thời gian đã qua. Vui lòng chọn thời gian trong tương lai.' };

  const conflict = await queryOne(
    `SELECT "LineRoomID" FROM LineRoom WHERE "RoomID"=@roomID AND "Status"!=3
     AND "TimeStart"<@timeEnd AND "TimeEnd">@timeStart`,
    { roomID: parseInt(roomID), timeStart, timeEnd }
  );

  if (conflict) {
    const alts = await query(
      `SELECT r."RoomID", r."RoomName", r."Seat", a."AreaName" FROM Room r
       LEFT JOIN Area a ON r."AreaID" = a."AreaID"
       WHERE r."Visible"=1 AND r."Seat">=@num AND r."RoomID"!=@roomID
         AND r."RoomID" NOT IN (
           SELECT "RoomID" FROM LineRoom
           WHERE "Status"!=3 AND "TimeStart"<@timeEnd AND "TimeEnd">@timeStart
         )
       ORDER BY r."Seat" LIMIT 3`,
      { num, roomID: parseInt(roomID), timeStart, timeEnd }
    );
    return {
      success: false, conflict: true,
      error: 'Phòng vừa bị đặt mất rồi!',
      alternatives: alts.map(r => ({ roomID: r.RoomID, name: r.RoomName, seat: r.Seat, area: r.AreaName })),
    };
  }

  const room = await queryOne(`SELECT "RoomName", "IsVIP" FROM Room WHERE "RoomID"=@roomID`, { roomID: parseInt(roomID) });
  if (!room) return { success: false, error: 'Không tìm thấy phòng' };

  const status = room.IsVIP === 1 ? 0 : 1;
  const result = await execute(
    `INSERT INTO LineRoom ("UserID","RoomID","TimeStart","TimeEnd","Title","NumberPerson","Status","ServiceRequest","CreateDate")
     VALUES (@userID, @roomID, @timeStart, @timeEnd, @title, @num, @status, @serviceRequest, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
    { userID, roomID: parseInt(roomID), timeStart, timeEnd, title: title || 'Cuộc họp', num, status, serviceRequest: serviceRequest || null }
  );

  return {
    success: true, lineRoomID: result.lastInsertRowid,
    roomID: parseInt(roomID), roomName: room.RoomName,
    timeStart, timeEnd, title: title || 'Cuộc họp',
    numberPerson: num, serviceRequest: serviceRequest || null,
    isVIP: room.IsVIP === 1, needApproval: room.IsVIP === 1,
  };
}

// ─── Tool: Xem lịch của tôi ───────────────────────────────────────────────────
async function getMyBookings({ userID, period }) {
  const STATUS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối', 3: 'Đã huỷ' };
  let timeFilter, orderDir, limitNum, emptyMsg;

  if (period === 'past') {
    timeFilter = `lr."TimeEnd" < TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')`;
    orderDir = 'DESC'; limitNum = 15;
    emptyMsg = 'Bạn chưa có lịch đặt phòng nào trong quá khứ.';
  } else if (period === 'all') {
    timeFilter = '1=1';
    orderDir = 'DESC'; limitNum = 20;
    emptyMsg = 'Bạn chưa có lịch đặt phòng nào.';
  } else {
    timeFilter = `lr."TimeEnd" >= TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') AND lr."Status" != 3`;
    orderDir = 'ASC'; limitNum = 10;
    emptyMsg = 'Bạn chưa có lịch đặt phòng nào sắp tới.';
  }

  const rows = await query(
    `SELECT lr."LineRoomID", lr."Title", lr."TimeStart", lr."TimeEnd", lr."Status", lr."NumberPerson",
            r."RoomName", a."AreaName"
     FROM LineRoom lr JOIN Room r ON lr."RoomID" = r."RoomID"
     LEFT JOIN Area a ON r."AreaID" = a."AreaID"
     WHERE lr."UserID" = @userID AND ${timeFilter}
     ORDER BY lr."TimeStart" ${orderDir}
     LIMIT ${limitNum}`,
    { userID }
  );

  if (!rows.length) return { found: false, message: emptyMsg };
  return {
    found: true, period: period || 'upcoming',
    bookings: rows.map(r => ({
      lineRoomID: r.LineRoomID, title: r.Title,
      room: r.RoomName, area: r.AreaName,
      timeStart: r.TimeStart, timeEnd: r.TimeEnd,
      status: STATUS[r.Status] ?? String(r.Status),
      numberPerson: r.NumberPerson,
    })),
  };
}

// ─── Tool: Huỷ lịch ──────────────────────────────────────────────────────────
async function cancelBooking({ lineRoomID, userID }) {
  const lr = await queryOne(
    `SELECT "UserID", "Status", "Title" FROM LineRoom WHERE "LineRoomID"=@id`,
    { id: parseInt(lineRoomID) }
  );
  if (!lr)                  return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.UserID !== userID) return { success: false, error: 'Bạn không có quyền huỷ lịch này' };
  if (lr.Status === 3)      return { success: false, error: 'Lịch đã được huỷ trước đó rồi' };

  await execute(`UPDATE LineRoom SET "Status"=3 WHERE "LineRoomID"=@id`, { id: parseInt(lineRoomID) });
  return { success: true, title: lr.Title };
}

// ─── Admin Tools ─────────────────────────────────────────────────────────────
async function getAllBookings({ date, status, limit }) {
  const conditions = [`lr."Status" != 3`];
  const params = {};
  if (date) { conditions.push(`LEFT(lr."TimeStart",10) = @date`); params.date = date; }
  if (status !== undefined && status !== null && status !== '') {
    const statusMap = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
    const statusNum = typeof status === 'string' ? (statusMap[status.toLowerCase()] ?? parseInt(status)) : parseInt(status);
    conditions.push(`lr."Status" = @status`);
    params.status = statusNum;
    if (statusNum === 0) conditions.splice(conditions.indexOf(`lr."Status" != 3`), 1);
  }
  const lim = parseInt(limit) || 10;
  const rows = await query(
    `SELECT lr."LineRoomID", lr."Title", lr."TimeStart", lr."TimeEnd", lr."Status", lr."NumberPerson",
            r."RoomName", a."AreaName", u."FullName" AS BookedBy, u."UserID"
     FROM LineRoom lr
     JOIN Room r ON lr."RoomID" = r."RoomID"
     LEFT JOIN Area a ON r."AreaID" = a."AreaID"
     LEFT JOIN "User" u ON lr."UserID" = u."UserID"
     WHERE ${conditions.join(' AND ')}
     ORDER BY lr."TimeStart" DESC
     LIMIT ${lim}`,
    params
  );
  if (!rows.length) return { found: false, message: 'Không có lịch đặt nào phù hợp.' };
  const STATUS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối', 3: 'Đã huỷ' };
  return {
    found: true,
    bookings: rows.map(r => ({
      lineRoomID: r.LineRoomID, title: r.Title,
      room: r.RoomName, area: r.AreaName,
      bookedBy: r.BookedBy, userID: r.UserID,
      timeStart: r.TimeStart, timeEnd: r.TimeEnd,
      status: STATUS[r.Status] ?? String(r.Status),
      numberPerson: r.NumberPerson,
    })),
  };
}

async function approveBooking({ lineRoomID, adminID }) {
  const lr = await queryOne(`SELECT "Status", "Title" FROM LineRoom WHERE "LineRoomID"=@id`, { id: parseInt(lineRoomID) });
  if (!lr) return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.Status !== 0) return { success: false, error: `Lịch "${lr.Title}" không ở trạng thái chờ duyệt` };
  await execute(
    `UPDATE LineRoom SET "Status"=1, "ApprovedBy"=@adminID, "ApprovedAt"=TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') WHERE "LineRoomID"=@id`,
    { id: parseInt(lineRoomID), adminID }
  );
  return { success: true, title: lr.Title, message: `Đã duyệt lịch "${lr.Title}" thành công.` };
}

async function rejectBooking({ lineRoomID, adminID }) {
  const lr = await queryOne(`SELECT "Status", "Title" FROM LineRoom WHERE "LineRoomID"=@id`, { id: parseInt(lineRoomID) });
  if (!lr) return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.Status !== 0) return { success: false, error: `Lịch "${lr.Title}" không ở trạng thái chờ duyệt` };
  await execute(
    `UPDATE LineRoom SET "Status"=2, "ApprovedBy"=@adminID, "ApprovedAt"=TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') WHERE "LineRoomID"=@id`,
    { id: parseInt(lineRoomID), adminID }
  );
  return { success: true, title: lr.Title, message: `Đã từ chối lịch "${lr.Title}".` };
}

async function getStatistics({ period }) {
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  let dateFilter = `LEFT(lr."TimeStart",10) = '${todayStr}'`;
  let label = 'hôm nay';
  if (period === 'week')  {
    dateFilter = `lr."TimeStart" >= TO_CHAR(NOW() - INTERVAL '7 days', 'YYYY-MM-DD HH24:MI:SS')`;
    label = '7 ngày qua';
  }
  if (period === 'month') {
    dateFilter = `LEFT(lr."TimeStart",7) = TO_CHAR(NOW(), 'YYYY-MM')`;
    label = 'tháng này';
  }

  const [total] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN "Status"=0 THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN "Status"=1 THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN "Status"=2 THEN 1 ELSE 0 END) AS rejected,
            SUM(CASE WHEN "Status"=3 THEN 1 ELSE 0 END) AS cancelled
     FROM LineRoom lr WHERE ${dateFilter}`, {}
  );
  const topRooms = await query(
    `SELECT r."RoomName", COUNT(*) AS bookingCount
     FROM LineRoom lr JOIN Room r ON lr."RoomID" = r."RoomID"
     WHERE ${dateFilter} AND lr."Status" != 3
     GROUP BY r."RoomID", r."RoomName" ORDER BY bookingCount DESC LIMIT 3`, {}
  );
  return {
    period: label,
    total: total.total || 0, pending: total.pending || 0,
    approved: total.approved || 0, rejected: total.rejected || 0, cancelled: total.cancelled || 0,
    topRooms: topRooms.map(r => ({ name: r.RoomName, count: r.bookingCount })),
  };
}

async function addRoomTool({ name, areaName, seat, isVIP, description }) {
  if (!name?.trim()) return { success: false, error: 'Thiếu tên phòng' };
  if (!seat || seat < 1) return { success: false, error: 'Số chỗ ngồi không hợp lệ' };
  let areaID = null;
  if (areaName) {
    const area = await queryOne(
      `SELECT "AreaID" FROM Area WHERE "AreaName" LIKE '%' || @name || '%' AND "Visible"=1 LIMIT 1`,
      { name: areaName }
    );
    if (!area) return { success: false, error: `Không tìm thấy khu vực "${areaName}".` };
    areaID = area.AreaID;
  } else {
    const first = await queryOne(`SELECT "AreaID" FROM Area WHERE "Visible"=1 LIMIT 1`, {});
    areaID = first?.AreaID;
  }
  const dup = await queryOne(`SELECT "RoomID" FROM Room WHERE "RoomName"=@name AND "Visible"=1`, { name: name.trim() });
  if (dup) return { success: false, error: `Phòng tên "${name}" đã tồn tại` };
  const result = await execute(
    `INSERT INTO Room ("AreaID","RoomName","Seat","IsVIP","Desc","Visible") VALUES (@areaID, @name, @seat, @isVIP, @desc, 1)`,
    { areaID, name: name.trim(), seat: parseInt(seat), isVIP: isVIP ? 1 : 0, desc: description || '' }
  );
  const areaRow = await queryOne(`SELECT "AreaName" FROM Area WHERE "AreaID"=@id`, { id: areaID });
  return { success: true, roomID: result.lastInsertRowid, roomName: name.trim(), area: areaRow?.AreaName || '', seat: parseInt(seat), isVIP: !!isVIP };
}

async function getRoomsTool({ search, areaName, isVIP }) {
  let sql = `SELECT r."RoomID", r."RoomName", r."Seat", r."IsVIP", r."Desc", a."AreaName"
             FROM Room r LEFT JOIN Area a ON r."AreaID" = a."AreaID" WHERE r."Visible" = 1`;
  const params = {};
  if (search)                                { sql += ` AND r."RoomName" LIKE '%' || @search || '%'`; params.search = search; }
  if (areaName)                              { sql += ` AND a."AreaName" LIKE '%' || @area || '%'`;   params.area = areaName; }
  if (isVIP !== undefined && isVIP !== null) { sql += ` AND r."IsVIP" = @vip`;                        params.vip = isVIP ? 1 : 0; }
  sql += ` ORDER BY a."AreaName", r."RoomName" LIMIT 20`;
  const rooms = await query(sql, params);
  if (!rooms.length) return { found: false, message: 'Không tìm thấy phòng nào phù hợp.' };
  return {
    found: true, total: rooms.length,
    rooms: rooms.map(r => ({ roomID: r.RoomID, name: r.RoomName, area: r.AreaName, seat: r.Seat, isVIP: r.IsVIP === 1, desc: r.Desc || '' })),
  };
}

async function getEquipmentTool({ roomName }) {
  if (!roomName?.trim()) return { error: 'Thiếu tên phòng' };
  const room = await queryOne(
    `SELECT r."RoomID", r."RoomName", a."AreaName" FROM Room r LEFT JOIN Area a ON r."AreaID" = a."AreaID"
     WHERE r."RoomName" LIKE '%' || @name || '%' AND r."Visible" = 1 LIMIT 1`,
    { name: roomName.trim() }
  );
  if (!room) return { found: false, message: `Không tìm thấy phòng "${roomName}"` };
  const equipment = await query(
    `SELECT "EquipmentID", "Name", "Quantity", "Note" FROM Equipment WHERE "RoomID"=@roomID AND "Visible"=1`,
    { roomID: room.RoomID }
  );
  if (!equipment.length) return { found: true, roomName: room.RoomName, area: room.AreaName, message: `Phòng ${room.RoomName} chưa có thiết bị.`, equipment: [] };
  return {
    found: true, roomName: room.RoomName, area: room.AreaName,
    equipment: equipment.map(e => ({ id: e.EquipmentID, name: e.Name, quantity: e.Quantity, note: e.Note || '' })),
  };
}

async function getUsersTool({ search, limit }) {
  let sql = `SELECT u."UserID", u."FullName", u."Email", u."Roles", f."FacultyName"
             FROM "User" u LEFT JOIN Faculty f ON u."FacultyID" = f."FacultyID" WHERE u."Visible" = 1`;
  const params = {};
  if (search) {
    sql += ` AND (u."FullName" LIKE '%' || @search || '%' OR u."UserID" LIKE '%' || @search || '%' OR u."Email" LIKE '%' || @search || '%')`;
    params.search = search;
  }
  const lim = parseInt(limit) || 15;
  sql += ` ORDER BY u."Roles" DESC, u."FullName" LIMIT ${lim}`;
  const users = await query(sql, params);
  if (!users.length) return { found: false, message: 'Không tìm thấy người dùng.' };
  return {
    found: true, total: users.length,
    users: users.map(u => ({ userID: u.UserID, name: u.FullName || '', email: u.Email || '', role: u.Roles === 1 ? 'Admin' : 'User', faculty: u.FacultyName || '' })),
  };
}

// ─── Tool Declarations ────────────────────────────────────────────────────────
const USER_TOOL_DECLS = [
  {
    name: 'search_available_rooms',
    description: 'Tìm phòng họp còn trống theo thời gian và sức chứa. Gọi khi user muốn tìm phòng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date:            { type: 'STRING', description: 'Ngày họp YYYY-MM-DD' },
        startTime:       { type: 'STRING', description: 'Giờ bắt đầu HH:mm, ví dụ: 14:30' },
        durationMinutes: { type: 'NUMBER', description: 'Thời lượng phút. Nếu chưa biết, dùng 60.' },
        minSeat:         { type: 'NUMBER', description: 'Số chỗ tối thiểu. Mặc định 1.' },
        roomName:        { type: 'STRING', description: 'Tên phòng để lọc (chỉ truyền khi user chỉ định)' },
      },
      required: ['date', 'startTime'],
    },
  },
  {
    name: 'book_room',
    description: 'Đặt phòng vào hệ thống. CHỈ gọi sau khi user đã XÁC NHẬN tóm tắt đặt phòng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomID:          { type: 'NUMBER', description: 'ID phòng từ search_available_rooms' },
        date:            { type: 'STRING', description: 'Ngày YYYY-MM-DD' },
        startTime:       { type: 'STRING', description: 'Giờ bắt đầu HH:mm' },
        durationMinutes: { type: 'NUMBER', description: 'Thời lượng họp (phút). Hỏi user nếu chưa biết.' },
        title:           { type: 'STRING', description: 'Tiêu đề cuộc họp' },
        numberPerson:    { type: 'NUMBER', description: 'Số người tham dự' },
        serviceRequest:  { type: 'STRING', description: 'Yêu cầu dịch vụ thêm nếu user đề cập' },
      },
      required: ['roomID', 'date', 'startTime', 'durationMinutes', 'title', 'numberPerson'],
    },
  },
  {
    name: 'get_my_bookings',
    description: 'Xem lịch đặt phòng của người dùng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period: { type: 'STRING', description: '"upcoming" (sắp tới, mặc định) | "past" (đã qua) | "all" (tất cả)' },
      },
    },
  },
  {
    name: 'cancel_booking',
    description: 'Huỷ một lịch đặt phòng theo ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lineRoomID: { type: 'NUMBER', description: 'ID lịch đặt (lấy từ get_my_bookings)' },
      },
      required: ['lineRoomID'],
    },
  },
];

const ADMIN_TOOL_DECLS = [
  {
    name: 'get_all_bookings',
    description: 'Admin: Xem tất cả lịch đặt phòng. Lọc theo ngày hoặc trạng thái.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date:   { type: 'STRING', description: 'Lọc theo ngày YYYY-MM-DD (tuỳ chọn)' },
        status: { type: 'STRING', description: 'pending | approved | rejected (tuỳ chọn)' },
        limit:  { type: 'NUMBER', description: 'Số kết quả tối đa. Mặc định 10.' },
      },
    },
  },
  {
    name: 'approve_booking',
    description: 'Admin: Duyệt một lịch đặt VIP đang chờ duyệt.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lineRoomID: { type: 'NUMBER', description: 'ID lịch đặt cần duyệt' },
      },
      required: ['lineRoomID'],
    },
  },
  {
    name: 'reject_booking',
    description: 'Admin: Từ chối một lịch đặt VIP đang chờ duyệt.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lineRoomID: { type: 'NUMBER', description: 'ID lịch đặt cần từ chối' },
      },
      required: ['lineRoomID'],
    },
  },
  {
    name: 'get_statistics',
    description: 'Admin: Thống kê lịch đặt phòng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period: { type: 'STRING', description: 'today | week | month. Mặc định today.' },
      },
    },
  },
  {
    name: 'add_room',
    description: 'Admin: Thêm phòng họp mới. Hỏi xác nhận admin trước khi gọi.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name:        { type: 'STRING',  description: 'Tên phòng họp' },
        areaName:    { type: 'STRING',  description: 'Tên khu vực' },
        seat:        { type: 'NUMBER',  description: 'Số chỗ ngồi tối đa' },
        isVIP:       { type: 'BOOLEAN', description: 'Phòng VIP yêu cầu phê duyệt?' },
        description: { type: 'STRING',  description: 'Mô tả phòng (tuỳ chọn)' },
      },
      required: ['name', 'seat'],
    },
  },
  {
    name: 'get_rooms',
    description: 'Admin: Xem danh sách phòng họp.',
    parameters: {
      type: 'OBJECT',
      properties: {
        search:   { type: 'STRING',  description: 'Tìm theo tên phòng (tuỳ chọn)' },
        areaName: { type: 'STRING',  description: 'Lọc theo khu vực (tuỳ chọn)' },
        isVIP:    { type: 'BOOLEAN', description: 'Chỉ phòng VIP (tuỳ chọn)' },
      },
    },
  },
  {
    name: 'get_equipment',
    description: 'Admin: Xem thiết bị của một phòng họp.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: { type: 'STRING', description: 'Tên phòng cần xem thiết bị' },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'get_users',
    description: 'Admin: Xem danh sách người dùng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        search: { type: 'STRING', description: 'Tìm theo tên, mã số, email (tuỳ chọn)' },
        limit:  { type: 'NUMBER', description: 'Số kết quả tối đa. Mặc định 15.' },
      },
    },
  },
];

// ─── Convert to OpenAI tools format ──────────────────────────────────────────
function toGroqTools(decls) {
  return decls.map(d => ({
    type: 'function',
    function: {
      name: d.name,
      description: d.description,
      parameters: {
        ...d.parameters,
        type: d.parameters.type.toLowerCase(),
        properties: Object.fromEntries(
          Object.entries(d.parameters.properties || {}).map(([k, v]) => [
            k, { ...v, type: v.type.toLowerCase() },
          ])
        ),
      },
    },
  }));
}

// ─── Dispatch tool call ───────────────────────────────────────────────────────
async function dispatchTool(name, args, userID) {
  switch (name) {
    case 'search_available_rooms': return await searchAvailableRooms(args);
    case 'book_room':              return await bookRoom({ ...args, userID });
    case 'get_my_bookings':        return await getMyBookings({ ...args, userID });
    case 'cancel_booking':         return await cancelBooking({ ...args, userID });
    case 'get_all_bookings':       return await getAllBookings(args);
    case 'approve_booking':        return await approveBooking({ ...args, adminID: userID });
    case 'reject_booking':         return await rejectBooking({ ...args, adminID: userID });
    case 'get_statistics':         return await getStatistics(args);
    case 'add_room':               return await addRoomTool(args);
    case 'get_rooms':              return await getRoomsTool(args);
    case 'get_equipment':          return await getEquipmentTool(args);
    case 'get_users':              return await getUsersTool(args);
    default:                       return { error: 'Tool không tồn tại' };
  }
}

// ─── ReAct loop ───────────────────────────────────────────────────────────────
async function runAI({ messages, systemPrompt, userID, toolDecls, onStream }) {
  const groq  = getGroq();
  const all   = [{ role: 'system', content: systemPrompt }, ...messages];
  const tools = toGroqTools(toolDecls);
  let bookingResult = null;
  let pendingData   = null;

  for (let i = 0; i < 6; i++) {
    let msg;

    if (onStream) {
      let stream;
      try {
        stream = await groq.chat.completions.create({
          model: GROQ_MODEL, messages: all, tools,
          tool_choice: 'auto', max_tokens: 600, temperature: 0.1, stream: true,
        });
      } catch (apiErr) {
        console.error('[Chat] API error:', apiErr.message?.slice(0, 200));
        const isRL = apiErr.status === 429 || /rate limit/i.test(apiErr.message || '');
        return {
          reply: isRL ? 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳' : 'AI gặp lỗi tạm thời, vui lòng thử lại.',
          bookingResult, pendingData, history: all.slice(1),
        };
      }

      let fullContent  = '';
      let hasToolCalls = false;
      const tcMap      = {};

      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.tool_calls) {
            hasToolCalls = true;
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!tcMap[idx]) tcMap[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
              if (tc.id)                  tcMap[idx].id                       = tc.id;
              if (tc.function?.name)      tcMap[idx].function.name            += tc.function.name;
              if (tc.function?.arguments) tcMap[idx].function.arguments       += tc.function.arguments;
            }
          }
          if (delta.content) {
            fullContent += delta.content;
            if (!hasToolCalls) onStream(delta.content);
          }
        }
      } catch (streamErr) {
        console.error('[Chat] Stream error:', streamErr.message?.slice(0, 100));
        return { reply: 'AI gặp lỗi khi truyền dữ liệu, vui lòng thử lại.', bookingResult, pendingData, history: all.slice(1) };
      }

      const toolCalls = Object.values(tcMap);
      msg = { role: 'assistant', content: fullContent };
      if (toolCalls.length) msg.tool_calls = toolCalls;

    } else {
      let resp;
      try {
        resp = await groq.chat.completions.create({
          model: GROQ_MODEL, messages: all, tools,
          tool_choice: 'auto', max_tokens: 600, temperature: 0.1,
        });
      } catch (apiErr) {
        console.error('[Chat] API error:', apiErr.message?.slice(0, 200));
        const isRL = apiErr.status === 429 || /rate limit/i.test(apiErr.message || '');
        return {
          reply: isRL ? 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳' : 'AI gặp lỗi tạm thời, vui lòng thử lại.',
          bookingResult, pendingData, history: all.slice(1),
        };
      }
      msg = resp.choices[0].message;
    }

    const norm = { role: msg.role, content: msg.content ?? '' };
    if (msg.tool_calls?.length) norm.tool_calls = msg.tool_calls;
    all.push(norm);

    if (!msg.tool_calls?.length) {
      return { reply: msg.content || '', bookingResult, pendingData, history: all.slice(1) };
    }

    for (const tc of msg.tool_calls) {
      let args = {};
      try { const p = JSON.parse(tc.function.arguments); if (p && typeof p === 'object') args = p; } catch (_) {}

      const result = await dispatchTool(tc.function.name, args, userID);

      if (result?.success === true && result?.lineRoomID) bookingResult = result;
      if (tc.function.name === 'get_all_bookings' && result?.found) {
        const pending = result.bookings?.filter(b => b.status === 'Chờ duyệt');
        if (pending?.length) pendingData = pending;
      }
      all.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  return { reply: '', bookingResult, pendingData, history: all.slice(1) };
}

// ─── System Prompts ───────────────────────────────────────────────────────────
function buildSystemPrompts(now, userName, userID) {
  const pad  = n => String(n).padStart(2, '0');
  const fmt  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const t1   = new Date(now); t1.setDate(now.getDate() + 1);
  const t2   = new Date(now); t2.setDate(now.getDate() + 2);
  const days = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

  const user = `Bạn là AI Booking Assistant — trợ lý đặt phòng họp Smart Meeting Room.
Hôm nay: ${fmt(now)} (${days[now.getDay()]}) ${pad(now.getHours())}:${pad(now.getMinutes())} | Ngày mai: ${fmt(t1)} | Người dùng: ${userName} (${userID})
Giờ phục vụ: 07:00–21:00.

ĐỊNH DẠNG TRẢ LỜI (bắt buộc):
- KHÔNG dùng markdown: không **, không bảng |---|, không #, không backtick
- Dùng text thuần, xuống dòng để phân cách
- Kết quả đặt phòng thành công dùng format:
  ✅ Đặt phòng thành công!
  🆔 Mã: #[ID]
  📋 Tiêu đề: [title]
  🏢 Phòng: [room]
  📅 Ngày: [date]
  🕐 Thời gian: [start] – [end]
  👥 Số người: [n]
  🟢 Trạng thái: [status]
- Ngắn gọn, tối đa 5 dòng mỗi câu trả lời thông thường

QUY TẮC THỜI GIAN: "sáng"=08:00 "chiều"=13:00 "tối"=18:00 | "hôm nay"=${fmt(now)} "ngày mai"=${fmt(t1)} "ngày kia"=${fmt(t2)}

LUỒNG ĐẶT PHÒNG:
1. Trích ngày + giờ. Thiếu → hỏi. Thiếu số người → dùng 1.
2. Gọi search_available_rooms. Hiển thị ≤4 phòng, hỏi chọn.
3. Sau chọn phòng, hỏi lần lượt: thời lượng → tiêu đề → dịch vụ thêm.
4. Tóm tắt 1 đoạn ngắn → hỏi "Xác nhận đặt?"
5. CHỈ gọi book_room khi user xác nhận ("có","ok","đặt đi","ừ","đồng ý").
6. conflict=true → báo và gợi phòng khác.

LỊCH: "lịch sắp tới" → get_my_bookings(upcoming) | "lịch cũ" → past
HUỶ: get_my_bookings → xác nhận → cancel_booking
NGOÀI CHỦ ĐỀ: "Tôi chỉ hỗ trợ đặt phòng họp ạ."
Trả lời ngắn, thân thiện, tiếng Việt, emoji vừa phải.`;

  const admin = `Bạn là AI Admin Assistant — trợ lý quản trị Smart Meeting Room.
Hôm nay: ${fmt(now)} (${days[now.getDay()]}) ${pad(now.getHours())}:${pad(now.getMinutes())} | Admin: ${userName} (${userID})

ĐỊNH DẠNG TRẢ LỜI (bắt buộc):
- KHÔNG dùng markdown: không **, không bảng |---|, không #, không backtick
- Text thuần, xuống dòng phân cách, tối đa 8 dòng mỗi câu trả lời
- Danh sách dùng số thứ tự: 1. 2. 3.

QUẢN LÝ LỊCH: "chờ duyệt" → get_all_bookings(pending) | "hôm nay" → get_all_bookings(date="${fmt(now)}")
Hiển thị: ID, tên, phòng, người đặt, thời gian. Pending → gợi ý duyệt/từ chối.
"Duyệt [ID]" → approve_booking | "Từ chối [ID]" → reject_booking

THỐNG KÊ: "thống kê" → get_statistics(today) | "tuần" → week | "tháng" → month
PHÒNG: "danh sách phòng" → get_rooms | "thêm phòng" → hỏi tên/khu/chỗ → xác nhận → add_room
THIẾT BỊ: "thiết bị [X]" → get_equipment | NGƯỜI DÙNG: "tìm [tên]" → get_users

ĐẶT PHÒNG: search → chọn → hỏi thời lượng/tiêu đề → tóm tắt → xác nhận → book_room
Xem lịch: get_my_bookings(upcoming|past|all)

Ngắn gọn, tiếng Việt, emoji vừa phải. Ngoài chủ đề: "Tôi chỉ hỗ trợ quản lý phòng họp ạ."`;

  return { user, admin };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    if (!getGroq()) return error(res, 'SHOPAIKEY_API_KEY chưa cấu hình trong .env', 503);

    const { message } = req.body;
    if (!message?.trim()) return badRequest(res, 'Thiếu nội dung tin nhắn');

    const userID   = req.user?.userID   || 'guest';
    const userName = req.user?.fullName || 'Bạn';
    const isAdmin  = req.user?.roles === 1;

    const now = new Date();
    const { user: userSystemPrompt, admin: adminSystemPrompt } = buildSystemPrompts(now, userName, userID);
    const systemPrompt = isAdmin ? adminSystemPrompt : userSystemPrompt;
    const toolDecls = isAdmin ? [...USER_TOOL_DECLS, ...ADMIN_TOOL_DECLS] : USER_TOOL_DECLS;

    const session  = getSession(userID);
    const messages = [...session.messages, { role: 'user', content: message }];

    const { reply, bookingResult, pendingData, history } = await runAI({ messages, systemPrompt, userID, toolDecls });

    const isBookingSuccess = !!(bookingResult?.success && bookingResult?.lineRoomID);
    const finalReply = reply || 'Xin lỗi, tôi chưa hiểu rõ yêu cầu. Bạn có thể nói rõ hơn không?';

    session.messages = history.length > 40 ? history.slice(-40) : history;

    try {
      await execute(
        `INSERT INTO AI_Chat_Log ("UserID","UserMessage","BotReply","AI_JSON","CreateDate")
         VALUES (@userID, @msg, @reply, @reply, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
        { userID, msg: message, reply: finalReply }
      );
    } catch (_) {}

    return success(res, {
      reply: finalReply,
      isBookingSuccess,
      bookingData: isBookingSuccess ? bookingResult : null,
      pendingData: pendingData || null,
    });

  } catch (err) {
    console.error('[Chat] Error:', err.message);
    const raw = err.message || '';
    let msg = 'AI đang gặp sự cố, vui lòng thử lại.';
    if (raw.includes('rate limit') || raw.includes('Rate limit') || err.status === 429) {
      msg = 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳';
    } else if (raw.includes('SHOPAIKEY_API_KEY') || raw.includes('API key')) {
      msg = 'Chưa cấu hình API key AI.';
    }
    return error(res, msg, 500);
  }
};

// ─── SSE Streaming Handler ────────────────────────────────────────────────────
const streamMessage = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const write = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!getGroq()) { write({ type: 'error', message: 'SHOPAIKEY_API_KEY chưa cấu hình' }); return res.end(); }

    const { message } = req.body;
    if (!message?.trim()) { write({ type: 'error', message: 'Thiếu nội dung tin nhắn' }); return res.end(); }

    const userID   = req.user?.userID   || 'guest';
    const userName = req.user?.fullName || 'Bạn';
    const isAdmin  = req.user?.roles === 1;

    const now = new Date();
    const { user: userSystemPrompt, admin: adminSystemPrompt } = buildSystemPrompts(now, userName, userID);
    const systemPrompt = isAdmin ? adminSystemPrompt : userSystemPrompt;
    const toolDecls    = isAdmin ? [...USER_TOOL_DECLS, ...ADMIN_TOOL_DECLS] : USER_TOOL_DECLS;

    const session  = getSession(userID);
    const messages = [...session.messages, { role: 'user', content: message }];

    const { reply, bookingResult, pendingData, history } = await runAI({
      messages, systemPrompt, userID, toolDecls,
      onStream: (token) => write({ type: 'token', token }),
    });

    const isBookingSuccess = !!(bookingResult?.success && bookingResult?.lineRoomID);
    const finalReply = reply || 'Xin lỗi, tôi chưa hiểu rõ yêu cầu. Bạn có thể nói rõ hơn không?';

    session.messages = history.length > 40 ? history.slice(-40) : history;

    execute(
      `INSERT INTO AI_Chat_Log ("UserID","UserMessage","BotReply","AI_JSON","CreateDate")
       VALUES (@userID, @msg, @reply, @reply, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`,
      { userID, msg: message, reply: finalReply }
    ).catch(() => {});

    write({
      type: 'done',
      reply: finalReply,
      isBookingSuccess,
      bookingData: isBookingSuccess ? bookingResult : null,
      pendingData: pendingData || null,
    });
    res.end();

  } catch (err) {
    console.error('[Chat Stream] Error:', err.message);
    const raw = err.message || '';
    let msg = 'AI đang gặp sự cố, vui lòng thử lại.';
    if (/rate limit/i.test(raw) || err.status === 429) msg = 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳';
    write({ type: 'error', message: msg });
    res.end();
  }
};

const clearSession = (userID) => sessionStore.delete(userID);

const getHistory = async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return error(res, 'Chưa xác thực', 401);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const rows = await query(
      `SELECT "LogID", "UserMessage", "BotReply", "CreateDate" FROM AI_Chat_Log
       WHERE "UserID" = @userID ORDER BY "CreateDate" DESC LIMIT @limit`,
      { userID, limit }
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { sendMessage, streamMessage, clearSession, getHistory };
