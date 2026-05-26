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

// ─── Migration 11b: LineRoom.ReminderSent ────────────────────────────────────
console.log('\n[11b] LineRoom.ReminderSent column');
addColumnIfNotExists('LineRoom', 'ReminderSent', 'INTEGER DEFAULT 0');

// ─── Migration 11: UserRole table ─────────────────────────────────────────────
console.log('\n[11] UserRole table');
db.exec(`
  CREATE TABLE IF NOT EXISTS "UserRole" (
    UserRoleID  INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID      TEXT    NOT NULL REFERENCES "User"(UserID) ON DELETE CASCADE,
    RoleID      INTEGER NOT NULL REFERENCES "Role"(RoleID) ON DELETE CASCADE,
    AssignedAt  TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(UserID, RoleID)
  );
`);
// Gán admin vào vai trò "Quản trị ứng dụng"
const adminRoleRow = db.prepare(`SELECT RoleID FROM "Role" WHERE Name = 'Quản trị ứng dụng'`).get();
if (adminRoleRow) {
  db.prepare(`INSERT OR IGNORE INTO "UserRole" (UserID, RoleID) VALUES (?, ?)`).run('admin', adminRoleRow.RoleID);
}
console.log('  ✅ UserRole table ready');

// ─── Migration 12: Update room avatars → Unsplash URLs ───────────────────────
console.log('\n[12] Room avatars → online images');
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&h=400&fit=crop',
];
const roomsToUpdate = db.prepare('SELECT RoomID, Avatar FROM Room WHERE Visible=1 ORDER BY RoomID').all();
const updateAvatar = db.prepare('UPDATE Room SET Avatar=? WHERE RoomID=?');
roomsToUpdate.forEach((r, i) => {
  if (!r.Avatar || r.Avatar.startsWith('/uploads/') || r.Avatar === '') {
    updateAvatar.run(ROOM_IMAGES[i % ROOM_IMAGES.length], r.RoomID);
    console.log(`  ✅ Updated Room #${r.RoomID} avatar`);
  } else {
    console.log(`  ⏭️  Room #${r.RoomID} avatar already set`);
  }
});

// ─── Migration 13: Seed thêm khoa/đơn vị ─────────────────────────────────────
console.log('\n[13] Seed additional faculties');
const insertFacultyM = db.prepare(`INSERT OR IGNORE INTO Faculty (FacultyName, Visible) VALUES (?, 1)`);
for (const name of [
  'Khoa Cơ khí - Xây dựng',
  'Khoa Điện - Điện tử',
  'Khoa Hóa học - Thực phẩm',
  'Khoa Quản trị Kinh doanh',
  'Khoa Ngoại ngữ',
  'Phòng Hành chính - Nhân sự',
  'Phòng Tài chính - Kế toán',
  'Trung tâm Nghiên cứu & Phát triển',
]) insertFacultyM.run(name);
console.log('  ✅ Faculties seeded');

// ─── Migration 14: Seed thêm user test ───────────────────────────────────────
console.log('\n[14] Seed additional test users');
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('123456', 10);
const getFacID = (name) => db.prepare(`SELECT FacultyID FROM Faculty WHERE FacultyName LIKE '%'||?||'%' LIMIT 1`).get(name)?.FacultyID || null;

const newUsers = [
  ['ngocphan',   'Trần Minh Ngọc',      'minhngocphanme457@gmail.com',    'Công nghệ Thông tin'],
  ['ngocpro457', 'Nguyễn Minh Pro',      'minhngocpro457@gmail.com',       'Công nghệ Thông tin'],
  ['ngoctran457','Phan Ngọc Trần Minh',  'minhngocphanmetran457@gmail.com','Kinh tế'],
  ['user03',     'Lê Văn Cường',         'cuong.le@university.edu.vn',     'Công nghệ Thông tin'],
  ['user04',     'Phạm Thị Dung',        'dung.pham@university.edu.vn',    'Kinh tế'],
  ['user05',     'Hoàng Minh Đức',       'duc.hoang@university.edu.vn',    'Đào tạo'],
  ['user06',     'Nguyễn Thu Hà',        'ha.nguyen@university.edu.vn',    'Công nghệ Thông tin'],
  ['user07',     'Trần Quốc Hùng',       'hung.tran@university.edu.vn',    'Ban Giám hiệu'],
  ['user08',     'Lê Thị Kim Lan',       'lan.le@university.edu.vn',       'Cơ khí'],
  ['user09',     'Vũ Minh Long',         'long.vu@university.edu.vn',      'Điện'],
  ['user10',     'Đặng Thị Bích Mai',    'mai.dang@university.edu.vn',     'Ngoại ngữ'],
  ['user11',     'Bùi Quang Nam',        'nam.bui@university.edu.vn',      'Quản trị Kinh doanh'],
  ['user12',     'Ngô Thị Oanh',         'oanh.ngo@university.edu.vn',     'Hành chính'],
  ['user13',     'Phạm Văn Phúc',        'phuc.pham@university.edu.vn',    'Tài chính'],
  ['user14',     'Dương Thị Quỳnh',      'quynh.duong@university.edu.vn',  'Công nghệ Thông tin'],
  ['user15',     'Hoàng Văn Sơn',        'son.hoang@university.edu.vn',    'Kinh tế'],
  ['user16',     'Lý Thị Thanh',         'thanh.ly@university.edu.vn',     'Hóa học'],
  ['user17',     'Đinh Công Tuấn',       'tuan.dinh@university.edu.vn',    'Điện'],
  ['user18',     'Trịnh Thị Uyên',       'uyen.trinh@university.edu.vn',   'Nghiên cứu'],
  ['user19',     'Phan Quốc Việt',       'viet.phan@university.edu.vn',    'Quản trị Kinh doanh'],
  ['user20',     'Mai Thị Xuân',         'xuan.mai@university.edu.vn',     'Ngoại ngữ'],
];
const insertUserM = db.prepare(`INSERT OR IGNORE INTO "User" (UserID,FullName,Password,Roles,Visible,FacultyID,Email) VALUES (?,?,?,0,1,?,?)`);
for (const [id, name, email, facKeyword] of newUsers) {
  const facID = getFacID(facKeyword);
  insertUserM.run(id, name, hash, facID, email);
}
console.log(`  ✅ ${newUsers.length} users seeded (password: 123456)`);

db.close();
console.log('\n🎉 All migrations completed!');
