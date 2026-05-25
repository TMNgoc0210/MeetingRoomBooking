/**
 * init-db.js — Tạo schema SQLite đầy đủ và seed dữ liệu mẫu
 * Chạy: node src/config/init-db.js
 * Lưu ý: script này XÓA và tạo lại toàn bộ DB nếu chạy lại.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'meeting_booking.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📦 Initializing SQLite database...');

// ═══════════════════════════════════════════════════════
// SCHEMA ĐẦY ĐỦ (bao gồm tất cả migrations)
// ═══════════════════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS "Faculty" (
    FacultyID   INTEGER PRIMARY KEY AUTOINCREMENT,
    FacultyName TEXT    NOT NULL,
    Avatar      TEXT    DEFAULT '',
    "Desc"      TEXT    DEFAULT '',
    Visible     INTEGER DEFAULT 1,
    CreateDate  TEXT    DEFAULT (datetime('now','localtime')),
    CreateBy    TEXT    DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS "User" (
    UserID      TEXT    PRIMARY KEY,
    FullName    TEXT    NOT NULL,
    Password    TEXT    NOT NULL,
    FacultyID   INTEGER REFERENCES Faculty(FacultyID),
    Mobi        TEXT    DEFAULT '',
    Email       TEXT    DEFAULT '',
    Avatar      TEXT    DEFAULT '/uploads/images/nopic.png',
    Visible     INTEGER DEFAULT 1,
    Roles       INTEGER DEFAULT 0,
    CreateDate  TEXT    DEFAULT (datetime('now','localtime')),
    CreateBy    TEXT    DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS "Area" (
    AreaID      INTEGER PRIMARY KEY AUTOINCREMENT,
    AreaName    TEXT    NOT NULL,
    Avatar      TEXT    DEFAULT '',
    "Desc"      TEXT    DEFAULT '',
    Visible     INTEGER DEFAULT 1,
    CreateDate  TEXT    DEFAULT (datetime('now','localtime')),
    CreateBy    TEXT    DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS "Room" (
    RoomID       INTEGER PRIMARY KEY AUTOINCREMENT,
    RoomName     TEXT    NOT NULL,
    AreaID       INTEGER REFERENCES Area(AreaID),
    Seat         INTEGER DEFAULT 10,
    PhoneCall    INTEGER DEFAULT 0,
    VideoCall    INTEGER DEFAULT 0,
    IsVIP        INTEGER DEFAULT 0,
    VIPCondition INTEGER DEFAULT 0,
    VIPMinutes   INTEGER DEFAULT 60,
    Visible      INTEGER DEFAULT 1,
    "Desc"       TEXT    DEFAULT '',
    Avatar       TEXT    DEFAULT '',
    CreateDate   TEXT    DEFAULT (datetime('now','localtime')),
    CreateBy     TEXT    DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS "Equipment" (
    EquipmentID  INTEGER PRIMARY KEY AUTOINCREMENT,
    RoomID       INTEGER NOT NULL REFERENCES Room(RoomID),
    Name         TEXT    NOT NULL,
    Icon         TEXT    DEFAULT 'fa-cube',
    Quantity     INTEGER DEFAULT 1,
    Note         TEXT    DEFAULT '',
    Visible      INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS "Booking" (
    BookingID   INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID      TEXT    REFERENCES "User"(UserID),
    CreateDate  TEXT    DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS "LineRoom" (
    LineRoomID       INTEGER PRIMARY KEY AUTOINCREMENT,
    BookingID        INTEGER REFERENCES Booking(BookingID),
    UserID           TEXT    REFERENCES "User"(UserID),
    FacultyID        INTEGER REFERENCES Faculty(FacultyID),
    RoomID           INTEGER REFERENCES Room(RoomID),
    TimeStart        TEXT    NOT NULL,
    TimeEnd          TEXT    NOT NULL,
    Title            TEXT    DEFAULT '',
    Content          TEXT    DEFAULT '',
    Note             TEXT    DEFAULT '',
    NumberPerson     INTEGER DEFAULT 1,
    Status           INTEGER DEFAULT 1,
    ApprovedBy       TEXT    DEFAULT NULL,
    ApprovedAt       TEXT    DEFAULT NULL,
    RejectReason     TEXT    DEFAULT NULL,
    ServiceRequest   TEXT    DEFAULT NULL,
    RecurringGroupID INTEGER DEFAULT NULL,
    RecurringType    TEXT    DEFAULT NULL,
    RecurringEnd     TEXT    DEFAULT NULL,
    ReminderSent     INTEGER DEFAULT 0,
    CreateDate       TEXT    DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS "BookingAttendee" (
    AttendeeID  INTEGER PRIMARY KEY AUTOINCREMENT,
    LineRoomID  INTEGER NOT NULL REFERENCES LineRoom(LineRoomID) ON DELETE CASCADE,
    UserID      TEXT    NOT NULL REFERENCES "User"(UserID),
    Status      INTEGER DEFAULT 0,
    InvitedAt   TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(LineRoomID, UserID)
  );

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

  CREATE TABLE IF NOT EXISTS "Role" (
    RoleID      INTEGER PRIMARY KEY AUTOINCREMENT,
    Name        TEXT    NOT NULL UNIQUE,
    Description TEXT    DEFAULT '',
    CreatedAt   TEXT    DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS "UserRole" (
    UserRoleID  INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID      TEXT    NOT NULL REFERENCES "User"(UserID) ON DELETE CASCADE,
    RoleID      INTEGER NOT NULL REFERENCES "Role"(RoleID) ON DELETE CASCADE,
    AssignedAt  TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(UserID, RoleID)
  );

  CREATE TABLE IF NOT EXISTS "Setting" (
    "Key"   TEXT PRIMARY KEY,
    "Value" TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS "AI_Chat_Log" (
    LogID       INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID      TEXT    DEFAULT NULL,
    UserMessage TEXT    NOT NULL,
    BotReply    TEXT    DEFAULT NULL,
    AI_JSON     TEXT    DEFAULT NULL,
    CreateDate  TEXT    DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Check đã seed chưa ──────────────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM "User"').get();
if (userCount.c > 0) {
  console.log('✅ Database already seeded, skipping...');
  db.close();
  process.exit(0);
}

// ═══════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════

// ─── Faculties ───────────────────────────────────────────────────────────────
const insertFaculty = db.prepare(`INSERT INTO Faculty (FacultyName, Visible) VALUES (?, 1)`);
const f1 = insertFaculty.run('Khoa Công nghệ Thông tin').lastInsertRowid;
const f2 = insertFaculty.run('Khoa Kinh tế').lastInsertRowid;
const f3 = insertFaculty.run('Phòng Đào tạo').lastInsertRowid;
const f4 = insertFaculty.run('Ban Giám hiệu').lastInsertRowid;
console.log('✅ Faculties seeded');

// ─── Users ───────────────────────────────────────────────────────────────────
const insertUser = db.prepare(
  `INSERT INTO "User" (UserID, FullName, Password, Roles, Visible, FacultyID, Email, Mobi)
   VALUES (?, ?, ?, ?, 1, ?, ?, ?)`
);
insertUser.run('admin',  'Quản trị viên',  bcrypt.hashSync('admin123', 10), 1, f4, '', '');
insertUser.run('user01', 'Nguyễn Văn An',  bcrypt.hashSync('123456', 10),   0, f1, 'an@email.com', '');
insertUser.run('user02', 'Trần Thị Bình',  bcrypt.hashSync('123456', 10),   0, f2, 'binh@email.com', '');
console.log('✅ Users seeded (admin/admin123, user01/123456, user02/123456)');

// ─── Areas ───────────────────────────────────────────────────────────────────
const insertArea = db.prepare(`INSERT INTO Area (AreaName, Visible) VALUES (?, 1)`);
const a1 = insertArea.run('Khu A - Tòa nhà chính').lastInsertRowid;
const a2 = insertArea.run('Khu B - Thư viện').lastInsertRowid;
const a3 = insertArea.run('Khu C - Phòng thí nghiệm').lastInsertRowid;
console.log('✅ Areas seeded');

// ─── Rooms (8 phòng) ─────────────────────────────────────────────────────────
const insertRoom = db.prepare(
  `INSERT INTO Room (RoomName, AreaID, Seat, PhoneCall, VideoCall, IsVIP, VIPCondition, VIPMinutes, Visible, "Desc", Avatar)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, '')`
);

const r1 = insertRoom.run('Phòng họp A101',          a1, 20, 1, 1, 1, 0, 60, 'Phòng họp lớn tầng 1 khu A, đầy đủ thiết bị hội nghị',          'https://picsum.photos/seed/room-a101/800/400').lastInsertRowid;
const r2 = insertRoom.run('Phòng họp A201',          a1, 10, 1, 0, 0, 0, 60, 'Phòng họp nhỏ tầng 2 khu A',                                       'https://picsum.photos/seed/room-a201/800/400').lastInsertRowid;
const r3 = insertRoom.run('Phòng họp A301',          a1, 30, 1, 1, 0, 0, 60, 'Phòng hội thảo tầng 3 khu A',                                       'https://picsum.photos/seed/room-a301/800/400').lastInsertRowid;
const r4 = insertRoom.run('Phòng họp B101',          a2, 15, 0, 1, 0, 0, 60, 'Phòng họp khu thư viện',                                            'https://picsum.photos/seed/room-b101/800/400').lastInsertRowid;
const r5 = insertRoom.run('Phòng seminar B201',      a2, 50, 1, 1, 0, 0, 60, 'Hội trường thư viện',                                               'https://picsum.photos/seed/room-b201/800/400').lastInsertRowid;
const r6 = insertRoom.run('Lab C101',                a3, 25, 0, 0, 0, 0, 60, 'Phòng thực hành khu C',                                             'https://picsum.photos/seed/room-c101/800/400').lastInsertRowid;
const r7 = insertRoom.run('Phòng Hội Nghị VIP B301', a2, 40, 1, 1, 1, 0, 60, 'Phòng hội nghị cao cấp tầng 3 khu Thư viện, trang bị hệ thống hội nghị truyền hình chuyên nghiệp, sức chứa 40 người. Yêu cầu phê duyệt admin.', 'https://picsum.photos/seed/room-b301/800/400').lastInsertRowid;
const r8 = insertRoom.run('Phòng Đào Tạo C202',     a3, 35, 1, 1, 0, 0, 60, 'Phòng đào tạo và hội thảo khu thí nghiệm tầng 2, bố trí linh hoạt dạng lớp học hoặc hội thảo, tích hợp hệ thống ghi âm và streaming trực tuyến.',  'https://picsum.photos/seed/room-c202/800/400').lastInsertRowid;
console.log('✅ Rooms seeded (8 phòng)');

// ─── Equipment ───────────────────────────────────────────────────────────────
const insertEquip = db.prepare(`INSERT INTO Equipment (RoomID, Name, Icon, Quantity) VALUES (?, ?, ?, ?)`);

// Thiết bị cơ bản cho tất cả phòng
for (const rID of [r1, r2, r3, r4, r5, r6, r7, r8]) {
  insertEquip.run(rID, 'Máy chiếu',  'fa-desktop',      1);
  insertEquip.run(rID, 'Bảng trắng', 'fa-chalkboard',   1);
  insertEquip.run(rID, 'Điều hòa',   'fa-wind',         1);
}
// Thiết bị thêm cho phòng có PhoneCall/VideoCall
for (const rID of [r1, r3, r5, r7, r8]) {
  insertEquip.run(rID, 'Hệ thống loa',  'fa-volume-up',    1);
  insertEquip.run(rID, 'Micro không dây', 'fa-microphone', 2);
}
// Thiết bị riêng phòng VIP và seminar
insertEquip.run(r1, 'Tivi 65 inch',         'fa-tv',          1);
insertEquip.run(r5, 'Tivi 65 inch',         'fa-tv',          2);
insertEquip.run(r7, 'Màn hình trình chiếu', 'fa-tv',          1);
insertEquip.run(r7, 'Camera hội nghị',      'fa-video',       2);
insertEquip.run(r8, 'Máy quay streaming',   'fa-video',       1);
insertEquip.run(r6, 'Máy tính',             'fa-laptop',     25);
console.log('✅ Equipment seeded');

// ─── Roles ───────────────────────────────────────────────────────────────────
const insertRole = db.prepare(`INSERT INTO Role (Name, Description) VALUES (?, ?)`);
const role1 = insertRole.run('Quản trị ứng dụng',       'Toàn quyền thực hiện các chức năng trong ứng dụng').lastInsertRowid;
const role2 = insertRole.run('Người quản lý đặt phòng', 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác').lastInsertRowid;
const role3 = insertRole.run('Người đặt phòng',         'Có quyền cập nhật đặt phòng của chính mình').lastInsertRowid;

// Gán admin vào vai trò Quản trị ứng dụng
db.prepare(`INSERT INTO UserRole (UserID, RoleID) VALUES (?, ?)`).run('admin', role1);
console.log('✅ Roles seeded');

// ─── Settings ────────────────────────────────────────────────────────────────
const insertSetting = db.prepare(`INSERT OR IGNORE INTO "Setting"("Key","Value") VALUES (?,?)`);
for (const [k, v] of [
  ['timeFormat',      '24h'],
  ['slotMinutes',     '30'],
  ['defaultDuration', '60'],
  ['maxDuration',     '0'],
  ['timezone',        'Asia/Ho_Chi_Minh'],
  ['theme',           'dark'],
  ['workdayStart',    '07:00'],
  ['workdayEnd',      '21:00'],
]) insertSetting.run(k, v);
console.log('✅ Settings seeded');

// ─── Sample bookings ─────────────────────────────────────────────────────────
const insertBooking = db.prepare(`INSERT INTO Booking (UserID) VALUES (?)`);
const insertLine = db.prepare(
  `INSERT INTO LineRoom (BookingID, UserID, FacultyID, RoomID, TimeStart, TimeEnd, Title, NumberPerson, Status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const today = new Date();
const fmt = (d) => {
  const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0'), mi = String(d.getMinutes()).padStart(2,'0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
};
const D = (h, m=0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);

const b1 = insertBooking.run('user01').lastInsertRowid;
insertLine.run(b1, 'user01', f1, r2, fmt(D(9)),  fmt(D(11)), 'Họp nhóm nghiên cứu', 8, 1);

const b2 = insertBooking.run('admin').lastInsertRowid;
insertLine.run(b2, 'admin',  f4, r3, fmt(D(14)), fmt(D(16)), 'Họp Ban Giám hiệu',   15, 1);

const b3 = insertBooking.run('user02').lastInsertRowid;
insertLine.run(b3, 'user02', f2, r1, fmt(D(10)), fmt(D(12)), 'Báo cáo tiến độ dự án', 5, 0); // Pending (VIP)
console.log('✅ Sample bookings seeded');

db.close();
console.log('\n🎉 Database initialized successfully!');
console.log('   Login: admin/admin123 | user01/123456 | user02/123456');
