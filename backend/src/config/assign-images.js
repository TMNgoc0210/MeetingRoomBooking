/**
 * assign-images.js — Copy ảnh từ thư mục 'anh' và gán vào các phòng trong CSDL
 * Chạy: node src/config/assign-images.js
 */
const sql = require('mssql');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const sourceDir = path.join(__dirname, '../../../anh');
const uploadDir = path.join(__dirname, '../../uploads/images');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

let sourceImages = [];
if (fs.existsSync(sourceDir)) {
  sourceImages = fs.readdirSync(sourceDir).filter(f => f.startsWith('hop') && f.endsWith('.jpg'));
}
if (sourceImages.length === 0) {
  console.log('❌ Không tìm thấy ảnh "hop*.jpg" trong:', sourceDir);
  process.exit(1);
}
sourceImages.sort((a, b) => {
  const n = s => parseInt(s.replace('hop', '').replace('.jpg', ''));
  return n(a) - n(b);
});

console.log('⏳ Đang copy ảnh...');
sourceImages.forEach(img => {
  fs.copyFileSync(path.join(sourceDir, img), path.join(uploadDir, img));
  console.log(`  - Đã copy ${img}`);
});

async function main() {
  const pool = await sql.connect({
    server:   process.env.DB_SERVER   || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME     || 'MeetingRoomBooking',
    user:     process.env.DB_USER     || 'sa',
    password: process.env.DB_PASSWORD || '',
    options:  { encrypt: false, trustServerCertificate: true },
  });

  console.log('\n⏳ Đang cập nhật ảnh cho phòng...');
  const rooms = await pool.request().query('SELECT RoomID, RoomName FROM Room ORDER BY RoomID');
  let i = 0;
  for (const room of rooms.recordset) {
    const avatarPath = `/uploads/images/${sourceImages[i % sourceImages.length]}`;
    await pool.request()
      .input('path', sql.NVarChar, avatarPath)
      .input('id',   sql.Int,     room.RoomID)
      .query('UPDATE Room SET Avatar=@path WHERE RoomID=@id');
    console.log(`  - [${room.RoomName}] → ${avatarPath}`);
    i++;
  }

  await pool.close();
  console.log('\n🎉 Hoàn tất!');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
