/**
 * migrate.js — Chạy migration bổ sung các cột/bảng mới vào DB đã có
 * Chạy: node src/config/migrate.js
 * An toàn để chạy nhiều lần (idempotent)
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/meeting_booking.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🚀 Running migrations...');

// Helper: thêm cột nếu chưa tồn tại
function addColumnIfNotExists(table, column, definition) {
  const cols = db.pragma(`table_info(${table})`).map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition}`);
    console.log(`  ✅ Added ${table}.${column}`);
  } else {
    console.log(`  ⏭️  ${table}.${column} already exists`);
  }
}

// Helper: tạo bảng nếu chưa có
function createTableIfNotExists(sql, tableName) {
  db.exec(sql);
  console.log(`  ✅ Table ${tableName} ready`);
}

// ─── Migration 1: LineRoom — thêm Status, ApprovedBy, ApprovedAt, RecurringGroupID ───
console.log('\n[1] LineRoom status & approval columns');
addColumnIfNotExists('LineRoom', 'Status', 'INTEGER DEFAULT 1');
// Status: 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
addColumnIfNotExists('LineRoom', 'ApprovedBy', 'TEXT DEFAULT NULL');
addColumnIfNotExists('LineRoom', 'ApprovedAt', 'TEXT DEFAULT NULL');
addColumnIfNotExists('LineRoom', 'RecurringGroupID', 'INTEGER DEFAULT NULL');
addColumnIfNotExists('LineRoom', 'RecurringType', 'TEXT DEFAULT NULL');
// RecurringType: null=none, 'daily', 'weekly', 'monthly'
addColumnIfNotExists('LineRoom', 'RecurringEnd', 'TEXT DEFAULT NULL');

// ─── Migration 2: Room — thêm IsVIP ───────────────────────────────────────────
console.log('\n[2] Room.IsVIP column');
addColumnIfNotExists('Room', 'IsVIP', 'INTEGER DEFAULT 0');

// ─── Migration 3: Bảng Equipment ─────────────────────────────────────────────
console.log('\n[3] Equipment table');
createTableIfNotExists(`
  CREATE TABLE IF NOT EXISTS "Equipment" (
    EquipmentID  INTEGER PRIMARY KEY AUTOINCREMENT,
    RoomID       INTEGER NOT NULL REFERENCES Room(RoomID),
    Name         TEXT    NOT NULL,
    Icon         TEXT    DEFAULT 'fa-cube',
    Quantity     INTEGER DEFAULT 1,
    Note         TEXT    DEFAULT '',
    Visible      INTEGER DEFAULT 1
  );
`, 'Equipment');

// ─── Migration 4: Bảng BookingAttendee ───────────────────────────────────────
console.log('\n[4] BookingAttendee table');
createTableIfNotExists(`
  CREATE TABLE IF NOT EXISTS "BookingAttendee" (
    AttendeeID   INTEGER PRIMARY KEY AUTOINCREMENT,
    LineRoomID   INTEGER NOT NULL REFERENCES LineRoom(LineRoomID) ON DELETE CASCADE,
    UserID       TEXT    NOT NULL REFERENCES "User"(UserID),
    Status       INTEGER DEFAULT 0,
    -- Status: 0=Invited, 1=Accepted, 2=Declined
    InvitedAt    TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(LineRoomID, UserID)
  );
`, 'BookingAttendee');

// ─── Seed thiết bị mẫu cho các phòng hiện có ─────────────────────────────────
console.log('\n[5] Seed sample equipment');
const existingEquip = db.prepare('SELECT COUNT(*) AS c FROM Equipment').get();
if (existingEquip.c === 0) {
  const rooms = db.prepare('SELECT RoomID FROM Room WHERE Visible = 1').all();
  const insertEquip = db.prepare(
    `INSERT INTO Equipment (RoomID, Name, Icon, Quantity) VALUES (?, ?, ?, ?)`
  );
  for (const room of rooms) {
    insertEquip.run(room.RoomID, 'Máy chiếu', 'fa-desktop', 1);
    insertEquip.run(room.RoomID, 'Bảng trắng', 'fa-chalkboard', 1);
    insertEquip.run(room.RoomID, 'Điều hòa', 'fa-wind', 1);
  }
  // Phòng đầu tiên thêm thêm thiết bị
  if (rooms.length > 0) {
    insertEquip.run(rooms[0].RoomID, 'Micro không dây', 'fa-microphone', 2);
    insertEquip.run(rooms[0].RoomID, 'Tivi 65 inch', 'fa-tv', 1);
    insertEquip.run(rooms[0].RoomID, 'Hệ thống loa', 'fa-volume-up', 1);
  }
  console.log('  ✅ Equipment seeded');
} else {
  console.log('  ⏭️  Equipment already seeded');
}

// ─── Migration 5: LineRoom — thêm RejectReason ───────────────────────────────
console.log('\n[5b] LineRoom.RejectReason column');
addColumnIfNotExists('LineRoom', 'RejectReason', 'TEXT DEFAULT NULL');

// ─── Migration 6: LineRoom — ServiceRequest ───────────────────────────────────
console.log('\n[6] LineRoom.ServiceRequest column');
addColumnIfNotExists('LineRoom', 'ServiceRequest', 'TEXT DEFAULT NULL');

// ─── Migration 7: Room — VIPCondition, VIPMinutes ────────────────────────────
console.log('\n[7] Room VIP condition columns');
addColumnIfNotExists('Room', 'VIPCondition', 'INTEGER DEFAULT 0');
// 0 = mọi cuộc họp đều cần duyệt, 1 = chỉ cuộc họp > VIPMinutes phút
addColumnIfNotExists('Room', 'VIPMinutes', 'INTEGER DEFAULT 60');

// ─── Migration 8: BookingAttachment ──────────────────────────────────────────
console.log('\n[8] BookingAttachment table');
createTableIfNotExists(`
  CREATE TABLE IF NOT EXISTS "BookingAttachment" (
    AttachmentID  INTEGER PRIMARY KEY AUTOINCREMENT,
    LineRoomID    INTEGER NOT NULL REFERENCES LineRoom(LineRoomID) ON DELETE CASCADE,
    FileName      TEXT    NOT NULL,
    FilePath      TEXT    NOT NULL,
    FileSize      INTEGER DEFAULT 0,
    MimeType      TEXT    DEFAULT '',
    UploadedAt    TEXT    DEFAULT (datetime('now','localtime')),
    UploadedBy    TEXT    DEFAULT ''
  );
`, 'BookingAttachment');

// ─── Migration 9: Setting table ──────────────────────────────────────────────
console.log('\n[9] Setting table');
db.exec(`
  CREATE TABLE IF NOT EXISTS "Setting" (
    "Key"   TEXT PRIMARY KEY,
    "Value" TEXT NOT NULL DEFAULT ''
  );
`);
// Seed defaults nếu chưa có
const defaults = [
  ['timeFormat',       '24h'],
  ['slotMinutes',      '30'],
  ['defaultDuration',  '60'],
  ['maxDuration',      '0'],
  ['timezone',         'Asia/Ho_Chi_Minh'],
  ['theme',            'dark'],
  ['workdayStart',     '07:00'],
  ['workdayEnd',       '21:00'],
];
const upsert = db.prepare(`INSERT OR IGNORE INTO "Setting"("Key","Value") VALUES (?,?)`);
for (const [k, v] of defaults) upsert.run(k, v);
console.log('  ✅ Setting table ready');

// ─── Update phòng A101 thành VIP ─────────────────────────────────────────────
const firstRoom = db.prepare('SELECT RoomID FROM Room LIMIT 1').get();
if (firstRoom) {
  db.prepare('UPDATE Room SET IsVIP = 1 WHERE RoomID = ?').run(firstRoom.RoomID);
  console.log('\n[6] Marked first room as VIP (requires approval)');
}

// ─── Migration 10b: AI_Chat_Log — thêm UserID + BotReply ─────────────────────
console.log('\n[10b] AI_Chat_Log columns');
db.exec(`
  CREATE TABLE IF NOT EXISTS "AI_Chat_Log" (
    LogID      INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID     TEXT    DEFAULT NULL,
    UserMessage TEXT   NOT NULL,
    BotReply   TEXT    DEFAULT NULL,
    AI_JSON    TEXT    DEFAULT NULL,
    CreateDate TEXT    DEFAULT (datetime('now','localtime'))
  );
`);
addColumnIfNotExists('AI_Chat_Log', 'UserID',   'TEXT DEFAULT NULL');
addColumnIfNotExists('AI_Chat_Log', 'BotReply', 'TEXT DEFAULT NULL');
console.log('  ✅ AI_Chat_Log ready');

// ─── Migration 10: Role table ─────────────────────────────────────────────────
console.log('\n[10] Role table');
db.exec(`
  CREATE TABLE IF NOT EXISTS "Role" (
    RoleID      INTEGER PRIMARY KEY AUTOINCREMENT,
    Name        TEXT    NOT NULL UNIQUE,
    Description TEXT    DEFAULT '',
    CreatedAt   TEXT    DEFAULT (datetime('now','localtime'))
  );
`);
// Seed 3 vai trò mặc định
const seedRoles = db.prepare(`INSERT OR IGNORE INTO "Role"(Name, Description) VALUES (?,?)`);
seedRoles.run('Quản trị ứng dụng',     'Toàn quyền thực hiện các chức năng trong ứng dụng');
seedRoles.run('Người quản lý đặt phòng', 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác');
seedRoles.run('Người đặt phòng',       'Có quyền cập nhật đặt phòng của chính mình');
console.log('  ✅ Role table ready');

db.close();
console.log('\n🎉 All migrations completed!');
