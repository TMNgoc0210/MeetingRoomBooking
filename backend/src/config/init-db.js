/**
 * init-db.js — Tạo schema SQLite và seed dữ liệu mẫu
 * Chạy: node src/config/init-db.js
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

// ═══════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════
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
    RoomID      INTEGER PRIMARY KEY AUTOINCREMENT,
    RoomName    TEXT    NOT NULL,
    AreaID      INTEGER REFERENCES Area(AreaID),
    Seat        INTEGER DEFAULT 10,
    PhoneCall   INTEGER DEFAULT 0,
    VideoCall   INTEGER DEFAULT 0,
    IsVIP       INTEGER DEFAULT 0,
    Visible     INTEGER DEFAULT 1,
    "Desc"      TEXT    DEFAULT '',
    Avatar      TEXT    DEFAULT '/uploads/images/nopic.png',
    CreateDate  TEXT    DEFAULT (datetime('now','localtime')),
    CreateBy    TEXT    DEFAULT 'admin'
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
    RecurringGroupID INTEGER DEFAULT NULL,
    RecurringType    TEXT    DEFAULT NULL,
    RecurringEnd     TEXT    DEFAULT NULL,
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
`);

// ═══════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════

// Check if already seeded
const userCount = db.prepare('SELECT COUNT(*) as c FROM "User"').get();
if (userCount.c > 0) {
  console.log('✅ Database already seeded, skipping...');
  db.close();
  process.exit(0);
}

const adminHash = bcrypt.hashSync('admin123', 10);

// Faculties
const insertFaculty = db.prepare(
  `INSERT INTO Faculty (FacultyName, Visible) VALUES (?, 1)`
);
const f1 = insertFaculty.run('Khoa Công nghệ Thông tin').lastInsertRowid;
const f2 = insertFaculty.run('Khoa Kinh tế').lastInsertRowid;
const f3 = insertFaculty.run('Phòng Đào tạo').lastInsertRowid;
const f4 = insertFaculty.run('Ban Giám hiệu').lastInsertRowid;
console.log('✅ Faculties seeded');

// Admin user
db.prepare(
  `INSERT INTO "User" (UserID, FullName, Password, Roles, Visible, FacultyID)
   VALUES (?, ?, ?, 1, 1, ?)`
).run('admin', 'Quản trị viên', adminHash, f4);

// Sample users
db.prepare(
  `INSERT INTO "User" (UserID, FullName, Password, Roles, Visible, FacultyID, Email)
   VALUES (?, ?, ?, 0, 1, ?, ?)`
).run('user01', 'Nguyễn Văn An', bcrypt.hashSync('123456', 10), f1, 'an@email.com');
db.prepare(
  `INSERT INTO "User" (UserID, FullName, Password, Roles, Visible, FacultyID, Email)
   VALUES (?, ?, ?, 0, 1, ?, ?)`
).run('user02', 'Trần Thị Bình', bcrypt.hashSync('123456', 10), f2, 'binh@email.com');
console.log('✅ Users seeded (admin/admin123, user01/123456, user02/123456)');

// Areas
const insertArea = db.prepare(`INSERT INTO Area (AreaName, Visible) VALUES (?, 1)`);
const a1 = insertArea.run('Khu A - Tòa nhà chính').lastInsertRowid;
const a2 = insertArea.run('Khu B - Thư viện').lastInsertRowid;
const a3 = insertArea.run('Khu C - Phòng thí nghiệm').lastInsertRowid;
console.log('✅ Areas seeded');

// Rooms
const insertRoom = db.prepare(
  `INSERT INTO Room (RoomName, AreaID, Seat, PhoneCall, VideoCall, Visible, "Desc")
   VALUES (?, ?, ?, ?, ?, 1, ?)`
);
insertRoom.run('Phòng họp A101', a1, 20, 1, 1, 'Phòng họp lớn tầng 1 khu A, đầy đủ thiết bị hội nghị');
insertRoom.run('Phòng họp A201', a1, 10, 1, 0, 'Phòng họp nhỏ tầng 2 khu A');
insertRoom.run('Phòng họp A301', a1, 30, 1, 1, 'Phòng hội thảo tầng 3 khu A');
insertRoom.run('Phòng họp B101', a2, 15, 0, 1, 'Phòng họp khu thư viện');
insertRoom.run('Phòng seminar B201', a2, 50, 1, 1, 'Hội trường thư viện');
insertRoom.run('Lab C101', a3, 25, 0, 0, 'Phòng thực hành khu C');
console.log('✅ Rooms seeded');

// Sample bookings
const insertBooking = db.prepare(`INSERT INTO Booking (UserID) VALUES (?)`);
const insertLine = db.prepare(
  `INSERT INTO LineRoom (BookingID, UserID, FacultyID, RoomID, TimeStart, TimeEnd, Title, NumberPerson)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 16).replace('T', ' ');

const b1 = insertBooking.run('user01').lastInsertRowid;
insertLine.run(b1, 'user01', f1, 1,
  fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0)),
  fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0)),
  'Họp nhóm nghiên cứu', 8
);

const b2 = insertBooking.run('admin').lastInsertRowid;
insertLine.run(b2, 'admin', f4, 3,
  fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0)),
  fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0)),
  'Họp Ban Giám hiệu', 15
);
console.log('✅ Sample bookings seeded');

db.close();
console.log('\n🎉 Database initialized successfully!');
console.log('   Path:', dbPath);
console.log('   Login: admin / admin123');
