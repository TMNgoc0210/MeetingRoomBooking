const { db } = require('../src/config/db');

// Phòng 7: Phòng Hội Nghị VIP B301 - Khu B (IsVIP=1)
const r7 = db.prepare(
  "INSERT INTO Room (RoomName, AreaID, Seat, PhoneCall, VideoCall, Visible, Desc, Avatar, CreateDate, CreateBy, IsVIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 'admin', ?)"
).run(
  'Phòng Hội Nghị VIP B301', 2, 40, 1, 1, 1,
  'Phòng hội nghị cao cấp tầng 3 khu Thư viện, trang bị hệ thống hội nghị truyền hình chuyên nghiệp, sức chứa 40 người. Yêu cầu phê duyệt admin.',
  '/uploads/images/hop_b301.jpg',
  1
);
console.log('Room 7 inserted, ID:', r7.lastInsertRowid);

const eq7 = db.prepare('INSERT INTO Equipment (RoomID, Name, Icon, Quantity, Note, Visible) VALUES (?, ?, ?, ?, ?, 1)');
eq7.run(r7.lastInsertRowid, 'Màn hình LED 85 inch',          'fa-tv',          1, 'Màn hình chính hội trường');
eq7.run(r7.lastInsertRowid, 'Máy chiếu 4K',                  'fa-desktop',     2, 'Chiếu hai đầu phòng');
eq7.run(r7.lastInsertRowid, 'Hệ thống loa hội nghị',         'fa-volume-up',   1, 'Bose Professional');
eq7.run(r7.lastInsertRowid, 'Micro không dây',               'fa-microphone',  4, 'Shure wireless');
eq7.run(r7.lastInsertRowid, 'Camera hội nghị truyền hình',   'fa-video',       2, 'Sony PTZ');
eq7.run(r7.lastInsertRowid, 'Điều hòa trung tâm',            'fa-wind',        2, 'Daikin inverter');
eq7.run(r7.lastInsertRowid, 'Bảng tương tác thông minh',     'fa-chalkboard',  1, 'Smart board 75 inch');
eq7.run(r7.lastInsertRowid, 'Bộ điều khiển hội nghị',        'fa-sliders-h',   1, 'Crestron control panel');
console.log('Equipment for Room 7 inserted (8 items)');

// Phòng 8: Phòng Đào Tạo C202 - Khu C (IsVIP=0)
const r8 = db.prepare(
  "INSERT INTO Room (RoomName, AreaID, Seat, PhoneCall, VideoCall, Visible, Desc, Avatar, CreateDate, CreateBy, IsVIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 'admin', ?)"
).run(
  'Phòng Đào Tạo C202', 3, 35, 1, 1, 1,
  'Phòng đào tạo và hội thảo khu thí nghiệm tầng 2, bố trí linh hoạt dạng lớp học hoặc hội thảo, tích hợp hệ thống ghi âm và streaming trực tuyến.',
  '/uploads/images/hop_c202.jpg',
  0
);
console.log('Room 8 inserted, ID:', r8.lastInsertRowid);

const eq8 = db.prepare('INSERT INTO Equipment (RoomID, Name, Icon, Quantity, Note, Visible) VALUES (?, ?, ?, ?, ?, 1)');
eq8.run(r8.lastInsertRowid, 'Máy chiếu Full HD',       'fa-desktop',    1, 'Epson EB-2250U');
eq8.run(r8.lastInsertRowid, 'Màn chiếu điện 120 inch', 'fa-expand',     1, 'Tự động cuộn');
eq8.run(r8.lastInsertRowid, 'Bảng trắng từ',           'fa-chalkboard', 2, 'Hai bên tường');
eq8.run(r8.lastInsertRowid, 'Micro cài ve áo',         'fa-microphone', 2, 'Dành cho giảng viên');
eq8.run(r8.lastInsertRowid, 'Loa di động',             'fa-volume-up',  1, 'JBL EON One');
eq8.run(r8.lastInsertRowid, 'Máy tính bảng giảng dạy','fa-tablet-alt', 1, 'iPad Pro 12.9 inch');
eq8.run(r8.lastInsertRowid, 'Điều hòa 2 chiều',        'fa-wind',       2, 'Panasonic inverter');
eq8.run(r8.lastInsertRowid, 'Webcam streaming',        'fa-video',      1, 'Logitech Brio 4K');
eq8.run(r8.lastInsertRowid, 'Bộ hub HDMI & USB-C',     'fa-plug',       3, 'Kết nối đa thiết bị');
console.log('Equipment for Room 8 inserted (9 items)');

// Verify
const newRooms = db.prepare('SELECT r.*, a.AreaName FROM Room r JOIN Area a ON r.AreaID=a.AreaID WHERE r.RoomID >= 7').all();
const newEq    = db.prepare('SELECT * FROM Equipment WHERE RoomID >= 7').all();
console.log('\n=== NEW ROOMS ===');
newRooms.forEach(r => console.log(`[${r.RoomID}] ${r.RoomName} | Khu: ${r.AreaName} | Seat: ${r.Seat} | VIP: ${r.IsVIP}`));
console.log('\n=== NEW EQUIPMENT ===');
newEq.forEach(e => console.log(`  RoomID ${e.RoomID} | ${e.Name} x${e.Quantity} | ${e.Note}`));
