/**
 * migrate.js — Bổ sung cột/bảng còn thiếu vào DB PostgreSQL đã tạo
 * Chạy: node src/config/migrate.js
 * Idempotent — an toàn khi chạy nhiều lần.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

async function addColIfNotExists(table, column, definition) {
  const res = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [table.toLowerCase(), column.toLowerCase()]
  );
  if (parseInt(res.rows[0].c) === 0) {
    await pool.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition}`);
    console.log(`  ✅ Added "${table}"."${column}"`);
  } else {
    console.log(`  ⏭️  "${table}"."${column}" already exists`);
  }
}

async function main() {
  console.log('🚀 Running PostgreSQL migrations...\n');

  await addColIfNotExists('LineRoom', 'Status',           'INTEGER DEFAULT 1');
  await addColIfNotExists('LineRoom', 'ApprovedBy',       'VARCHAR(100) DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'ApprovedAt',       'VARCHAR(20) DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'RecurringGroupID', 'INTEGER DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'RecurringType',    'VARCHAR(20) DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'RecurringEnd',     'VARCHAR(20) DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'RejectReason',     'TEXT DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'ServiceRequest',   'TEXT DEFAULT NULL');
  await addColIfNotExists('LineRoom', 'ReminderSent',     'INTEGER DEFAULT 0');
  await addColIfNotExists('LineRoom', 'CancelledAt',      'TIMESTAMP DEFAULT NULL');
  await addColIfNotExists('Room',     'IsVIP',            'INTEGER DEFAULT 0');
  await addColIfNotExists('Room',     'VIPCondition',     'INTEGER DEFAULT 0');
  await addColIfNotExists('Room',     'VIPMinutes',       'INTEGER DEFAULT 60');

  // Tạo bảng nếu chưa có
  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS BookingAttendee (
      "AttendeeID" SERIAL PRIMARY KEY,
      "LineRoomID" INTEGER NOT NULL REFERENCES LineRoom("LineRoomID"),
      "UserID"     VARCHAR(100) NOT NULL REFERENCES "User"("UserID"),
      "Status"     INTEGER DEFAULT 0,
      "InvitedAt"  VARCHAR(20) DEFAULT '',
      CONSTRAINT uc_booking_attendee UNIQUE ("LineRoomID", "UserID")
    )
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Setting (
      key   VARCHAR(100) NOT NULL PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);

  // Seed settings mặc định
  for (const [k, v] of [
    ['timeFormat','24h'],['slotMinutes','30'],['defaultDuration','60'],
    ['maxDuration','0'],['timezone','Asia/Ho_Chi_Minh'],['theme','dark'],
    ['workdayStart','07:00'],['workdayEnd','21:00'],
  ]) {
    await pool.query(
      `INSERT INTO Setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [k, v]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Role" (
      "RoleID"      SERIAL PRIMARY KEY,
      "Name"        VARCHAR(200) NOT NULL UNIQUE,
      "Description" TEXT DEFAULT '',
      "CreatedAt"   VARCHAR(20) DEFAULT ''
    )
  `);

  for (const [n, d] of [
    ['Quản trị ứng dụng',       'Toàn quyền thực hiện các chức năng trong ứng dụng'],
    ['Người quản lý đặt phòng', 'Có quyền sửa, xóa, phê duyệt đặt phòng của người khác'],
    ['Người đặt phòng',         'Có quyền cập nhật đặt phòng của chính mình'],
  ]) {
    await pool.query(
      `INSERT INTO "Role" ("Name","Description") VALUES ($1,$2) ON CONFLICT ("Name") DO NOTHING`,
      [n, d]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "UserRole" (
      "UserRoleID" SERIAL PRIMARY KEY,
      "UserID"     VARCHAR(100) NOT NULL REFERENCES "User"("UserID"),
      "RoleID"     INTEGER NOT NULL REFERENCES "Role"("RoleID"),
      "AssignedAt" VARCHAR(20) DEFAULT '',
      CONSTRAINT uc_user_role UNIQUE ("UserID", "RoleID")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS AI_Chat_Log (
      "LogID"       SERIAL PRIMARY KEY,
      "UserID"      VARCHAR(100) DEFAULT NULL,
      "UserMessage" TEXT NOT NULL,
      "BotReply"    TEXT DEFAULT NULL,
      "AI_JSON"     TEXT DEFAULT NULL,
      "CreateDate"  VARCHAR(20) DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LoginLog (
      "LogID"     SERIAL PRIMARY KEY,
      "Username"  VARCHAR(100) NOT NULL,
      "IP"        VARCHAR(50)  DEFAULT '',
      "Status"    VARCHAR(20)  NOT NULL,
      "Reason"    VARCHAR(200) DEFAULT '',
      "CreatedAt" VARCHAR(30)  DEFAULT ''
    )
  `);
  console.log('  ✅ All tables verified');

  await pool.end();
  console.log('\n🎉 All migrations completed!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
