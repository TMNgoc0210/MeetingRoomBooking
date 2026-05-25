const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Đường dẫn
const rootDir = path.join(__dirname, '../../../'); // Thư mục gốc DoAn2026
const sourceDir = path.join(rootDir, 'anh'); // d:\DoAn2026\anh
const uploadDir = path.join(__dirname, '../../uploads/images'); // d:\DoAn2026\backend\uploads\images
const dbPath = path.join(__dirname, '../../data/meeting_booking.db');

// Tạo thư mục uploads nếu chưa có
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Lấy danh sách các ảnh từ thư mục 'anh'
let sourceImages = [];
if (fs.existsSync(sourceDir)) {
  sourceImages = fs.readdirSync(sourceDir).filter(file => file.startsWith('hop') && file.endsWith('.jpg'));
}

if (sourceImages.length === 0) {
  console.log('❌ Không tìm thấy ảnh nào bắt đầu bằng "hop" trong thư mục:', sourceDir);
  process.exit(1);
}

// Sắp xếp ảnh theo số: hop1.jpg, hop2.jpg...
sourceImages.sort((a, b) => {
  const numA = parseInt(a.replace('hop', '').replace('.jpg', ''));
  const numB = parseInt(b.replace('hop', '').replace('.jpg', ''));
  return numA - numB;
});

// Copy file ảnh sang uploads
console.log('⏳ Đang copy ảnh vào thư mục uploads/images...');
sourceImages.forEach(img => {
  fs.copyFileSync(path.join(sourceDir, img), path.join(uploadDir, img));
  console.log(`  - Đã copy ${img}`);
});

// Kết nối DB
const db = new Database(dbPath);

// Cập nhật Database
console.log('\n⏳ Đang cập nhật ảnh cho các phòng trong CSDL...');
const rooms = db.prepare('SELECT RoomID, RoomName FROM Room ORDER BY RoomID').all();

const updateRoom = db.prepare('UPDATE Room SET Avatar = ? WHERE RoomID = ?');
let imageIndex = 0;

rooms.forEach(room => {
  // Lấy ảnh vòng lặp (nếu có 9 ảnh mà > 9 phòng thì quay lại ảnh đầu)
  const imgName = sourceImages[imageIndex % sourceImages.length];
  const avatarPath = `/uploads/images/${imgName}`;
  
  updateRoom.run(avatarPath, room.RoomID);
  console.log(`  - Phòng [${room.RoomName}] được gán ảnh: ${avatarPath}`);
  
  imageIndex++;
});

db.close();
console.log('\n🎉 Hoàn tất! Tất cả các phòng đã được cập nhật ảnh.');
console.log('💡 Mẹo: Hãy ra trình duyệt và nhấn F5 tải lại trang để xem thành quả nhé!');
