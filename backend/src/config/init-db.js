/**
 * init-db.js — Tạo schema PostgreSQL và seed dữ liệu mẫu
 * Chạy: node src/config/init-db.js
 * Idempotent: bỏ qua nếu bảng/dữ liệu đã tồn tại.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

async function run(sqlStr, values = []) {
  return pool.query(sqlStr, values);
}

async function ins(sqlStr, values = []) {
  const res = await pool.query(sqlStr + ' RETURNING *', values);
  // Trả về ID của row vừa insert (column đầu tiên kết thúc bằng 'id')
  const row = res.rows[0] || {};
  for (const [k, v] of Object.entries(row)) {
    if (/id$/i.test(k) && Number.isInteger(v)) return v;
  }
  return null;
}

async function main() {
  console.log('📦 Connecting to PostgreSQL...');

  // ─── Create tables ────────────────────────────────────────────────────────
  console.log('\n📋 Creating tables...');

  await run(`
    CREATE TABLE IF NOT EXISTS Faculty (
      "FacultyID"   SERIAL PRIMARY KEY,
      "FacultyName" VARCHAR(200) NOT NULL,
      "Avatar"      TEXT DEFAULT '',
      "Desc"        TEXT DEFAULT '',
      "Visible"     INTEGER DEFAULT 1,
      "CreateDate"  VARCHAR(20) DEFAULT '',
      "CreateBy"    VARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Faculty');

  await run(`
    CREATE TABLE IF NOT EXISTS "User" (
      "UserID"     VARCHAR(100) NOT NULL PRIMARY KEY,
      "FullName"   VARCHAR(200) NOT NULL,
      "Password"   VARCHAR(255) NOT NULL,
      "FacultyID"  INTEGER REFERENCES Faculty("FacultyID"),
      "Mobi"       VARCHAR(50)  DEFAULT '',
      "Email"      VARCHAR(200) DEFAULT '',
      "Avatar"     TEXT DEFAULT '/uploads/images/nopic.png',
      "Visible"    INTEGER DEFAULT 1,
      "Roles"      INTEGER DEFAULT 0,
      "CreateDate" VARCHAR(20)  DEFAULT '',
      "CreateBy"   VARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ User');

  await run(`
    CREATE TABLE IF NOT EXISTS Area (
      "AreaID"     SERIAL PRIMARY KEY,
      "AreaName"   VARCHAR(200) NOT NULL,
      "Avatar"     TEXT DEFAULT '',
      "Desc"       TEXT DEFAULT '',
      "Visible"    INTEGER DEFAULT 1,
      "CreateDate" VARCHAR(20) DEFAULT '',
      "CreateBy"   VARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Area');

  await run(`
    CREATE TABLE IF NOT EXISTS Room (
      "RoomID"       SERIAL PRIMARY KEY,
      "RoomName"     VARCHAR(200) NOT NULL,
      "AreaID"       INTEGER REFERENCES Area("AreaID"),
      "Seat"         INTEGER DEFAULT 10,
      "PhoneCall"    INTEGER DEFAULT 0,
      "VideoCall"    INTEGER DEFAULT 0,
      "IsVIP"        INTEGER DEFAULT 0,
      "VIPCondition" INTEGER DEFAULT 0,
      "VIPMinutes"   INTEGER DEFAULT 60,
      "Visible"      INTEGER DEFAULT 1,
      "Desc"         TEXT DEFAULT '',
      "Avatar"       TEXT DEFAULT '',
      "CreateDate"   VARCHAR(20) DEFAULT '',
      "CreateBy"     VARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Room');

  await run(`
    CREATE TABLE IF NOT EXISTS Equipment (
      "EquipmentID" SERIAL PRIMARY KEY,
      "RoomID"      INTEGER NOT NULL REFERENCES Room("RoomID"),
      "Name"        VARCHAR(200) NOT NULL,
      "Icon"        VARCHAR(100) DEFAULT 'fa-cube',
      "Quantity"    INTEGER DEFAULT 1,
      "Note"        TEXT DEFAULT '',
      "Visible"     INTEGER DEFAULT 1
    )
  `);
  console.log('  ✅ Equipment');

  await run(`
    CREATE TABLE IF NOT EXISTS Booking (
      "BookingID"  SERIAL PRIMARY KEY,
      "UserID"     VARCHAR(100) REFERENCES "User"("UserID"),
      "CreateDate" VARCHAR(20) DEFAULT ''
    )
  `);
  console.log('  ✅ Booking');

  await run(`
    CREATE TABLE IF NOT EXISTS LineRoom (
      "LineRoomID"       SERIAL PRIMARY KEY,
      "BookingID"        INTEGER REFERENCES Booking("BookingID"),
      "UserID"           VARCHAR(100) REFERENCES "User"("UserID"),
      "FacultyID"        INTEGER REFERENCES Faculty("FacultyID"),
      "RoomID"           INTEGER REFERENCES Room("RoomID"),
      "TimeStart"        VARCHAR(20) NOT NULL,
      "TimeEnd"          VARCHAR(20) NOT NULL,
      "Title"            VARCHAR(500) DEFAULT '',
      "Content"          TEXT DEFAULT '',
      "Note"             TEXT DEFAULT '',
      "NumberPerson"     INTEGER DEFAULT 1,
      "Status"           INTEGER DEFAULT 1,
      "ApprovedBy"       VARCHAR(100) DEFAULT NULL,
      "ApprovedAt"       VARCHAR(20) DEFAULT NULL,
      "RejectReason"     TEXT DEFAULT NULL,
      "ServiceRequest"   TEXT DEFAULT NULL,
      "RecurringGroupID" INTEGER DEFAULT NULL,
      "RecurringType"    VARCHAR(20) DEFAULT NULL,
      "RecurringEnd"     VARCHAR(20) DEFAULT NULL,
      "ReminderSent"     INTEGER DEFAULT 0,
      "CancelledAt"      TIMESTAMP DEFAULT NULL,
      "CreateDate"       VARCHAR(20) DEFAULT ''
    )
  `);
  console.log('  ✅ LineRoom');

  await run(`
    CREATE TABLE IF NOT EXISTS BookingAttendee (
      "AttendeeID" SERIAL PRIMARY KEY,
      "LineRoomID" INTEGER NOT NULL REFERENCES LineRoom("LineRoomID"),
      "UserID"     VARCHAR(100) NOT NULL REFERENCES "User"("UserID"),
      "Status"     INTEGER DEFAULT 0,
      "InvitedAt"  VARCHAR(20) DEFAULT '',
      CONSTRAINT uc_booking_attendee UNIQUE ("LineRoomID", "UserID")
    )
  `);
  console.log('  ✅ BookingAttendee');

  await run(`
    CREATE TABLE IF NOT EXISTS BookingAttachment (
      "AttachmentID" SERIAL PRIMARY KEY,
      "LineRoomID"   INTEGER NOT NULL REFERENCES LineRoom("LineRoomID"),
      "FileName"     VARCHAR(500) NOT NULL,
      "FilePath"     TEXT NOT NULL,
      "FileSize"     INTEGER DEFAULT 0,
      "MimeType"     VARCHAR(200) DEFAULT '',
      "UploadedAt"   VARCHAR(20) DEFAULT '',
      "UploadedBy"   VARCHAR(100) DEFAULT ''
    )
  `);
  console.log('  ✅ BookingAttachment');

  await run(`
    CREATE TABLE IF NOT EXISTS "Role" (
      "RoleID"      SERIAL PRIMARY KEY,
      "Name"        VARCHAR(200) NOT NULL UNIQUE,
      "Description" TEXT DEFAULT '',
      "CreatedAt"   VARCHAR(20) DEFAULT ''
    )
  `);
  console.log('  ✅ Role');

  await run(`
    CREATE TABLE IF NOT EXISTS "UserRole" (
      "UserRoleID" SERIAL PRIMARY KEY,
      "UserID"     VARCHAR(100) NOT NULL REFERENCES "User"("UserID"),
      "RoleID"     INTEGER NOT NULL REFERENCES "Role"("RoleID"),
      "AssignedAt" VARCHAR(20) DEFAULT '',
      CONSTRAINT uc_user_role UNIQUE ("UserID", "RoleID")
    )
  `);
  console.log('  ✅ UserRole');

  await run(`
    CREATE TABLE IF NOT EXISTS Setting (
      key   VARCHAR(100) NOT NULL PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);
  console.log('  ✅ Setting');

  await run(`
    CREATE TABLE IF NOT EXISTS AI_Chat_Log (
      "LogID"       SERIAL PRIMARY KEY,
      "UserID"      VARCHAR(100) DEFAULT NULL,
      "UserMessage" TEXT NOT NULL,
      "BotReply"    TEXT DEFAULT NULL,
      "AI_JSON"     TEXT DEFAULT NULL,
      "CreateDate"  VARCHAR(20) DEFAULT ''
    )
  `);
  console.log('  ✅ AI_Chat_Log');

  await run(`
    CREATE TABLE IF NOT EXISTS LoginLog (
      "LogID"     SERIAL PRIMARY KEY,
      "Username"  VARCHAR(100) NOT NULL,
      "IP"        VARCHAR(50) DEFAULT '',
      "Status"    VARCHAR(20) NOT NULL,
      "Reason"    VARCHAR(200) DEFAULT '',
      "CreatedAt" VARCHAR(30) DEFAULT ''
    )
  `);
  console.log('  ✅ LoginLog');

  // ─── Kiểm tra đã seed chưa ────────────────────────────────────────────────
  const userCount = await pool.query('SELECT COUNT(*) AS c FROM "User"');
  if (parseInt(userCount.rows[0].c) > 0) {
    console.log('\n✅ Database already seeded, skipping...');
    await pool.end();
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED DATA
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🌱 Seeding data...');

  // ─── Faculties ─────────────────────────────────────────────────────────────
  const f1  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Công nghệ Thông tin']);
  const f2  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Kinh tế']);
  const f3  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Phòng Đào tạo']);
  const f4  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Ban Giám hiệu']);
  const f5  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Cơ khí - Xây dựng']);
  const f6  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Điện - Điện tử']);
  const f7  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Hóa học - Thực phẩm']);
  const f8  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Quản trị Kinh doanh']);
  const f9  = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Khoa Ngoại ngữ']);
  const f10 = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Phòng Hành chính - Nhân sự']);
  const f11 = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Phòng Tài chính - Kế toán']);
  const f12 = await ins(`INSERT INTO Faculty ("FacultyName","Visible") VALUES ($1,1)`, ['Trung tâm Nghiên cứu & Phát triển']);
  console.log('  ✅ Faculties seeded');

  // ─── Users ─────────────────────────────────────────────────────────────────
  const h = (p) => bcrypt.hashSync(p, 10);
  const insertUser = async (id, name, pass, roles, facID, email) => {
    await pool.query(
      `INSERT INTO "User" ("UserID","FullName","Password","Roles","Visible","FacultyID","Email","Mobi")
       VALUES ($1,$2,$3,$4,1,$5,$6,'')
       ON CONFLICT ("UserID") DO NOTHING`,
      [id, name, h(pass), roles, facID, email]
    );
  };
  await insertUser('admin',       'Quản trị viên',       'admin123', 1, f4,  'admin@university.edu.vn');
  await insertUser('user01',      'Nguyễn Văn An',        '123456',  0, f1,  'an.nguyen@university.edu.vn');
  await insertUser('user02',      'Trần Thị Bình',        '123456',  0, f2,  'binh.tran@university.edu.vn');
  await insertUser('ngocphan',    'Trần Minh Ngọc',       '123456',  0, f1,  'minhngocphanme457@gmail.com');
  await insertUser('ngocpro457',  'Nguyễn Minh Pro',      '123456',  0, f1,  'minhngocpro457@gmail.com');
  await insertUser('ngoctran457', 'Phan Ngọc Trần Minh',  '123456',  0, f2,  'minhngocphanmetran457@gmail.com');
  await insertUser('user03', 'Lê Văn Cường',          '123456', 0, f1,  'cuong.le@university.edu.vn');
  await insertUser('user04', 'Phạm Thị Dung',         '123456', 0, f2,  'dung.pham@university.edu.vn');
  await insertUser('user05', 'Hoàng Minh Đức',        '123456', 0, f3,  'duc.hoang@university.edu.vn');
  await insertUser('user06', 'Nguyễn Thu Hà',         '123456', 0, f1,  'ha.nguyen@university.edu.vn');
  await insertUser('user07', 'Trần Quốc Hùng',        '123456', 0, f4,  'hung.tran@university.edu.vn');
  await insertUser('user08', 'Lê Thị Kim Lan',        '123456', 0, f5,  'lan.le@university.edu.vn');
  await insertUser('user09', 'Vũ Minh Long',          '123456', 0, f6,  'long.vu@university.edu.vn');
  await insertUser('user10', 'Đặng Thị Bích Mai',     '123456', 0, f9,  'mai.dang@university.edu.vn');
  await insertUser('user11', 'Bùi Quang Nam',         '123456', 0, f8,  'nam.bui@university.edu.vn');
  await insertUser('user12', 'Ngô Thị Oanh',          '123456', 0, f10, 'oanh.ngo@university.edu.vn');
  await insertUser('user13', 'Phạm Văn Phúc',         '123456', 0, f11, 'phuc.pham@university.edu.vn');
  await insertUser('user14', 'Dương Thị Quỳnh',       '123456', 0, f1,  'quynh.duong@university.edu.vn');
  await insertUser('user15', 'Hoàng Văn Sơn',         '123456', 0, f2,  'son.hoang@university.edu.vn');
  await insertUser('user16', 'Lý Thị Thanh',          '123456', 0, f7,  'thanh.ly@university.edu.vn');
  await insertUser('user17', 'Đinh Công Tuấn',        '123456', 0, f6,  'tuan.dinh@university.edu.vn');
  await insertUser('user18', 'Trịnh Thị Uyên',        '123456', 0, f12, 'uyen.trinh@university.edu.vn');
  await insertUser('user19', 'Phan Quốc Việt',        '123456', 0, f8,  'viet.phan@university.edu.vn');
  await insertUser('user20', 'Mai Thị Xuân',          '123456', 0, f9,  'xuan.mai@university.edu.vn');
  console.log('  ✅ Users seeded');

  // ─── Areas ─────────────────────────────────────────────────────────────────
  const a1 = await ins(`INSERT INTO Area ("AreaName","Visible") VALUES ($1,1)`, ['Khu A - Tòa nhà chính']);
  const a2 = await ins(`INSERT INTO Area ("AreaName","Visible") VALUES ($1,1)`, ['Khu B - Thư viện']);
  const a3 = await ins(`INSERT INTO Area ("AreaName","Visible") VALUES ($1,1)`, ['Khu C - Phòng thí nghiệm']);
  console.log('  ✅ Areas seeded');

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  const IMG = [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&h=400&fit=crop',
  ];
  const insertRoom = (name, areaID, seat, phone, video, vip, vipCond, vipMin, desc, img) =>
    ins(
      `INSERT INTO Room ("RoomName","AreaID","Seat","PhoneCall","VideoCall","IsVIP","VIPCondition","VIPMinutes","Visible","Desc","Avatar")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10)`,
      [name, areaID, seat, phone, video, vip, vipCond, vipMin, desc, img]
    );

  const r1 = await insertRoom('Phòng họp A101',          a1, 20, 1, 1, 1, 0, 60, 'Phòng họp lớn tầng 1 khu A, đầy đủ thiết bị hội nghị',   IMG[0]);
  const r2 = await insertRoom('Phòng họp A201',          a1, 10, 1, 0, 0, 0, 60, 'Phòng họp nhỏ tầng 2 khu A',                              IMG[1]);
  const r3 = await insertRoom('Phòng họp A301',          a1, 30, 1, 1, 0, 0, 60, 'Phòng hội thảo tầng 3 khu A',                             IMG[2]);
  const r4 = await insertRoom('Phòng họp B101',          a2, 15, 0, 1, 0, 0, 60, 'Phòng họp khu thư viện',                                  IMG[3]);
  const r5 = await insertRoom('Phòng seminar B201',      a2, 50, 1, 1, 0, 0, 60, 'Hội trường thư viện',                                     IMG[4]);
  const r6 = await insertRoom('Lab C101',                a3, 25, 0, 0, 0, 0, 60, 'Phòng thực hành khu C',                                   IMG[5]);
  const r7 = await insertRoom('Phòng Hội Nghị VIP B301', a2, 40, 1, 1, 1, 0, 60, 'Phòng hội nghị cao cấp tầng 3 khu Thư viện',             IMG[6]);
  const r8 = await insertRoom('Phòng Đào Tạo C202',     a3, 35, 1, 1, 0, 0, 60, 'Phòng đào tạo và hội thảo khu thí nghiệm tầng 2',        IMG[7]);
  console.log('  ✅ Rooms seeded (8 phòng)');

  // ─── Equipment ─────────────────────────────────────────────────────────────
  const insEquip = (roomID, name, icon, qty) =>
    pool.query(
      `INSERT INTO Equipment ("RoomID","Name","Icon","Quantity") VALUES ($1,$2,$3,$4)`,
      [roomID, name, icon, qty]
    );
  for (const rID of [r1, r2, r3, r4, r5, r6, r7, r8]) {
    await insEquip(rID, 'Máy chiếu',  'fa-desktop',    1);
    await insEquip(rID, 'Bảng trắng', 'fa-chalkboard', 1);
    await insEquip(rID, 'Điều hòa',   'fa-wind',       1);
  }
  for (const rID of [r1, r3, r5, r7, r8]) {
    await insEquip(rID, 'Hệ thống loa',    'fa-volume-up',  1);
    await insEquip(rID, 'Micro không dây', 'fa-microphone', 2);
  }
  await insEquip(r1, 'Tivi 65 inch',         'fa-tv',    1);
  await insEquip(r5, 'Tivi 65 inch',         'fa-tv',    2);
  await insEquip(r7, 'Màn hình trình chiếu', 'fa-tv',    1);
  await insEquip(r7, 'Camera hội nghị',      'fa-video', 2);
  await insEquip(r8, 'Máy quay streaming',   'fa-video', 1);
  await insEquip(r6, 'Máy tính',             'fa-laptop', 25);
  console.log('  ✅ Equipment seeded');

  // ─── Roles ─────────────────────────────────────────────────────────────────
  const role1 = await ins(
    `INSERT INTO "Role" ("Name","Description") VALUES ($1,$2)`,
    ['Quản trị ứng dụng', 'Toàn quyền thực hiện các chức năng trong ứng dụng']
  );
  await ins(`INSERT INTO "Role" ("Name","Description") VALUES ($1,$2)`,
    ['Người quản lý đặt phòng', 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác']);
  await ins(`INSERT INTO "Role" ("Name","Description") VALUES ($1,$2)`,
    ['Người đặt phòng', 'Có quyền cập nhật đặt phòng của chính mình']);
  await pool.query(
    `INSERT INTO "UserRole" ("UserID","RoleID") VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    ['admin', role1]
  );
  console.log('  ✅ Roles seeded');

  // ─── Settings ──────────────────────────────────────────────────────────────
  const settings = [
    ['timeFormat', '24h'], ['slotMinutes', '30'], ['defaultDuration', '60'],
    ['maxDuration', '0'], ['timezone', 'Asia/Ho_Chi_Minh'], ['theme', 'dark'],
    ['workdayStart', '07:00'], ['workdayEnd', '21:00'],
  ];
  for (const [k, v] of settings) {
    await pool.query(
      `INSERT INTO Setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [k, v]
    );
  }
  console.log('  ✅ Settings seeded');

  // ─── Sample bookings ───────────────────────────────────────────────────────
  const now = new Date();
  const fmt = (d) => {
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}-${mo}-${day} ${hh}:${mm}:00`;
  };
  const D = (h, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

  const b1 = await ins(`INSERT INTO Booking ("UserID") VALUES ($1)`, ['user01']);
  await pool.query(
    `INSERT INTO LineRoom ("BookingID","UserID","FacultyID","RoomID","TimeStart","TimeEnd","Title","NumberPerson","Status")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [b1, 'user01', f1, r2, fmt(D(9)), fmt(D(11)), 'Họp nhóm nghiên cứu', 8, 1]
  );

  const b2 = await ins(`INSERT INTO Booking ("UserID") VALUES ($1)`, ['admin']);
  await pool.query(
    `INSERT INTO LineRoom ("BookingID","UserID","FacultyID","RoomID","TimeStart","TimeEnd","Title","NumberPerson","Status")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [b2, 'admin', f4, r3, fmt(D(14)), fmt(D(16)), 'Họp Ban Giám hiệu', 15, 1]
  );

  const b3 = await ins(`INSERT INTO Booking ("UserID") VALUES ($1)`, ['user02']);
  await pool.query(
    `INSERT INTO LineRoom ("BookingID","UserID","FacultyID","RoomID","TimeStart","TimeEnd","Title","NumberPerson","Status")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [b3, 'user02', f2, r1, fmt(D(10)), fmt(D(12)), 'Báo cáo tiến độ dự án', 5, 0]
  );
  console.log('  ✅ Sample bookings seeded');

  await pool.end();
  console.log('\n🎉 Database initialized successfully!');
  console.log('   Login: admin/admin123 | user01-user20/123456');
}

main().catch(err => {
  console.error('❌ Init failed:', err.message);
  process.exit(1);
});
