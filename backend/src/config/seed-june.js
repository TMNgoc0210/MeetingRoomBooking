/**
 * seed-june.js — Dữ liệu ảo lịch đặt phòng tháng 6/2026 (đủ cả tháng)
 * Chạy: node src/config/seed-june.js
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function q(sql, vals = []) { return pool.query(sql, vals); }
async function ins(sql, vals = []) {
  const res = await pool.query(sql + ' RETURNING *', vals);
  const row = res.rows[0] || {};
  for (const [k, v] of Object.entries(row)) {
    if (/id$/i.test(k) && Number.isInteger(v)) return v;
  }
  return null;
}
const fmt = (d, h, m = 0) =>
  `2026-06-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;

const titles = [
  'Họp nhóm nghiên cứu khoa học',     'Báo cáo tiến độ dự án học kỳ',
  'Seminar chuyên đề Khoa học máy tính', 'Họp Ban Giám hiệu mở rộng',
  'Thảo luận luận văn thạc sĩ',       'Họp Hội đồng khoa CNTT',
  'Workshop phát triển chương trình',  'Họp tổ bộ môn Lập trình',
  'Thuyết trình đề án tốt nghiệp',    'Tập huấn sử dụng phần mềm mới',
  'Bảo vệ đề cương nghiên cứu',       'Sinh hoạt CLB Lập trình',
  'Họp cố vấn học tập HK2',           'Hội thảo đổi mới giáo dục',
  'Phỏng vấn tuyển dụng giảng viên',  'Đào tạo kỹ năng mềm sinh viên',
  'Họp Ban chấp hành Công đoàn',      'Kiểm tra đánh giá giữa kỳ',
  'Ôn tập học phần Cơ sở dữ liệu',   'Họp triển khai kế hoạch HK mới',
  'Tổng kết hoạt động ngoại khoá',    'Gặp gỡ doanh nghiệp đối tác',
  'Họp nhóm đồ án môn học',           'Giới thiệu học bổng du học',
  'Họp khoa Toán – Tin',              'Thảo luận phương pháp giảng dạy',
  'Sinh hoạt khoa học trẻ',           'Họp chuẩn bị khai giảng HK2',
  'Review mã nguồn đồ án tốt nghiệp', 'Buổi mentor cho SV năm 4',
  'Họp uỷ ban kiểm định chất lượng',  'Triển khai hệ thống LMS mới',
  'Bảo vệ luận văn thạc sĩ đợt 2',   'Họp nhóm AI & Data Science',
  'Cuộc thi lập trình SV 2026',       'Hội nghị khoa học cấp trường',
];

// Slots: [startH, endH]
const slots = [
  [7,9],[9,11],[11,13],[13,15],[15,17],[17,19],[19,21],
];

async function main() {
  console.log('🔌 Connecting to PostgreSQL (Neon)...');

  const rooms   = (await q(`SELECT "RoomID" FROM Room WHERE "Visible"=1 ORDER BY "RoomID"`)).rows;
  const users   = (await q(`SELECT "UserID" FROM "User" WHERE "Visible"=1 AND "Roles"=0 ORDER BY "UserID"`)).rows;
  const facults = (await q(`SELECT "FacultyID" FROM Faculty WHERE "Visible"=1 ORDER BY "FacultyID"`)).rows;

  const rIDs = rooms.map(r => r.RoomID);
  const uIDs = users.map(u => u.UserID);
  const fIDs = facults.map(f => f.FacultyID);

  console.log(`📦 Rooms: ${rIDs.length}, Users: ${uIDs.length}, Faculties: ${fIDs.length}`);

  if (!rIDs.length || !uIDs.length) {
    console.error('❌ Không có dữ liệu rooms/users. Chạy init-db.js trước.');
    return;
  }

  // Xoá lịch tháng 6 cũ (nếu có) để tránh duplicate
  await q(`DELETE FROM BookingAttendee WHERE "LineRoomID" IN (
    SELECT "LineRoomID" FROM LineRoom WHERE "TimeStart" LIKE '2026-06-%'
  )`);
  await q(`DELETE FROM LineRoom WHERE "TimeStart" LIKE '2026-06-%'`);
  await q(`DELETE FROM Booking WHERE "CreateDate" LIKE '2026-06-%'`);
  console.log('🗑️  Đã xoá lịch tháng 6 cũ (nếu có)');

  let count = 0;
  let titleIdx = 0;

  const R = i => rIDs[i % rIDs.length];
  const U = i => uIDs[i % uIDs.length];
  const F = i => fIDs[i % fIDs.length];
  const S = i => slots[i % slots.length];
  const T = () => { const t = titles[titleIdx % titles.length]; titleIdx++; return t; };

  // [day, roomIdx, slotIdx, userIdx, facultyIdx, numPerson, status (0=pending,1=approved,2=rejected,3=cancelled), rejectReason]
  const plan = [
    // --- Ngày 1 (Thứ 2) ---
    [1,0,0,0,0,8,1,null],[1,1,1,1,1,6,1,null],[1,2,2,2,2,20,1,null],[1,3,3,3,3,10,0,null],[1,4,4,4,4,40,1,null],
    // --- Ngày 2 ---
    [2,0,1,5,0,5,1,null],[2,1,3,6,1,8,0,null],[2,5,0,7,2,18,1,null],[2,6,4,8,5,30,1,null],[2,7,2,9,3,25,1,null],
    // --- Ngày 3 ---
    [3,0,0,10,0,12,1,null],[3,2,1,11,2,22,1,null],[3,3,3,12,4,12,0,null],[3,4,5,13,4,35,1,null],[3,6,2,14,5,28,2,'Phòng đang bảo trì'],
    // --- Ngày 4 ---
    [4,1,0,15,1,7,1,null],[4,0,2,16,0,15,1,null],[4,5,4,17,2,20,1,null],[4,7,1,18,3,30,0,null],[4,3,5,19,4,14,1,null],
    // --- Ngày 5 (Thứ 6 — nhiều họp) ---
    [5,0,0,0,0,18,1,null],[5,0,2,1,1,12,1,null],[5,1,1,2,2,9,0,null],[5,2,3,3,2,25,1,null],
    [5,4,4,4,4,45,1,null],[5,6,0,5,5,32,1,null],[5,7,5,6,3,28,1,null],
    // --- Ngày 6 (Thứ 7) ---
    [6,3,2,6,3,10,1,null],[6,5,0,7,2,20,1,null],[6,1,4,8,1,6,0,null],[6,7,3,9,3,28,1,null],
    // --- Ngày 7 (Chủ nhật) ---
    [7,0,1,10,0,10,1,null],[7,4,3,11,4,40,1,null],[7,6,5,12,5,35,3,null],
    // --- Ngày 8 (Thứ 2) ---
    [8,2,2,13,2,22,1,null],[8,7,4,14,3,30,0,null],[8,0,0,15,0,16,1,null],[8,1,3,16,1,8,1,null],
    // --- Ngày 9 ---
    [9,0,0,15,0,16,1,null],[9,1,2,16,1,8,1,null],[9,2,4,17,2,24,1,null],
    [9,3,1,18,4,13,0,null],[9,5,3,19,2,18,1,null],[9,6,5,0,5,38,1,null],
    // --- Ngày 10 ---
    [10,0,1,1,0,18,1,null],[10,4,0,2,4,42,1,null],[10,7,2,3,3,28,1,null],
    [10,1,4,4,1,7,2,'Số người không đủ điều kiện'],[10,3,3,5,4,11,1,null],
    // --- Ngày 11 ---
    [11,0,0,6,0,20,1,null],[11,0,2,7,0,15,1,null],[11,2,1,8,2,28,1,null],
    [11,5,4,9,2,48,1,null],[11,6,3,10,5,36,0,null],[11,7,5,11,3,32,1,null],
    // --- Ngày 12 (Thứ 6) ---
    [12,1,0,12,1,8,1,null],[12,3,2,13,4,12,1,null],[12,4,4,14,4,44,0,null],[12,6,1,15,5,30,1,null],
    [12,0,3,16,0,20,1,null],[12,7,5,17,3,26,1,null],
    // --- Ngày 13 (Thứ 7) ---
    [13,0,3,16,0,14,1,null],[13,5,5,17,2,22,1,null],[13,7,1,18,3,26,3,null],
    // --- Ngày 14 (Chủ nhật) ---
    [14,2,2,19,2,20,1,null],[14,4,4,0,4,38,0,null],
    // --- Ngày 15 (Thứ 2) ---
    [15,0,0,1,0,18,1,null],[15,0,2,2,1,12,1,null],[15,1,1,3,1,9,1,null],
    [15,3,3,4,4,14,0,null],[15,5,4,5,2,46,1,null],[15,6,5,6,5,35,1,null],[15,7,0,7,3,30,1,null],
    // --- Ngày 16 ---
    [16,0,1,8,0,20,1,null],[16,2,0,9,2,26,1,null],[16,4,3,10,4,40,1,null],
    [16,6,2,11,5,32,0,null],[16,7,4,12,3,28,1,null],[16,1,5,13,1,7,1,null],
    // --- Ngày 17 ---
    [17,0,0,14,0,18,1,null],[17,0,2,15,0,16,1,null],[17,1,1,16,1,8,1,null],
    [17,2,3,17,2,24,0,null],[17,3,4,18,4,13,1,null],[17,4,5,19,4,42,1,null],
    [17,5,0,0,2,20,1,null],[17,6,2,1,5,35,1,null],[17,7,4,2,3,28,0,null],
    // --- Ngày 18 ---
    [18,0,0,3,0,14,1,null],[18,1,2,4,1,9,1,null],[18,3,1,5,3,18,1,null],
    [18,5,3,6,2,40,1,null],[18,7,4,7,3,32,0,null],
    // --- Ngày 19 (Thứ 6) ---
    [19,0,0,8,0,22,1,null],[19,1,1,9,1,10,1,null],[19,2,2,10,2,30,1,null],
    [19,3,3,11,3,15,1,null],[19,4,4,12,4,50,1,null],[19,5,5,13,5,45,0,null],[19,6,0,14,0,38,1,null],
    // --- Ngày 20 (Thứ 7) ---
    [20,2,1,15,2,18,1,null],[20,5,3,16,2,25,1,null],[20,7,5,17,3,30,3,null],
    // --- Ngày 21 (Chủ nhật) ---
    [21,1,2,18,1,8,1,null],[21,4,4,19,4,40,0,null],
    // --- Ngày 22 (Thứ 2) ---
    [22,0,0,0,0,16,1,null],[22,1,1,1,1,12,1,null],[22,2,2,2,2,28,1,null],
    [22,3,3,3,3,14,1,null],[22,5,4,4,2,48,1,null],[22,6,5,5,5,35,0,null],
    // --- Ngày 23 ---
    [23,0,1,6,0,18,1,null],[23,3,0,7,3,10,1,null],[23,4,3,8,4,44,1,null],
    [23,7,2,9,3,30,1,null],[23,1,5,10,1,7,2,'Không đủ thiết bị hỗ trợ'],
    // --- Ngày 24 ---
    [24,0,0,11,0,20,1,null],[24,2,2,12,2,24,1,null],[24,5,4,13,2,46,1,null],
    [24,6,1,14,5,32,0,null],[24,7,3,15,3,28,1,null],
    // --- Ngày 25 ---
    [25,0,0,16,0,18,1,null],[25,1,2,17,1,10,1,null],[25,3,1,18,3,15,1,null],
    [25,4,4,19,4,42,1,null],[25,6,3,0,5,36,0,null],
    // --- Ngày 26 (Thứ 6 — cuối tuần gần kề, nhiều họp) ---
    [26,0,0,1,0,22,1,null],[26,1,1,2,1,12,1,null],[26,2,2,3,2,30,1,null],
    [26,3,3,4,3,18,1,null],[26,4,4,5,4,50,1,null],[26,5,5,6,2,44,1,null],
    [26,6,0,7,5,38,0,null],[26,7,2,8,3,28,1,null],
    // --- Ngày 27 (Thứ 7) ---
    [27,0,2,9,0,15,1,null],[27,4,4,10,4,40,1,null],[27,6,1,11,5,32,3,null],
    // --- Ngày 28 (Chủ nhật) ---
    [28,2,3,12,2,20,1,null],[28,5,5,13,2,48,0,null],
    // --- Ngày 29 (Thứ 2) ---
    [29,0,0,14,0,18,1,null],[29,1,1,15,1,9,1,null],[29,2,2,16,2,26,1,null],
    [29,3,3,17,4,14,1,null],[29,5,4,18,2,44,0,null],[29,7,5,19,3,30,1,null],
    // --- Ngày 30 (Thứ 3) ---
    [30,0,0,0,0,20,1,null],[30,1,2,1,1,12,1,null],[30,2,1,2,2,28,1,null],
    [30,3,3,3,3,16,1,null],[30,4,4,4,4,46,1,null],[30,5,0,5,2,42,0,null],
    [30,6,5,6,5,36,1,null],[30,7,3,7,3,30,1,null],
  ];

  for (const [day, rIdx, sIdx, uIdx, fIdx, np, status, rejectReason] of plan) {
    const roomID    = R(rIdx);
    const userID    = U(uIdx);
    const facultyID = F(fIdx);
    const [startH, endH] = S(sIdx);
    const title     = T();
    const ts = fmt(day, startH);
    const te = fmt(day, endH);

    const bid = await ins(`INSERT INTO Booking ("UserID","CreateDate") VALUES ($1,$2)`,
      [userID, `2026-06-${String(day).padStart(2,'0')} 07:00:00`]
    );

    const approvedBy = status === 1 ? 'admin' : null;
    const approvedAt = status === 1 ? fmt(day, Math.max(startH - 1, 7)) : null;
    const rr         = status === 2 ? (rejectReason || 'Không đáp ứng yêu cầu') : null;

    await q(
      `INSERT INTO LineRoom
         ("BookingID","UserID","FacultyID","RoomID","TimeStart","TimeEnd",
          "Title","NumberPerson","Status","ApprovedBy","ApprovedAt","RejectReason","CreateDate")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [bid, userID, facultyID, roomID, ts, te, title, np, status, approvedBy, approvedAt, rr,
       `2026-06-${String(day).padStart(2,'0')} 07:00:00`]
    );
    count++;
  }

  await pool.end();
  console.log(`\n✅ Đã thêm ${count} lịch đặt phòng cho tháng 6/2026`);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
