/**
 * init-db.js — Tạo schema SQL Server và seed dữ liệu mẫu
 * Chạy: node src/config/init-db.js
 * Lưu ý: bỏ qua seed nếu đã có data (idempotent về dữ liệu).
 */
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_NAME = process.env.DB_NAME || 'MeetingRoomBooking';

const baseConfig = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options:  {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true',
    enableArithAbort:       true,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _pool;
function bind(req, params) {
  for (const [k, v] of Object.entries(params || {})) {
    if (v === null || v === undefined) req.input(k, sql.NVarChar, null);
    else if (Number.isInteger(v))       req.input(k, sql.Int, v);
    else                                req.input(k, sql.NVarChar(sql.MAX), String(v));
  }
}
async function run(sqlStr, params = {}) {
  const req = _pool.request();
  bind(req, params);
  return req.query(sqlStr);
}
async function ins(sqlStr, params = {}) {
  const req = _pool.request();
  bind(req, params);
  const result = await req.query(`${sqlStr}; SELECT SCOPE_IDENTITY() AS id`);
  return parseInt(result.recordset[0].id);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📦 Connecting to SQL Server: ${baseConfig.server}`);

  // SKIP_CREATE_DB=true khi dùng hosted DB (freesqldatabase, Azure) đã có sẵn DB
  if (process.env.SKIP_CREATE_DB !== 'true') {
    const masterPool = await sql.connect({ ...baseConfig, database: 'master' });
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${DB_NAME}')
        CREATE DATABASE [${DB_NAME}]
    `);
    await masterPool.close();
  }
  console.log(`✅ Database [${DB_NAME}] ready`);

  // Kết nối vào database đích
  _pool = await sql.connect({ ...baseConfig, database: DB_NAME });
  console.log('\n📋 Creating tables...');

  await run(`
    IF OBJECT_ID('Faculty','U') IS NULL
    CREATE TABLE Faculty (
      FacultyID   INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      FacultyName NVARCHAR(200) NOT NULL,
      Avatar      NVARCHAR(MAX) DEFAULT '',
      [Desc]      NVARCHAR(MAX) DEFAULT '',
      Visible     INT           DEFAULT 1,
      CreateDate  NVARCHAR(20)  DEFAULT '',
      CreateBy    NVARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Faculty');

  await run(`
    IF OBJECT_ID('[User]','U') IS NULL
    CREATE TABLE [User] (
      UserID     NVARCHAR(100) NOT NULL PRIMARY KEY,
      FullName   NVARCHAR(200) NOT NULL,
      Password   NVARCHAR(255) NOT NULL,
      FacultyID  INT           REFERENCES Faculty(FacultyID),
      Mobi       NVARCHAR(50)  DEFAULT '',
      Email      NVARCHAR(200) DEFAULT '',
      Avatar     NVARCHAR(MAX) DEFAULT '/uploads/images/nopic.png',
      Visible    INT           DEFAULT 1,
      Roles      INT           DEFAULT 0,
      CreateDate NVARCHAR(20)  DEFAULT '',
      CreateBy   NVARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ [User]');

  await run(`
    IF OBJECT_ID('Area','U') IS NULL
    CREATE TABLE Area (
      AreaID     INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      AreaName   NVARCHAR(200) NOT NULL,
      Avatar     NVARCHAR(MAX) DEFAULT '',
      [Desc]     NVARCHAR(MAX) DEFAULT '',
      Visible    INT           DEFAULT 1,
      CreateDate NVARCHAR(20)  DEFAULT '',
      CreateBy   NVARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Area');

  await run(`
    IF OBJECT_ID('Room','U') IS NULL
    CREATE TABLE Room (
      RoomID       INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      RoomName     NVARCHAR(200) NOT NULL,
      AreaID       INT           REFERENCES Area(AreaID),
      Seat         INT           DEFAULT 10,
      PhoneCall    INT           DEFAULT 0,
      VideoCall    INT           DEFAULT 0,
      IsVIP        INT           DEFAULT 0,
      VIPCondition INT           DEFAULT 0,
      VIPMinutes   INT           DEFAULT 60,
      Visible      INT           DEFAULT 1,
      [Desc]       NVARCHAR(MAX) DEFAULT '',
      Avatar       NVARCHAR(MAX) DEFAULT '',
      CreateDate   NVARCHAR(20)  DEFAULT '',
      CreateBy     NVARCHAR(100) DEFAULT 'admin'
    )
  `);
  console.log('  ✅ Room');

  await run(`
    IF OBJECT_ID('Equipment','U') IS NULL
    CREATE TABLE Equipment (
      EquipmentID INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      RoomID      INT           NOT NULL REFERENCES Room(RoomID),
      Name        NVARCHAR(200) NOT NULL,
      Icon        NVARCHAR(100) DEFAULT 'fa-cube',
      Quantity    INT           DEFAULT 1,
      Note        NVARCHAR(MAX) DEFAULT '',
      Visible     INT           DEFAULT 1
    )
  `);
  console.log('  ✅ Equipment');

  await run(`
    IF OBJECT_ID('Booking','U') IS NULL
    CREATE TABLE Booking (
      BookingID  INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      UserID     NVARCHAR(100) REFERENCES [User](UserID),
      CreateDate NVARCHAR(20)  DEFAULT ''
    )
  `);
  console.log('  ✅ Booking');

  await run(`
    IF OBJECT_ID('LineRoom','U') IS NULL
    CREATE TABLE LineRoom (
      LineRoomID       INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      BookingID        INT           REFERENCES Booking(BookingID),
      UserID           NVARCHAR(100) REFERENCES [User](UserID),
      FacultyID        INT           REFERENCES Faculty(FacultyID),
      RoomID           INT           REFERENCES Room(RoomID),
      TimeStart        NVARCHAR(20)  NOT NULL,
      TimeEnd          NVARCHAR(20)  NOT NULL,
      Title            NVARCHAR(500) DEFAULT '',
      Content          NVARCHAR(MAX) DEFAULT '',
      Note             NVARCHAR(MAX) DEFAULT '',
      NumberPerson     INT           DEFAULT 1,
      Status           INT           DEFAULT 1,
      ApprovedBy       NVARCHAR(100) DEFAULT NULL,
      ApprovedAt       NVARCHAR(20)  DEFAULT NULL,
      RejectReason     NVARCHAR(MAX) DEFAULT NULL,
      ServiceRequest   NVARCHAR(MAX) DEFAULT NULL,
      RecurringGroupID INT           DEFAULT NULL,
      RecurringType    NVARCHAR(20)  DEFAULT NULL,
      RecurringEnd     NVARCHAR(20)  DEFAULT NULL,
      ReminderSent     INT           DEFAULT 0,
      CreateDate       NVARCHAR(20)  DEFAULT ''
    )
  `);
  console.log('  ✅ LineRoom');

  await run(`
    IF OBJECT_ID('BookingAttendee','U') IS NULL
    CREATE TABLE BookingAttendee (
      AttendeeID INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      LineRoomID INT           NOT NULL REFERENCES LineRoom(LineRoomID),
      UserID     NVARCHAR(100) NOT NULL REFERENCES [User](UserID),
      Status     INT           DEFAULT 0,
      InvitedAt  NVARCHAR(20)  DEFAULT '',
      CONSTRAINT UC_BookingAttendee UNIQUE (LineRoomID, UserID)
    )
  `);
  console.log('  ✅ BookingAttendee');

  await run(`
    IF OBJECT_ID('BookingAttachment','U') IS NULL
    CREATE TABLE BookingAttachment (
      AttachmentID INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      LineRoomID   INT           NOT NULL REFERENCES LineRoom(LineRoomID),
      FileName     NVARCHAR(500) NOT NULL,
      FilePath     NVARCHAR(MAX) NOT NULL,
      FileSize     INT           DEFAULT 0,
      MimeType     NVARCHAR(200) DEFAULT '',
      UploadedAt   NVARCHAR(20)  DEFAULT '',
      UploadedBy   NVARCHAR(100) DEFAULT ''
    )
  `);
  console.log('  ✅ BookingAttachment');

  await run(`
    IF OBJECT_ID('Role','U') IS NULL
    CREATE TABLE Role (
      RoleID      INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      Name        NVARCHAR(200) NOT NULL CONSTRAINT UC_Role_Name UNIQUE,
      Description NVARCHAR(MAX) DEFAULT '',
      CreatedAt   NVARCHAR(20)  DEFAULT ''
    )
  `);
  console.log('  ✅ Role');

  await run(`
    IF OBJECT_ID('UserRole','U') IS NULL
    CREATE TABLE UserRole (
      UserRoleID INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      UserID     NVARCHAR(100) NOT NULL REFERENCES [User](UserID),
      RoleID     INT           NOT NULL REFERENCES Role(RoleID),
      AssignedAt NVARCHAR(20)  DEFAULT '',
      CONSTRAINT UC_UserRole UNIQUE (UserID, RoleID)
    )
  `);
  console.log('  ✅ UserRole');

  await run(`
    IF OBJECT_ID('Setting','U') IS NULL
    CREATE TABLE Setting (
      [Key]   NVARCHAR(100) NOT NULL PRIMARY KEY,
      [Value] NVARCHAR(MAX) NOT NULL DEFAULT ''
    )
  `);
  console.log('  ✅ Setting');

  await run(`
    IF OBJECT_ID('AI_Chat_Log','U') IS NULL
    CREATE TABLE AI_Chat_Log (
      LogID       INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
      UserID      NVARCHAR(100) DEFAULT NULL,
      UserMessage NVARCHAR(MAX) NOT NULL,
      BotReply    NVARCHAR(MAX) DEFAULT NULL,
      AI_JSON     NVARCHAR(MAX) DEFAULT NULL,
      CreateDate  NVARCHAR(20)  DEFAULT ''
    )
  `);
  console.log('  ✅ AI_Chat_Log');

  // Kiểm tra đã seed chưa
  const userCount = await run('SELECT COUNT(*) AS c FROM [User]');
  if (userCount.recordset[0].c > 0) {
    console.log('\n✅ Database already seeded, skipping...');
    await _pool.close();
    process.exit(0);
  }

  // ══════════════════════════════════════════════════════════════
  // SEED DATA
  // ══════════════════════════════════════════════════════════════
  console.log('\n🌱 Seeding data...');

  // ─── Faculties ─────────────────────────────────────────────────────────────
  const f1  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Công nghệ Thông tin' });
  const f2  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Kinh tế' });
  const f3  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Phòng Đào tạo' });
  const f4  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Ban Giám hiệu' });
  const f5  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Cơ khí - Xây dựng' });
  const f6  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Điện - Điện tử' });
  const f7  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Hóa học - Thực phẩm' });
  const f8  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Quản trị Kinh doanh' });
  const f9  = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Khoa Ngoại ngữ' });
  const f10 = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Phòng Hành chính - Nhân sự' });
  const f11 = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Phòng Tài chính - Kế toán' });
  const f12 = await ins(`INSERT INTO Faculty (FacultyName,Visible) VALUES (@n,1)`, { n: 'Trung tâm Nghiên cứu & Phát triển' });
  console.log('  ✅ Faculties seeded');

  // ─── Users ─────────────────────────────────────────────────────────────────
  const h = (p) => bcrypt.hashSync(p, 10);
  const insertUser = async (id, name, pass, roles, facID, email) => {
    await run(
      `INSERT INTO [User] (UserID,FullName,Password,Roles,Visible,FacultyID,Email,Mobi)
       VALUES (@id,@name,@pass,@roles,1,@fac,@email,'')`,
      { id, name, pass: h(pass), roles, fac: facID, email }
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
  const a1 = await ins(`INSERT INTO Area (AreaName,Visible) VALUES (@n,1)`, { n: 'Khu A - Tòa nhà chính' });
  const a2 = await ins(`INSERT INTO Area (AreaName,Visible) VALUES (@n,1)`, { n: 'Khu B - Thư viện' });
  const a3 = await ins(`INSERT INTO Area (AreaName,Visible) VALUES (@n,1)`, { n: 'Khu C - Phòng thí nghiệm' });
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
      `INSERT INTO Room (RoomName,AreaID,Seat,PhoneCall,VideoCall,IsVIP,VIPCondition,VIPMinutes,Visible,[Desc],Avatar)
       VALUES (@name,@areaID,@seat,@phone,@video,@vip,@vipCond,@vipMin,1,@desc,@img)`,
      { name, areaID, seat, phone, video, vip, vipCond, vipMin, desc, img }
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
    run(`INSERT INTO Equipment (RoomID,Name,Icon,Quantity) VALUES (@r,@n,@i,@q)`,
        { r: roomID, n: name, i: icon, q: qty });

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
  const role1 = await ins(`INSERT INTO Role (Name,Description) VALUES (@n,@d)`,
    { n: 'Quản trị ứng dụng',       d: 'Toàn quyền thực hiện các chức năng trong ứng dụng' });
  await ins(`INSERT INTO Role (Name,Description) VALUES (@n,@d)`,
    { n: 'Người quản lý đặt phòng', d: 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác' });
  await ins(`INSERT INTO Role (Name,Description) VALUES (@n,@d)`,
    { n: 'Người đặt phòng',         d: 'Có quyền cập nhật đặt phòng của chính mình' });
  await run(`INSERT INTO UserRole (UserID,RoleID) VALUES (@uid,@rid)`, { uid: 'admin', rid: role1 });
  console.log('  ✅ Roles seeded');

  // ─── Settings ──────────────────────────────────────────────────────────────
  const settings = [
    ['timeFormat', '24h'], ['slotMinutes', '30'], ['defaultDuration', '60'],
    ['maxDuration', '0'], ['timezone', 'Asia/Ho_Chi_Minh'], ['theme', 'dark'],
    ['workdayStart', '07:00'], ['workdayEnd', '21:00'],
  ];
  for (const [k, v] of settings) {
    await run(
      `IF NOT EXISTS (SELECT 1 FROM Setting WHERE [Key]=@k)
       INSERT INTO Setting ([Key],[Value]) VALUES (@k,@v)`,
      { k, v }
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

  const b1 = await ins(`INSERT INTO Booking (UserID) VALUES (@uid)`, { uid: 'user01' });
  await run(
    `INSERT INTO LineRoom (BookingID,UserID,FacultyID,RoomID,TimeStart,TimeEnd,Title,NumberPerson,Status)
     VALUES (@bid,@uid,@fid,@rid,@ts,@te,@title,@np,@st)`,
    { bid: b1, uid: 'user01', fid: f1, rid: r2, ts: fmt(D(9)), te: fmt(D(11)), title: 'Họp nhóm nghiên cứu', np: 8, st: 1 }
  );

  const b2 = await ins(`INSERT INTO Booking (UserID) VALUES (@uid)`, { uid: 'admin' });
  await run(
    `INSERT INTO LineRoom (BookingID,UserID,FacultyID,RoomID,TimeStart,TimeEnd,Title,NumberPerson,Status)
     VALUES (@bid,@uid,@fid,@rid,@ts,@te,@title,@np,@st)`,
    { bid: b2, uid: 'admin', fid: f4, rid: r3, ts: fmt(D(14)), te: fmt(D(16)), title: 'Họp Ban Giám hiệu', np: 15, st: 1 }
  );

  const b3 = await ins(`INSERT INTO Booking (UserID) VALUES (@uid)`, { uid: 'user02' });
  await run(
    `INSERT INTO LineRoom (BookingID,UserID,FacultyID,RoomID,TimeStart,TimeEnd,Title,NumberPerson,Status)
     VALUES (@bid,@uid,@fid,@rid,@ts,@te,@title,@np,@st)`,
    { bid: b3, uid: 'user02', fid: f2, rid: r1, ts: fmt(D(10)), te: fmt(D(12)), title: 'Báo cáo tiến độ dự án', np: 5, st: 0 }
  );
  console.log('  ✅ Sample bookings seeded');

  await _pool.close();
  console.log('\n🎉 Database initialized successfully!');
  console.log('   Login: admin/admin123 | user01-user20/123456 | ngocphan|ngocpro457|ngoctran457/123456');
}

main().catch(err => {
  console.error('❌ Init failed:', err.message);
  process.exit(1);
});
