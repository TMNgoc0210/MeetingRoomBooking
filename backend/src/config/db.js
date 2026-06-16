/**
 * config/db.js — Kết nối PostgreSQL & helper query
 * Giữ nguyên interface: query / queryOne / execute
 * Params dùng @name style (giống SQL Server) — tự động convert sang $1,$2 cho pg
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

// ─── Key normalizer: postgres trả về lowercase, map về PascalCase ──────────
const KEY_MAP = {
  userid: 'UserID', fullname: 'FullName', facultyid: 'FacultyID',
  facultyname: 'FacultyName', roomid: 'RoomID', roomname: 'RoomName',
  areaid: 'AreaID', areaname: 'AreaName', lineroomid: 'LineRoomID',
  bookingid: 'BookingID', equipmentid: 'EquipmentID', attachmentid: 'AttachmentID',
  attendeeid: 'AttendeeID', roleid: 'RoleID', logid: 'LogID',
  userroleid: 'UserRoleID', password: 'Password', mobi: 'Mobi',
  email: 'Email', avatar: 'Avatar', visible: 'Visible', roles: 'Roles',
  createdate: 'CreateDate', createby: 'CreateBy', seat: 'Seat',
  phonecall: 'PhoneCall', videocall: 'VideoCall', isvip: 'IsVIP',
  vipcondition: 'VIPCondition', vipminutes: 'VIPMinutes', desc: 'Desc',
  timestart: 'TimeStart', timeend: 'TimeEnd', title: 'Title',
  content: 'Content', note: 'Note', numberperson: 'NumberPerson',
  status: 'Status', approvedby: 'ApprovedBy', approvedat: 'ApprovedAt',
  rejectreason: 'RejectReason', servicerequest: 'ServiceRequest',
  recurringgroupid: 'RecurringGroupID', recurringtype: 'RecurringType',
  recurringend: 'RecurringEnd', remindersent: 'ReminderSent',
  cancelledat: 'CancelledAt', username: 'UserName', useravatar: 'UserAvatar',
  roomavatar: 'RoomAvatar', organizername: 'OrganizerName',
  bookingcount: 'bookingCount', totalhours: 'totalHours',
  total: 'total', cnt: 'cnt', ok: 'ok', c: 'c',
  filename: 'FileName', filepath: 'FilePath', filesize: 'FileSize',
  mimetype: 'MimeType', uploadedat: 'UploadedAt', uploadedby: 'UploadedBy',
  invitedat: 'InvitedAt', name: 'Name', description: 'Description',
  createdat: 'CreatedAt', icon: 'Icon', quantity: 'Quantity',
  assignedat: 'AssignedAt', _rolestr: '_roleStr', key: 'Key', value: 'Value',
  usermessage: 'UserMessage', botreply: 'BotReply', ai_json: 'AI_JSON',
  ip: 'IP', reason: 'Reason', ownerid: 'OwnerID', bookedby: 'BookedBy',
  pending: 'pending', approved: 'approved', rejected: 'rejected',
  cancelled: 'cancelled', id: 'id', ping: 'ping', lim: 'lim',
};

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[KEY_MAP[k] ?? k] = v;
  }
  return out;
}

// Convert @name → $1, $2 (same @name có thể dùng nhiều lần → cùng $N)
function convertParams(sqlStr, params) {
  const values = [];
  const seen = {};
  const sql = sqlStr.replace(/@(\w+)/g, (_, key) => {
    if (key in seen) return `$${seen[key]}`;
    values.push(params[key] ?? null);
    seen[key] = values.length;
    return `$${values.length}`;
  });
  return { sql, values };
}

// Lấy ID từ row RETURNING — tìm field đầu tiên kết thúc bằng 'id'
function extractId(row) {
  if (!row) return null;
  for (const [k, v] of Object.entries(row)) {
    if (/id$/i.test(k) && Number.isInteger(v)) return v;
  }
  return null;
}

const query = async (sqlStr, params = {}) => {
  const { sql, values } = convertParams(sqlStr, params);
  const res = await pool.query(sql, values);
  return res.rows.map(normalizeRow);
};

const queryOne = async (sqlStr, params = {}) => {
  const rows = await query(sqlStr, params);
  return rows[0] ?? null;
};

const execute = async (sqlStr, params = {}) => {
  const isInsert = /^\s*INSERT\s/i.test(sqlStr.trim());
  const hasReturning = /RETURNING/i.test(sqlStr);
  const finalSql = (isInsert && !hasReturning) ? `${sqlStr} RETURNING *` : sqlStr;
  const { sql, values } = convertParams(finalSql, params);
  const res = await pool.query(sql, values);
  const rows = (res.rows || []).map(normalizeRow);
  return {
    recordset: rows,
    rowsAffected: [res.rowCount || 0],
    lastInsertRowid: extractId(res.rows?.[0]),
  };
};

module.exports = { query, queryOne, execute };
