/**
 * AI Chat Controller — Groq + Llama 3.3 70B
 * Đề cương: Entity Extraction, Clarification, DB Action, Conflict Resolution,
 *            Q&A, Cancel, Relative Time, Fallback, UI Card
 */

const Groq = require('groq-sdk');
const { query, queryOne, execute } = require('../config/db');
const { success, error, badRequest } = require('../utils/response');

const MODEL_PRIMARY  = 'llama-3.3-70b-versatile'; // 6k TPM — quality
const MODEL_FALLBACK = 'llama-3.1-8b-instant';    // 20k TPM — high limit
const MODEL = MODEL_PRIMARY;

// ─── Groq singleton ───────────────────────────────────────────────────────────
let _groq = null;
function getGroq() {
  if (!_groq && process.env.GROQ_API_KEY) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// ─── Server-side session memory ───────────────────────────────────────────────
const sessionStore = new Map();
const SESSION_TTL = 30 * 60 * 1000;

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

// ─── Tool: Tìm phòng trống ────────────────────────────────────────────────────
async function searchAvailableRooms({ date, startTime, durationMinutes, minSeat, roomName }) {
  if (!date || !startTime) return { error: 'Thiếu ngày hoặc giờ bắt đầu' };

  const parts = startTime.split(':').map(Number);
  const hh = parts[0], mm = parts[1] || 0;
  if (isNaN(hh) || isNaN(mm)) return { error: 'Giờ không hợp lệ, dùng format HH:mm' };

  const dur = parseInt(durationMinutes) || 60;
  const totalMin = hh * 60 + mm + dur;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;

  if (hh < 7 || endH > 21 || (endH === 21 && endM > 0))
    return { error: 'Hệ thống phục vụ trong giờ 07:00–21:00' };

  const timeStart = `${date} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const timeEnd   = `${date} ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
  const cap       = parseInt(minSeat) || 1;
  const nameFilter = roomName ? `AND r.RoomName LIKE '%' || @roomName || '%'` : '';
  const params = { cap, timeStart, timeEnd };
  if (roomName) params.roomName = roomName;

  const rooms = await query(
    `SELECT r.RoomID, r.RoomName, r.Seat, r.IsVIP, r.Desc, a.AreaName
     FROM Room r LEFT JOIN Area a ON r.AreaID = a.AreaID
     WHERE r.Visible = 1 AND r.Seat >= @cap
       AND r.RoomID NOT IN (
         SELECT RoomID FROM LineRoom
         WHERE Status != 3 AND TimeStart < @timeEnd AND TimeEnd > @timeStart
       )
       ${nameFilter}
     ORDER BY r.Seat`,
    params
  );

  if (rooms.length === 0) {
    // Gợi ý phòng có thể dùng giờ khác
    const anyRooms = await query(
      `SELECT r.RoomID, r.RoomName, r.Seat, a.AreaName
       FROM Room r LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE r.Visible = 1 AND r.Seat >= @cap ORDER BY r.Seat LIMIT 3`,
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
  const dur = parseInt(durationMinutes) || 60;
  const parts = startTime.split(':').map(Number);
  const hh = parts[0], mm = parts[1] || 0;
  const totalMin = hh * 60 + mm + dur;
  const endH = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const endM = String(totalMin % 60).padStart(2, '0');
  const timeStart = `${date} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const timeEnd   = `${date} ${endH}:${endM}:00`;
  const num       = parseInt(numberPerson) || 1;

  const conflict = await queryOne(
    `SELECT LineRoomID FROM LineRoom WHERE RoomID=@roomID AND Status!=3
     AND TimeStart<@timeEnd AND TimeEnd>@timeStart`,
    { roomID: parseInt(roomID), timeStart, timeEnd }
  );

  if (conflict) {
    const alts = await query(
      `SELECT r.RoomID, r.RoomName, r.Seat, a.AreaName FROM Room r
       LEFT JOIN Area a ON r.AreaID = a.AreaID
       WHERE r.Visible = 1 AND r.Seat >= @num AND r.RoomID != @roomID
         AND r.RoomID NOT IN (
           SELECT RoomID FROM LineRoom
           WHERE Status != 3 AND TimeStart < @timeEnd AND TimeEnd > @timeStart
         )
       ORDER BY r.Seat LIMIT 3`,
      { num, roomID: parseInt(roomID), timeStart, timeEnd }
    );
    return {
      success: false, conflict: true,
      error: 'Phòng vừa bị đặt mất rồi!',
      alternatives: alts.map(r => ({ roomID: r.RoomID, name: r.RoomName, seat: r.Seat, area: r.AreaName })),
    };
  }

  const room = await queryOne(`SELECT RoomName, IsVIP FROM Room WHERE RoomID=@roomID`, { roomID: parseInt(roomID) });
  if (!room) return { success: false, error: 'Không tìm thấy phòng' };

  const status = room.IsVIP === 1 ? 0 : 1;
  const result = await execute(
    `INSERT INTO LineRoom (UserID, RoomID, TimeStart, TimeEnd, Title, NumberPerson, Status, ServiceRequest, CreateDate)
     VALUES (@userID, @roomID, @timeStart, @timeEnd, @title, @num, @status, @serviceRequest, datetime('now','localtime'))`,
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
  // period: 'upcoming' (default) | 'past' | 'all'
  const STATUS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối', 3: 'Đã huỷ' };

  let timeFilter, orderDir, limitNum, emptyMsg;
  if (period === 'past') {
    timeFilter = `lr.TimeEnd < datetime('now','localtime')`;
    orderDir   = 'DESC';
    limitNum   = 15;
    emptyMsg   = 'Bạn chưa có lịch đặt phòng nào trong quá khứ.';
  } else if (period === 'all') {
    timeFilter = '1=1';
    orderDir   = 'DESC';
    limitNum   = 20;
    emptyMsg   = 'Bạn chưa có lịch đặt phòng nào.';
  } else {
    // upcoming (default)
    timeFilter = `lr.TimeEnd >= datetime('now','localtime') AND lr.Status != 3`;
    orderDir   = 'ASC';
    limitNum   = 10;
    emptyMsg   = 'Bạn chưa có lịch đặt phòng nào sắp tới.';
  }

  const rows = await query(
    `SELECT lr.LineRoomID, lr.Title, lr.TimeStart, lr.TimeEnd, lr.Status, lr.NumberPerson,
            r.RoomName, a.AreaName
     FROM LineRoom lr JOIN Room r ON lr.RoomID = r.RoomID
     LEFT JOIN Area a ON r.AreaID = a.AreaID
     WHERE lr.UserID = @userID AND ${timeFilter}
     ORDER BY lr.TimeStart ${orderDir} LIMIT ${limitNum}`,
    { userID }
  );

  if (!rows.length) return { found: false, message: emptyMsg };

  return {
    found: true,
    period: period || 'upcoming',
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
    `SELECT UserID, Status, Title FROM LineRoom WHERE LineRoomID=@id`,
    { id: parseInt(lineRoomID) }
  );
  if (!lr)                return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.UserID !== userID) return { success: false, error: 'Bạn không có quyền huỷ lịch này' };
  if (lr.Status === 3)    return { success: false, error: 'Lịch đã được huỷ trước đó rồi' };

  await execute(`UPDATE LineRoom SET Status=3 WHERE LineRoomID=@id`, { id: parseInt(lineRoomID) });
  return { success: true, title: lr.Title };
}

// ─── Admin Tools ─────────────────────────────────────────────────────────────

async function getAllBookings({ date, status, limit }) {
  const conditions = ["lr.Status != 3"];
  const params = {};

  if (date) {
    conditions.push(`date(lr.TimeStart) = @date`);
    params.date = date;
  }
  if (status !== undefined && status !== null && status !== '') {
    const statusMap = { 'pending': 0, 'approved': 1, 'rejected': 2, 'cancelled': 3 };
    const statusNum = typeof status === 'string' ? (statusMap[status.toLowerCase()] ?? parseInt(status)) : parseInt(status);
    conditions.push(`lr.Status = @status`);
    params.status = statusNum;
    if (statusNum === 0) conditions.splice(conditions.indexOf("lr.Status != 3"), 1);
  }

  const rows = await query(
    `SELECT lr.LineRoomID, lr.Title, lr.TimeStart, lr.TimeEnd, lr.Status, lr.NumberPerson,
            r.RoomName, a.AreaName, u.FullName AS BookedBy, u.UserID
     FROM LineRoom lr
     JOIN Room r ON lr.RoomID = r.RoomID
     LEFT JOIN Area a ON r.AreaID = a.AreaID
     LEFT JOIN "User" u ON lr.UserID = u.UserID
     WHERE ${conditions.join(' AND ')}
     ORDER BY lr.TimeStart DESC LIMIT @lim`,
    { ...params, lim: parseInt(limit) || 10 }
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
  const lr = await queryOne(`SELECT Status, Title FROM LineRoom WHERE LineRoomID=@id`, { id: parseInt(lineRoomID) });
  if (!lr) return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.Status !== 0) return { success: false, error: `Lịch "${lr.Title}" không ở trạng thái chờ duyệt` };

  await execute(
    `UPDATE LineRoom SET Status=1, ApprovedBy=@adminID, ApprovedAt=datetime('now','localtime') WHERE LineRoomID=@id`,
    { id: parseInt(lineRoomID), adminID }
  );
  return { success: true, title: lr.Title, message: `Đã duyệt lịch "${lr.Title}" thành công.` };
}

async function rejectBooking({ lineRoomID, adminID }) {
  const lr = await queryOne(`SELECT Status, Title FROM LineRoom WHERE LineRoomID=@id`, { id: parseInt(lineRoomID) });
  if (!lr) return { success: false, error: 'Không tìm thấy lịch đặt' };
  if (lr.Status !== 0) return { success: false, error: `Lịch "${lr.Title}" không ở trạng thái chờ duyệt` };

  await execute(
    `UPDATE LineRoom SET Status=2, ApprovedBy=@adminID, ApprovedAt=datetime('now','localtime') WHERE LineRoomID=@id`,
    { id: parseInt(lineRoomID), adminID }
  );
  return { success: true, title: lr.Title, message: `Đã từ chối lịch "${lr.Title}".` };
}

async function getStatistics({ period }) {
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let dateFilter = `date(lr.TimeStart) = '${todayStr}'`;
  let label = 'hôm nay';
  if (period === 'week') {
    dateFilter = `lr.TimeStart >= datetime('now', '-7 days', 'localtime')`;
    label = '7 ngày qua';
  } else if (period === 'month') {
    dateFilter = `strftime('%Y-%m', lr.TimeStart) = strftime('%Y-%m', datetime('now','localtime'))`;
    label = 'tháng này';
  }

  const [total] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN Status=0 THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN Status=1 THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN Status=2 THEN 1 ELSE 0 END) AS rejected,
            SUM(CASE WHEN Status=3 THEN 1 ELSE 0 END) AS cancelled
     FROM LineRoom lr WHERE ${dateFilter}`, {}
  );

  const topRooms = await query(
    `SELECT r.RoomName, COUNT(*) AS bookingCount
     FROM LineRoom lr JOIN Room r ON lr.RoomID = r.RoomID
     WHERE ${dateFilter} AND lr.Status != 3
     GROUP BY r.RoomID ORDER BY bookingCount DESC LIMIT 3`, {}
  );

  return {
    period: label,
    total: total.total || 0,
    pending: total.pending || 0,
    approved: total.approved || 0,
    rejected: total.rejected || 0,
    cancelled: total.cancelled || 0,
    topRooms: topRooms.map(r => ({ name: r.RoomName, count: r.bookingCount })),
  };
}

// ─── Admin Tool: Thêm phòng ──────────────────────────────────────────────────
async function addRoomTool({ name, areaName, seat, isVIP, description }) {
  if (!name?.trim()) return { success: false, error: 'Thiếu tên phòng' };
  if (!seat || seat < 1) return { success: false, error: 'Số chỗ ngồi không hợp lệ' };

  // Tìm AreaID từ areaName
  let areaID = null;
  if (areaName) {
    const area = await queryOne(
      `SELECT AreaID FROM Area WHERE AreaName LIKE '%' || @name || '%' AND Visible=1 LIMIT 1`,
      { name: areaName }
    );
    if (!area) return { success: false, error: `Không tìm thấy khu vực "${areaName}". Hãy dùng tên chính xác hơn.` };
    areaID = area.AreaID;
  } else {
    const firstArea = await queryOne(`SELECT AreaID FROM Area WHERE Visible=1 LIMIT 1`, {});
    areaID = firstArea?.AreaID;
  }

  const dup = await queryOne(`SELECT RoomID FROM Room WHERE RoomName = @name AND Visible=1`, { name: name.trim() });
  if (dup) return { success: false, error: `Phòng tên "${name}" đã tồn tại` };

  const result = await execute(
    `INSERT INTO Room (AreaID, RoomName, Seat, IsVIP, Desc, Visible)
     VALUES (@areaID, @name, @seat, @isVIP, @desc, 1)`,
    { areaID, name: name.trim(), seat: parseInt(seat), isVIP: isVIP ? 1 : 0, desc: description || '' }
  );

  const areaRow = await queryOne(`SELECT AreaName FROM Area WHERE AreaID=@id`, { id: areaID });
  return {
    success: true, roomID: result.lastInsertRowid,
    roomName: name.trim(), area: areaRow?.AreaName || '', seat: parseInt(seat),
    isVIP: !!isVIP,
  };
}

// ─── Admin Tool: Xem danh sách phòng ─────────────────────────────────────────
async function getRoomsTool({ search, areaName, isVIP }) {
  let sql = `SELECT r.RoomID, r.RoomName, r.Seat, r.IsVIP, r.Desc, a.AreaName
             FROM Room r LEFT JOIN Area a ON r.AreaID = a.AreaID
             WHERE r.Visible = 1`;
  const params = {};
  if (search) { sql += ` AND r.RoomName LIKE '%' || @search || '%'`; params.search = search; }
  if (areaName) { sql += ` AND a.AreaName LIKE '%' || @area || '%'`; params.area = areaName; }
  if (isVIP !== undefined && isVIP !== null) { sql += ` AND r.IsVIP = @vip`; params.vip = isVIP ? 1 : 0; }
  sql += ` ORDER BY a.AreaName, r.RoomName LIMIT 20`;

  const rooms = await query(sql, params);
  if (!rooms.length) return { found: false, message: 'Không tìm thấy phòng nào phù hợp.' };
  return {
    found: true, total: rooms.length,
    rooms: rooms.map(r => ({
      roomID: r.RoomID, name: r.RoomName, area: r.AreaName,
      seat: r.Seat, isVIP: r.IsVIP === 1, desc: r.Desc || '',
    })),
  };
}

// ─── Admin Tool: Xem thiết bị phòng ──────────────────────────────────────────
async function getEquipmentTool({ roomName }) {
  if (!roomName?.trim()) return { error: 'Thiếu tên phòng' };

  const room = await queryOne(
    `SELECT r.RoomID, r.RoomName, a.AreaName
     FROM Room r LEFT JOIN Area a ON r.AreaID = a.AreaID
     WHERE r.RoomName LIKE '%' || @name || '%' AND r.Visible = 1 LIMIT 1`,
    { name: roomName.trim() }
  );
  if (!room) return { found: false, message: `Không tìm thấy phòng "${roomName}"` };

  const equipment = await query(
    `SELECT EquipmentID, Name, Quantity, Note FROM Equipment WHERE RoomID = @roomID AND Visible = 1`,
    { roomID: room.RoomID }
  );

  if (!equipment.length) return {
    found: true, roomName: room.RoomName, area: room.AreaName,
    message: `Phòng ${room.RoomName} chưa có thiết bị nào được đăng ký.`,
    equipment: [],
  };

  return {
    found: true, roomName: room.RoomName, area: room.AreaName,
    equipment: equipment.map(e => ({ id: e.EquipmentID, name: e.Name, quantity: e.Quantity, note: e.Note || '' })),
  };
}

// ─── Admin Tool: Xem danh sách người dùng ────────────────────────────────────
async function getUsersTool({ search, limit }) {
  let sql = `SELECT u.UserID, u.FullName, u.Email, u.Roles, f.FacultyName
             FROM "User" u LEFT JOIN Faculty f ON u.FacultyID = f.FacultyID
             WHERE u.Visible = 1`;
  const params = {};
  if (search) {
    sql += ` AND (u.FullName LIKE '%' || @search || '%' OR u.UserID LIKE '%' || @search || '%' OR u.Email LIKE '%' || @search || '%')`;
    params.search = search;
  }
  sql += ` ORDER BY u.Roles DESC, u.FullName LIMIT @lim`;
  params.lim = parseInt(limit) || 15;

  const users = await query(sql, params);
  if (!users.length) return { found: false, message: 'Không tìm thấy người dùng.' };

  return {
    found: true, total: users.length,
    users: users.map(u => ({
      userID: u.UserID, name: u.FullName || '', email: u.Email || '',
      role: u.Roles === 1 ? 'Admin' : 'User', faculty: u.FacultyName || '',
    })),
  };
}

// ─── Tool Schema (OpenAI format) ──────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_available_rooms',
      description: 'Tìm phòng họp còn trống theo thời gian và sức chứa. Gọi khi user muốn tìm phòng. Nếu chưa biết thời lượng, dùng 60 phút để search tạm, nhưng VẪN PHẢI hỏi user thời lượng thực tế sau đó (Bước 4a).',
      parameters: {
        type: 'object',
        properties: {
          date:            { type: 'string',  description: 'Ngày họp định dạng YYYY-MM-DD' },
          startTime:       { type: 'string',  description: 'Giờ bắt đầu HH:mm, ví dụ: 14:30' },
          durationMinutes: { type: 'number',  description: 'Thời lượng phút. "8h đến 10h"=120. Nếu chưa biết, dùng 60 (để tìm phòng tạm thời).' },
          minSeat:         { type: 'number',  description: 'Số chỗ tối thiểu cần có. Mặc định 1 nếu không biết.' },
          roomName:        { type: 'string',  description: 'Tên phòng để lọc (tuỳ chọn, chỉ truyền khi user chỉ định cụ thể)' },
        },
        required: ['date', 'startTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_room',
      description: 'Đặt phòng vào hệ thống. CHỈ gọi sau khi user đã XÁC NHẬN tóm tắt đặt phòng.',
      parameters: {
        type: 'object',
        properties: {
          roomID:          { type: 'number',  description: 'ID phòng lấy từ kết quả search_available_rooms' },
          date:            { type: 'string',  description: 'Ngày YYYY-MM-DD' },
          startTime:       { type: 'string',  description: 'Giờ bắt đầu HH:mm' },
          durationMinutes: { type: 'number',  description: 'Thời lượng họp (phút). BẮT BUỘC phải hỏi user trước khi đặt nếu chưa biết.' },
          title:           { type: 'string',  description: 'Tiêu đề cuộc họp' },
          numberPerson:    { type: 'number',  description: 'Số người tham dự' },
          serviceRequest:  { type: 'string',  description: 'Yêu cầu dịch vụ thêm (máy chiếu, âm thanh, đồ uống...) nếu user có đề cập' },
        },
        required: ['roomID', 'date', 'startTime', 'durationMinutes', 'title', 'numberPerson'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_bookings',
      description: 'Xem lịch đặt phòng của người dùng. Dùng period để lọc: sắp tới, đã qua, hoặc tất cả.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Khoảng thời gian: "upcoming" (sắp tới, mặc định) | "past" (đã qua, lịch sử) | "all" (tất cả)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_booking',
      description: 'Huỷ một lịch đặt phòng theo ID.',
      parameters: {
        type: 'object',
        properties: {
          lineRoomID: { type: 'number', description: 'ID lịch đặt cần huỷ (lấy từ get_my_bookings)' },
        },
        required: ['lineRoomID'],
      },
    },
  },
];

// ─── Admin Tool Schema ────────────────────────────────────────────────────────
const ADMIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_all_bookings',
      description: 'Admin: Xem tất cả lịch đặt phòng của mọi người. Có thể lọc theo ngày hoặc trạng thái.',
      parameters: {
        type: 'object',
        properties: {
          date:   { type: 'string', description: 'Lọc theo ngày YYYY-MM-DD (tuỳ chọn)' },
          status: { type: 'string', description: 'Lọc theo trạng thái: pending | approved | rejected (tuỳ chọn)' },
          limit:  { type: 'number', description: 'Số kết quả tối đa. Mặc định 10.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_booking',
      description: 'Admin: Duyệt một lịch đặt phòng VIP đang chờ duyệt (Status = Chờ duyệt).',
      parameters: {
        type: 'object',
        properties: {
          lineRoomID: { type: 'number', description: 'ID lịch đặt cần duyệt (lấy từ get_all_bookings)' },
        },
        required: ['lineRoomID'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reject_booking',
      description: 'Admin: Từ chối một lịch đặt phòng VIP đang chờ duyệt.',
      parameters: {
        type: 'object',
        properties: {
          lineRoomID: { type: 'number', description: 'ID lịch đặt cần từ chối (lấy từ get_all_bookings)' },
        },
        required: ['lineRoomID'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_statistics',
      description: 'Admin: Xem thống kê lịch đặt phòng (tổng số, chờ duyệt, top phòng...).',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Khoảng thời gian: today | week | month. Mặc định today.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_room',
      description: 'Admin: Thêm phòng họp mới vào hệ thống. Hỏi xác nhận admin trước khi gọi.',
      parameters: {
        type: 'object',
        properties: {
          name:        { type: 'string',  description: 'Tên phòng họp (ví dụ: Phòng họp B305)' },
          areaName:    { type: 'string',  description: 'Tên khu vực (ví dụ: Khu A, Khu B). Nếu không biết để trống.' },
          seat:        { type: 'number',  description: 'Số chỗ ngồi tối đa' },
          isVIP:       { type: 'boolean', description: 'Phòng VIP yêu cầu phê duyệt? Mặc định false.' },
          description: { type: 'string',  description: 'Mô tả phòng (tuỳ chọn)' },
        },
        required: ['name', 'seat'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rooms',
      description: 'Admin: Xem danh sách phòng họp trong hệ thống, có thể lọc theo tên hoặc khu vực.',
      parameters: {
        type: 'object',
        properties: {
          search:   { type: 'string',  description: 'Tìm kiếm theo tên phòng (tuỳ chọn)' },
          areaName: { type: 'string',  description: 'Lọc theo khu vực (tuỳ chọn)' },
          isVIP:    { type: 'boolean', description: 'Lọc chỉ phòng VIP (tuỳ chọn)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_equipment',
      description: 'Admin: Xem danh sách thiết bị của một phòng họp cụ thể (máy chiếu, điều hòa, bảng, micro...).',
      parameters: {
        type: 'object',
        properties: {
          roomName: { type: 'string', description: 'Tên phòng cần xem thiết bị (ví dụ: A101, Phòng họp B)' },
        },
        required: ['roomName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_users',
      description: 'Admin: Xem danh sách người dùng trong hệ thống. Có thể tìm kiếm theo tên, mã số hoặc email.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Từ khoá tìm kiếm: tên, mã số, email (tuỳ chọn)' },
          limit:  { type: 'number', description: 'Số kết quả tối đa. Mặc định 15.' },
        },
        required: [],
      },
    },
  },
];

// ─── Helper: sleep ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── ReAct loop ───────────────────────────────────────────────────────────────
async function runAI({ messages, systemPrompt, userID, tools }) {
  const groq = getGroq();
  const all = [{ role: 'system', content: systemPrompt }, ...messages];
  let bookingResult = null;
  let pendingData = null;

  for (let i = 0; i < 6; i++) {
    let resp;
    try {
      // Thử model chính (70b) trước, nếu rate-limit thì fallback sang 8b
      let lastErr;
      for (const [modelName, delayMs] of [
        [MODEL_PRIMARY,  0],
        [MODEL_FALLBACK, 1500],
      ]) {
        if (delayMs) await sleep(delayMs);
        try {
          resp = await groq.chat.completions.create({
            model: modelName,
            messages: all,
            tools,
            tool_choice: 'auto',
            max_tokens: 1200,
            temperature: 0.2,
          });
          lastErr = null;
          break; // thành công → thoát vòng retry
        } catch (e) {
          lastErr = e;
          const isRateLimit = e.status === 429 || e.message?.includes('rate limit') || e.message?.includes('Rate limit');
          if (!isRateLimit) break; // lỗi khác → không retry
          console.warn(`[Chat] Rate limit on ${modelName}, retrying with fallback...`);
        }
      }
      if (lastErr) throw lastErr;
    } catch (apiErr) {
      console.error('[Chat] Groq API error in loop:', apiErr.message?.slice(0, 120));
      const isToolFmt  = apiErr.message?.includes('tool call validation failed');
      const isRateLimit = apiErr.status === 429 || apiErr.message?.includes('rate limit');
      return {
        reply: isToolFmt
          ? 'Tôi chưa hiểu rõ yêu cầu. Bạn có thể thử diễn đạt lại không?'
          : isRateLimit
            ? 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳'
            : 'AI gặp lỗi tạm thời, vui lòng thử lại.',
        bookingResult, pendingData, history: all.slice(1),
      };
    }

    const msg = resp.choices[0].message;

    // Normalize — không push tool_calls: null (gây lỗi Groq ở turn tiếp theo)
    const norm = { role: msg.role, content: msg.content ?? '' };
    if (msg.tool_calls?.length) norm.tool_calls = msg.tool_calls;
    all.push(norm);

    // Không có tool call → AI đã trả lời xong
    if (!msg.tool_calls?.length) {
      return { reply: msg.content || '', bookingResult, pendingData, history: all.slice(1) };
    }

    // Thực thi từng tool
    for (const tc of msg.tool_calls) {
      let args = {};
      try {
        const parsed = JSON.parse(tc.function.arguments);
        if (parsed !== null && typeof parsed === 'object') args = parsed;
      } catch (_) {}

      let result;
      switch (tc.function.name) {
        case 'search_available_rooms': result = await searchAvailableRooms(args); break;
        case 'book_room':              result = await bookRoom({ ...args, userID }); break;
        case 'get_my_bookings':        result = await getMyBookings({ userID }); break;
        case 'cancel_booking':         result = await cancelBooking({ ...args, userID }); break;
        case 'get_all_bookings':       result = await getAllBookings(args); break;
        case 'approve_booking':        result = await approveBooking({ ...args, adminID: userID }); break;
        case 'reject_booking':         result = await rejectBooking({ ...args, adminID: userID }); break;
        case 'get_statistics':         result = await getStatistics(args); break;
        case 'add_room':               result = await addRoomTool(args); break;
        case 'get_rooms':              result = await getRoomsTool(args); break;
        case 'get_equipment':          result = await getEquipmentTool(args); break;
        case 'get_users':              result = await getUsersTool(args); break;
        default:                       result = { error: 'Tool không tồn tại' };
      }

      if (result?.success === true && result?.lineRoomID) bookingResult = result;
      // Track pending bookings for admin inline action cards
      if (tc.function.name === 'get_all_bookings' && result?.found) {
        const pending = result.bookings?.filter(b => b.status === 'Chờ duyệt');
        if (pending?.length) pendingData = pending;
      }
      all.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  return { reply: '', bookingResult, pendingData, history: all.slice(1) };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    if (!getGroq()) return error(res, 'GROQ_API_KEY chưa cấu hình trong .env', 503);

    const { message } = req.body;
    if (!message?.trim()) return badRequest(res, 'Thiếu nội dung tin nhắn');

    const userID   = req.user?.userID   || 'guest';
    const userName = req.user?.fullName || 'Bạn';
    const isAdmin  = req.user?.roles === 1;

    // Xây date strings dùng local time (KHÔNG dùng toISOString → UTC sai 7 tiếng)
    const now  = new Date();
    const pad  = n => String(n).padStart(2, '0');
    const fmt  = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const t1   = new Date(now); t1.setDate(now.getDate() + 1);
    const t2   = new Date(now); t2.setDate(now.getDate() + 2);
    const t3   = new Date(now); t3.setDate(now.getDate() + 3);
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    const userSystemPrompt = [
      `Bạn là AI Booking Assistant — trợ lý đặt phòng họp thông minh của hệ thống AMIS Meeting Room.`,
      ``,
      `=== THÔNG TIN THỜI GIAN HIỆN TẠI ===`,
      `Hôm nay:    ${fmt(now)} | ${days[now.getDay()]} | Giờ hiện tại: ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      `Ngày mai:   ${fmt(t1)} | ${days[t1.getDay()]}`,
      `Ngày kia:   ${fmt(t2)} | ${days[t2.getDay()]}`,
      `3 ngày nữa: ${fmt(t3)} | ${days[t3.getDay()]}`,
      `Người dùng: ${userName} (userID: ${userID})`,
      ``,
      `=== LUỒNG ĐẶT PHÒNG (BẮT BUỘC TUÂN THEO ĐÚNG THỨ TỰ) ===`,
      ``,
      `── BƯỚC 1: TRÍCH XUẤT THÔNG TIN ──`,
      `Từ câu user, nhận diện tự động: ngày, giờ bắt đầu, thời lượng, số người.`,
      `Quy tắc giờ:`,
      `  "sáng mai"       = ${fmt(t1)}, 08:00`,
      `  "chiều nay"      = ${fmt(now)}, 13:00`,
      `  "chiều mai"      = ${fmt(t1)}, 13:00`,
      `  "tối nay"        = ${fmt(now)}, 18:00`,
      `  "2h30" / "2 rưỡi chiều" = 14:30`,
      `  "8h đến 10h"    → startTime=08:00, durationMinutes=120`,
      `  "1 tiếng rưỡi"  → durationMinutes=90`,
      `Giờ phục vụ: 07:00–21:00. Nếu ngoài khung → thông báo ngay.`,
      ``,
      `── BƯỚC 2: HỎI KHI THIẾU NGÀY / GIỜ ──`,
      `- Thiếu ngày → hỏi "Bạn muốn đặt ngày nào?" (chỉ hỏi 1 câu).`,
      `- Thiếu giờ bắt đầu → hỏi "Bạn muốn bắt đầu từ mấy giờ?" (chỉ hỏi 1 câu).`,
      `- Thiếu số người → KHÔNG hỏi, dùng minSeat=1 để search.`,
      ``,
      `── BƯỚC 3: TÌM PHÒNG (search_available_rooms) ──`,
      `Gọi ngay khi đã có ngày + giờ. Sau đó:`,
      `- Nhiều phòng → hiển thị ≤4 phòng với thông tin (tên, khu vực, sức chứa, VIP), hỏi "Bạn muốn chọn phòng nào?"`,
      `- 1 phòng      → đề xuất phòng đó, hỏi "Bạn muốn chọn phòng này không?"`,
      `- Không có    → thông báo, gợi ý đổi giờ hoặc đổi ngày.`,
      ``,
      `── BƯỚC 4: THU THẬP THÔNG TIN CÒN THIẾU (SAU KHI USER CHỌN PHÒNG) ──`,
      `Sau khi user chọn phòng cụ thể, hỏi TUẦN TỰ (mỗi lần 1 câu) cho đến khi có đủ:`,
      ``,
      `  4a. THỜI LƯỢNG — Nếu chưa biết (user chưa nói "1 tiếng", "2h", "từ 14h đến 16h"...):`,
      `      → Hỏi: "Cuộc họp kéo dài bao lâu? (ví dụ: 1 tiếng, 90 phút, 2 tiếng...)"`,
      ``,
      `  4b. TIÊU ĐỀ — Nếu chưa biết mục đích/tên cuộc họp:`,
      `      → Hỏi: "Tên hoặc chủ đề cuộc họp là gì? (Enter để bỏ qua)"`,
      `      → Nếu user bỏ qua hoặc không trả lời tiêu đề → dùng mặc định "Cuộc họp"`,
      ``,
      `  4c. YÊU CẦU DỊCH VỤ — Hỏi 1 lần:`,
      `      → Hỏi: "Bạn có cần thêm dịch vụ gì không? (ví dụ: máy chiếu, micro, đồ uống, bảng viết...) Gõ 'không' để bỏ qua."`,
      `      → Nếu user nói không cần / bỏ qua → serviceRequest = null`,
      ``,
      `  QUAN TRỌNG: Hỏi theo thứ tự 4a → 4b → 4c. Đừng hỏi nhiều thứ cùng 1 lúc.`,
      ``,
      `── BƯỚC 5: TÓM TẮT & XÁC NHẬN (BẮT BUỘC TRƯỚC KHI ĐẶT) ──`,
      `Sau khi đủ thông tin, LUÔN hiển thị tóm tắt và chờ user xác nhận:`,
      ``,
      `  📋 **Xác nhận đặt phòng:**`,
      `  • Phòng:      [Tên phòng] – [Khu vực]`,
      `  • Ngày:       [Thứ X, DD/MM/YYYY]`,
      `  • Thời gian:  [HH:mm] → [HH:mm] ([N] phút)`,
      `  • Số người:   [N] người`,
      `  • Tiêu đề:    [Tiêu đề]`,
      `  • Dịch vụ:    [Dịch vụ yêu cầu hoặc "Không có"]`,
      ``,
      `  **Bạn xác nhận đặt phòng này không?**`,
      ``,
      `── BƯỚC 6: ĐẶT PHÒNG (book_room) ──`,
      `CHỈ gọi book_room khi user nói: "có", "đúng", "xác nhận", "đặt đi", "ok", "đồng ý", "ừ".`,
      `TUYỆT ĐỐI không gọi book_room trước khi user xác nhận tóm tắt ở Bước 5.`,
      ``,
      `── BƯỚC 7: XỬ LÝ TRÙNG LỊCH ──`,
      `Nếu book_room trả về conflict=true → thông báo phòng vừa bị đặt, gợi ý alternatives.`,
      ``,
      `── NGOẠI LỆ: USER CUNG CẤP ĐỦ THÔNG TIN NGAY TỪ ĐẦU ──`,
      `Nếu ngay câu đầu user đã nói đủ: phòng + ngày + giờ bắt đầu + thời lượng + tiêu đề`,
      `→ Bỏ qua Bước 2 và 4a+4b, chỉ hỏi dịch vụ (4c) rồi chuyển thẳng đến Bước 5 tóm tắt.`,
      ``,
      `=== CÁC CHỨC NĂNG KHÁC ===`,
      ``,
      `XEM LỊCH SẮP TỚI: "lịch của tôi" / "tôi có lịch gì" / "lịch sắp tới" → get_my_bookings(period="upcoming")`,
      ``,
      `XEM LỊCH SỬ: "lịch đã đặt" / "lịch cũ" / "những lịch đã từng đặt" / "lịch quá khứ" / "lịch tuần trước" → get_my_bookings(period="past")`,
      ``,
      `XEM TẤT CẢ: "toàn bộ lịch" / "tất cả lịch của tôi" → get_my_bookings(period="all")`,
      ``,
      `HUỶ LỊCH: user muốn huỷ → get_my_bookings(period="upcoming") → hỏi xác nhận → cancel_booking.`,
      ``,
      `NGOÀI CHỦ ĐỀ: Câu hỏi không liên quan đến phòng họp → trả lời:`,
      `"Tôi là trợ lý đặt phòng họp, chỉ hỗ trợ tìm kiếm, đặt và huỷ phòng họp ạ."`,
      ``,
      `Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Dùng emoji vừa phải để dễ đọc.`,
    ].join('\n');

    const adminSystemPrompt = [
      `Bạn là AI Admin Assistant — trợ lý quản trị thông minh của hệ thống AMIS Meeting Room.`,
      ``,
      `=== THÔNG TIN THỜI GIAN HIỆN TẠI ===`,
      `Hôm nay:    ${fmt(now)} | ${days[now.getDay()]} | Giờ hiện tại: ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      `Ngày mai:   ${fmt(t1)} | ${days[t1.getDay()]}`,
      `Admin:      ${userName} (userID: ${userID})`,
      ``,
      `=== CHỨC NĂNG QUẢN LÝ (ƯU TIÊN CHÍNH) ===`,
      ``,
      `📋 XEM LỊCH ĐẶT:`,
      `- "Lịch chờ duyệt" / "Pending" / "Có bao nhiêu lịch chờ" → get_all_bookings(status="pending")`,
      `- "Lịch hôm nay" → get_all_bookings(date="${fmt(now)}")`,
      `- "Tất cả lịch" / "Xem lịch ngày [X]" → get_all_bookings(...)`,
      `- Khi hiển thị danh sách: luôn ghi rõ LineRoomID, tên lịch, phòng, người đặt, thời gian, trạng thái.`,
      `- Với lịch pending: gợi ý "Duyệt lịch [ID]" hoặc "Từ chối lịch [ID]".`,
      ``,
      `✅ DUYỆT / TỪ CHỐI:`,
      `- "Duyệt lịch [ID]" / "Approve [ID]" → approve_booking(lineRoomID=ID)`,
      `- "Từ chối lịch [ID]" / "Reject [ID]" → reject_booking(lineRoomID=ID)`,
      `- "Duyệt tất cả" → hỏi xác nhận từng cái, KHÔNG gọi approve cho tất cả ngay.`,
      `- Sau khi duyệt/từ chối: thông báo kết quả ngắn gọn.`,
      ``,
      `📊 THỐNG KÊ:`,
      `- "Thống kê" / "Hôm nay bao nhiêu lịch" → get_statistics(period="today")`,
      `- "Thống kê tuần" → get_statistics(period="week")`,
      `- "Thống kê tháng" → get_statistics(period="month")`,
      ``,
      `🏢 QUẢN LÝ PHÒNG:`,
      `- "Danh sách phòng" / "Phòng ở khu [X]" → get_rooms(areaName=...)`,
      `- "Thêm phòng" / "Tạo phòng mới" → hỏi: tên phòng, khu vực, số chỗ, có VIP không → xác nhận → add_room(...)`,
      `- Với add_room: PHẢI hỏi xác nhận đầy đủ thông tin trước khi gọi.`,
      ``,
      `🔧 THIẾT BỊ PHÒNG:`,
      `- "Thiết bị phòng [X]" / "Phòng A101 có gì" / "Kiểm tra thiết bị [X]" → get_equipment(roomName="[X]")`,
      `- Liệt kê tên thiết bị và số lượng rõ ràng.`,
      ``,
      `👥 QUẢN LÝ NGƯỜI DÙNG:`,
      `- "Danh sách người dùng" / "Tìm user [tên]" → get_users(search=...)`,
      `- "Có bao nhiêu user" → get_users() rồi đếm total`,
      `- Phân biệt role Admin vs User trong kết quả.`,
      ``,
      `=== ĐẶT PHÒNG CHO BẢN THÂN (LUỒNG RÚT GỌN) ===`,
      `Admin có thể đặt phòng cho chính mình. Quy trình:`,
      `1. Trích xuất ngày + giờ từ yêu cầu → search_available_rooms`,
      `2. Đề xuất phòng → admin chọn`,
      `3. Hỏi thời lượng nếu chưa biết, tiêu đề (tuỳ chọn), dịch vụ (tuỳ chọn)`,
      `4. Hiển thị tóm tắt → xác nhận → book_room`,
      `KHÔNG gọi book_room trước khi admin xác nhận.`,
      ``,
      `Xem lịch cá nhân: get_my_bookings(period="upcoming"|"past"|"all") — giống user thường.`,
      ``,
      `=== QUY TẮC CHUNG ===`,
      `- Trả lời ngắn gọn, súc tích, dùng tiếng Việt.`,
      `- Dùng emoji vừa phải.`,
      `- Giờ phục vụ: 07:00–21:00.`,
      `- Câu hỏi ngoài phạm vi hệ thống: "Tôi chỉ hỗ trợ quản lý phòng họp ạ."`,
    ].join('\n');

    const systemPrompt = isAdmin ? adminSystemPrompt : userSystemPrompt;
    const tools    = isAdmin ? [...TOOLS, ...ADMIN_TOOLS] : TOOLS;

    const session  = getSession(userID);
    const messages = [...session.messages, { role: 'user', content: message }];

    const { reply, bookingResult, pendingData, history } = await runAI({ messages, systemPrompt, userID, tools });

    const isBookingSuccess = !!(bookingResult?.success && bookingResult?.lineRoomID);
    const finalReply = reply || 'Xin lỗi, tôi chưa hiểu rõ yêu cầu. Bạn có thể nói rõ hơn không?';

    // Lưu toàn bộ history kể cả function call để turn sau có đủ context
    const saved = reply ? history : [...history, { role: 'assistant', content: finalReply }];
    session.messages = saved.length > 40 ? saved.slice(-40) : saved;

    try {
      await execute(
        `INSERT INTO AI_Chat_Log (UserID, UserMessage, BotReply, AI_JSON, CreateDate)
         VALUES (@userID, @msg, @reply, @reply, datetime('now','localtime'))`,
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
    // Không expose raw Groq/JS errors ra client
    const raw = err.message || '';
    let msg = 'AI đang gặp sự cố, vui lòng thử lại.';
    if (raw.includes('tool call validation failed') || raw.includes('invalid_request_error')) {
      msg = 'AI không thể xử lý yêu cầu theo cách này. Vui lòng thử diễn đạt khác.';
    } else if (raw.includes('rate limit') || raw.includes('quota') || err.status === 429) {
      msg = 'AI đang quá tải, vui lòng thử lại sau vài giây ⏳';
    } else if (raw.includes('GROQ_API_KEY') || raw.includes('API key')) {
      msg = 'Chưa cấu hình API key AI.';
    }
    return error(res, msg, 500);
  }
};

const clearSession = (userID) => sessionStore.delete(userID);

const getHistory = async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return error(res, 'Chưa xác thực', 401);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const rows = await query(
      `SELECT LogID, UserMessage, BotReply, CreateDate
       FROM AI_Chat_Log
       WHERE UserID = @userID
       ORDER BY CreateDate DESC
       LIMIT @limit`,
      { userID, limit }
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { sendMessage, clearSession, getHistory };
