/**
 * migrate.js — Bổ sung cột/bảng còn thiếu vào DB SQL Server đã tạo
 * Chạy: node src/config/migrate.js
 * An toàn để chạy nhiều lần (idempotent).
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'MeetingRoomBooking',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true',
    enableArithAbort:       true,
  },
};

async function addColIfNotExists(pool, table, column, definition) {
  const res = await pool.request().query(`
    SELECT COUNT(*) AS c
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
  `);
  if (res.recordset[0].c === 0) {
    await pool.request().query(`ALTER TABLE [${table}] ADD [${column}] ${definition}`);
    console.log(`  ✅ Added [${table}].[${column}]`);
  } else {
    console.log(`  ⏭️  [${table}].[${column}] already exists`);
  }
}

async function main() {
  const pool = await sql.connect(config);
  console.log('🚀 Running SQL Server migrations...\n');

  await addColIfNotExists(pool, 'LineRoom', 'Status',           'INT DEFAULT 1');
  await addColIfNotExists(pool, 'LineRoom', 'ApprovedBy',       'NVARCHAR(100) DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'ApprovedAt',       'NVARCHAR(20)  DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'RecurringGroupID', 'INT           DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'RecurringType',    'NVARCHAR(20)  DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'RecurringEnd',     'NVARCHAR(20)  DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'RejectReason',     'NVARCHAR(MAX) DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'ServiceRequest',   'NVARCHAR(MAX) DEFAULT NULL');
  await addColIfNotExists(pool, 'LineRoom', 'ReminderSent',     'INT           DEFAULT 0');
  await addColIfNotExists(pool, 'Room',     'IsVIP',            'INT           DEFAULT 0');
  await addColIfNotExists(pool, 'Room',     'VIPCondition',     'INT           DEFAULT 0');
  await addColIfNotExists(pool, 'Room',     'VIPMinutes',       'INT           DEFAULT 60');

  // Tạo bảng nếu chưa có
  await pool.request().query(`
    IF OBJECT_ID('Equipment','U') IS NULL
    CREATE TABLE Equipment (
      EquipmentID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      RoomID      INT           NOT NULL REFERENCES Room(RoomID),
      Name        NVARCHAR(200) NOT NULL,
      Icon        NVARCHAR(100) DEFAULT 'fa-cube',
      Quantity    INT           DEFAULT 1,
      Note        NVARCHAR(MAX) DEFAULT '',
      Visible     INT           DEFAULT 1
    )
  `);

  await pool.request().query(`
    IF OBJECT_ID('BookingAttendee','U') IS NULL
    CREATE TABLE BookingAttendee (
      AttendeeID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      LineRoomID INT           NOT NULL REFERENCES LineRoom(LineRoomID),
      UserID     NVARCHAR(100) NOT NULL REFERENCES [User](UserID),
      Status     INT           DEFAULT 0,
      InvitedAt  NVARCHAR(20)  DEFAULT '',
      CONSTRAINT UC_BookingAttendee UNIQUE (LineRoomID, UserID)
    )
  `);

  await pool.request().query(`
    IF OBJECT_ID('BookingAttachment','U') IS NULL
    CREATE TABLE BookingAttachment (
      AttachmentID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      LineRoomID   INT           NOT NULL REFERENCES LineRoom(LineRoomID),
      FileName     NVARCHAR(500) NOT NULL,
      FilePath     NVARCHAR(MAX) NOT NULL,
      FileSize     INT           DEFAULT 0,
      MimeType     NVARCHAR(200) DEFAULT '',
      UploadedAt   NVARCHAR(20)  DEFAULT '',
      UploadedBy   NVARCHAR(100) DEFAULT ''
    )
  `);

  await pool.request().query(`
    IF OBJECT_ID('Setting','U') IS NULL
    CREATE TABLE Setting ([Key] NVARCHAR(100) NOT NULL PRIMARY KEY, [Value] NVARCHAR(MAX) NOT NULL DEFAULT '')
  `);

  // Seed settings mặc định
  for (const [k, v] of [
    ['timeFormat','24h'],['slotMinutes','30'],['defaultDuration','60'],
    ['maxDuration','0'],['timezone','Asia/Ho_Chi_Minh'],['theme','dark'],
    ['workdayStart','07:00'],['workdayEnd','21:00'],
  ]) {
    await pool.request().input('k', sql.NVarChar, k).input('v', sql.NVarChar, v).query(`
      IF NOT EXISTS (SELECT 1 FROM Setting WHERE [Key]=@k)
        INSERT INTO Setting ([Key],[Value]) VALUES (@k,@v)
    `);
  }

  await pool.request().query(`
    IF OBJECT_ID('Role','U') IS NULL
    CREATE TABLE Role (
      RoleID      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      Name        NVARCHAR(200) NOT NULL CONSTRAINT UC_Role_Name UNIQUE,
      Description NVARCHAR(MAX) DEFAULT '',
      CreatedAt   NVARCHAR(20)  DEFAULT ''
    )
  `);

  for (const [n, d] of [
    ['Quản trị ứng dụng',       'Toàn quyền thực hiện các chức năng trong ứng dụng'],
    ['Người quản lý đặt phòng', 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác'],
    ['Người đặt phòng',         'Có quyền cập nhật đặt phòng của chính mình'],
  ]) {
    await pool.request().input('n', sql.NVarChar, n).input('d', sql.NVarChar, d).query(`
      IF NOT EXISTS (SELECT 1 FROM Role WHERE Name=@n)
        INSERT INTO Role (Name,Description) VALUES (@n,@d)
    `);
  }

  await pool.request().query(`
    IF OBJECT_ID('UserRole','U') IS NULL
    CREATE TABLE UserRole (
      UserRoleID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      UserID     NVARCHAR(100) NOT NULL REFERENCES [User](UserID),
      RoleID     INT           NOT NULL REFERENCES Role(RoleID),
      AssignedAt NVARCHAR(20)  DEFAULT '',
      CONSTRAINT UC_UserRole UNIQUE (UserID, RoleID)
    )
  `);

  await pool.request().query(`
    IF OBJECT_ID('AI_Chat_Log','U') IS NULL
    CREATE TABLE AI_Chat_Log (
      LogID       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      UserID      NVARCHAR(100) DEFAULT NULL,
      UserMessage NVARCHAR(MAX) NOT NULL,
      BotReply    NVARCHAR(MAX) DEFAULT NULL,
      AI_JSON     NVARCHAR(MAX) DEFAULT NULL,
      CreateDate  NVARCHAR(20)  DEFAULT ''
    )
  `);

  await pool.request().query(`
    IF OBJECT_ID('LoginLog','U') IS NULL
    CREATE TABLE LoginLog (
      LogID     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      Username  NVARCHAR(100) NOT NULL,
      IP        NVARCHAR(50)  DEFAULT '',
      Status    NVARCHAR(20)  NOT NULL,
      Reason    NVARCHAR(200) DEFAULT '',
      CreatedAt NVARCHAR(30)  DEFAULT ''
    )
  `);
  console.log('  ✅ LoginLog table ready');

  await pool.close();
  console.log('\n🎉 All migrations completed!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
