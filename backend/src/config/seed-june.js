/**
 * seed-june.js — Thêm dữ liệu ảo lịch đặt phòng cho 1-17/06/2026
 * Chạy: node src/config/seed-june.js
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'MeetingRoomBooking',
  options:  {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true',
    enableArithAbort:       true,
  },
};

let pool;
async function run(q, p = {}) {
  const r = pool.request();
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) r.input(k, sql.NVarChar, null);
    else if (Number.isInteger(v))       r.input(k, sql.Int, v);
    else                                r.input(k, sql.NVarChar(sql.MAX), String(v));
  }
  return r.query(q);
}
async function ins(q, p = {}) {
  const res = await run(`${q}; SELECT SCOPE_IDENTITY() AS id`, p);
  return parseInt(res.recordset[0].id);
}
function fmt(y, mo, d, h, m = 0) {
  return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
}

async function main() {
  console.log('🔌 Connecting...');
  pool = await sql.connect(config);

  // Lấy IDs thực tế từ DB
  const rooms  = (await run(`SELECT RoomID, RoomName FROM Room WHERE Visible=1 ORDER BY RoomID`)).recordset;
  const users  = (await run(`SELECT UserID FROM [User] WHERE Visible=1 AND Roles=0 ORDER BY UserID`)).recordset;
  const facult = (await run(`SELECT FacultyID FROM Faculty WHERE Visible=1 ORDER BY FacultyID`)).recordset;

  console.log(`📦 Rooms: ${rooms.length}, Users: ${users.length}, Faculties: ${facult.length}`);

  const rIDs = rooms.map(r => r.RoomID);
  const uIDs = users.map(u => u.UserID);
  const fIDs = facult.map(f => f.FacultyID);

  // Tiêu đề họp đa dạng theo loại
  const titles = [
    'Họp nhóm nghiên cứu khoa học',
    'Báo cáo tiến độ dự án học kỳ',
    'Seminar chuyên đề khoa học máy tính',
    'Họp Ban Giám hiệu mở rộng',
    'Thảo luận luận văn thạc sĩ',
    'Họp Hội đồng khoa CNTT',
    'Workshop phát triển chương trình đào tạo',
    'Họp tổ bộ môn Lập trình',
    'Thuyết trình đề án tốt nghiệp',
    'Tập huấn sử dụng phần mềm mới',
    'Bảo vệ đề cương nghiên cứu',
    'Sinh hoạt câu lạc bộ lập trình',
    'Họp cố vấn học tập HK2',
    'Hội thảo đổi mới giáo dục đại học',
    'Phỏng vấn tuyển dụng giảng viên',
    'Đào tạo kỹ năng mềm',
    'Họp Ban chấp hành Công đoàn',
    'Kiểm tra đánh giá giữa kỳ',
    'Ôn tập học phần CSDL',
    'Họp triển khai kế hoạch học kỳ mới',
    'Tổng kết hoạt động ngoại khóa',
    'Gặp gỡ doanh nghiệp đối tác',
    'Họp nhóm đồ án môn học',
    'Giới thiệu chương trình học bổng',
    'Họp khoa Toán – Tin',
    'Thảo luận phương pháp giảng dạy',
    'Sinh hoạt khoa học trẻ',
    'Họp chuẩn bị khai giảng',
    'Review mã nguồn đồ án',
    'Buổi mentor cho sinh viên năm 4',
  ];

  // Các khung giờ không trùng nhau trong ngày (theo từng slot 2-3 tiếng)
  // Mỗi phòng có thể có nhiều booking/ngày miễn không conflict
  // Slots: 07-09, 08-10, 09-11, 10-12, 13-15, 14-16, 15-17, 16-18, 18-20, 19-21
  const timeSlots = [
    [7, 9], [9, 11], [11, 13],
    [13, 15], [15, 17], [17, 19], [19, 21],
  ];

  let count = 0;

  // Lịch phân bổ: mỗi ngày 1-17 tháng 6, tạo 4-6 bookings phân bổ đều
  const bookingPlan = [
    // [day, roomIdx, slotIdx, userIdx, facultyIdx, numPerson, status, note]
    // 1: status 1=Approved, 0=Pending, 2=Rejected, 3=Cancelled
    // Ngày 1
    [1,  0, 0, 0,  0,  8,  1, null],
    [1,  1, 1, 1,  1,  6,  1, null],
    [1,  2, 2, 2,  2, 20,  1, null],
    [1,  3, 3, 3,  3, 10,  0, null],
    [1,  4, 4, 4,  4, 40,  1, null],
    // Ngày 2
    [2,  0, 1, 5,  0,  5,  1, null],
    [2,  1, 3, 6,  1,  8,  0, null],
    [2,  5, 0, 7,  2, 18,  1, null],
    [2,  6, 4, 8,  5, 30,  1, null],
    [2,  7, 2, 9,  3, 25,  1, null],
    // Ngày 3
    [3,  0, 0, 10, 0, 12,  1, null],
    [3,  2, 1, 11, 2, 22,  1, null],
    [3,  3, 3, 12, 4, 12,  0, null],
    [3,  4, 5, 13, 4, 35,  1, null],
    [3,  6, 2, 14, 5, 28,  2, 'Phòng đang bảo trì'],
    // Ngày 4
    [4,  1, 0, 15, 1,  7,  1, null],
    [4,  0, 2, 16, 0, 15,  1, null],
    [4,  5, 4, 17, 2, 20,  1, null],
    [4,  7, 1, 18, 3, 30,  0, null],
    [4,  3, 5, 19, 4, 14,  1, null],
    // Ngày 5 (thứ 5 - nhiều cuộc họp)
    [5,  0, 0, 0,  0, 18,  1, null],
    [5,  0, 2, 1,  1, 12,  1, null],
    [5,  1, 1, 2,  2,  9,  0, null],
    [5,  2, 3, 3,  2, 25,  1, null],
    [5,  4, 4, 4,  4, 45,  1, null],
    [5,  6, 0, 5,  5, 32,  1, null],
    // Ngày 6
    [6,  3, 2, 6,  3, 10,  1, null],
    [6,  5, 0, 7,  2, 20,  1, null],
    [6,  1, 4, 8,  1,  6,  0, null],
    [6,  7, 3, 9,  3, 28,  1, null],
    // Ngày 7 (cuối tuần — ít hơn)
    [7,  0, 1, 10, 0, 10,  1, null],
    [7,  4, 3, 11, 4, 40,  1, null],
    [7,  6, 5, 12, 5, 35,  3, null],
    // Ngày 8 (Chủ nhật)
    [8,  2, 2, 13, 2, 22,  1, null],
    [8,  7, 4, 14, 3, 30,  0, null],
    // Ngày 9
    [9,  0, 0, 15, 0, 16,  1, null],
    [9,  1, 2, 16, 1,  8,  1, null],
    [9,  2, 4, 17, 2, 24,  1, null],
    [9,  3, 1, 18, 4, 13,  0, null],
    [9,  5, 3, 19, 2, 18,  1, null],
    [9,  6, 5, 0,  5, 38,  1, null],
    // Ngày 10
    [10, 0, 1, 1,  0, 18,  1, null],
    [10, 4, 0, 2,  4, 42,  1, null],
    [10, 7, 2, 3,  3, 28,  1, null],
    [10, 1, 4, 4,  1,  7,  2, 'Số người không đủ'],
    [10, 3, 3, 5,  4, 11,  1, null],
    // Ngày 11
    [11, 0, 0, 6,  0, 20,  1, null],
    [11, 0, 2, 7,  0, 15,  1, null],
    [11, 2, 1, 8,  2, 28,  1, null],
    [11, 5, 4, 9,  2, 48,  1, null],
    [11, 6, 3, 10, 5, 36,  0, null],
    [11, 7, 5, 11, 3, 32,  1, null],
    // Ngày 12
    [12, 1, 0, 12, 1,  8,  1, null],
    [12, 3, 2, 13, 4, 12,  1, null],
    [12, 4, 4, 14, 4, 44,  0, null],
    [12, 6, 1, 15, 5, 30,  1, null],
    // Ngày 13 (cuối tuần)
    [13, 0, 3, 16, 0, 14,  1, null],
    [13, 5, 5, 17, 2, 22,  1, null],
    [13, 7, 1, 18, 3, 26,  3, null],
    // Ngày 14 (Chủ nhật)
    [14, 2, 2, 19, 2, 20,  1, null],
    [14, 4, 4, 0,  4, 38,  0, null],
    // Ngày 15
    [15, 0, 0, 1,  0, 18,  1, null],
    [15, 0, 2, 2,  1, 12,  1, null],
    [15, 1, 1, 3,  1,  9,  1, null],
    [15, 3, 3, 4,  4, 14,  0, null],
    [15, 5, 4, 5,  2, 46,  1, null],
    [15, 6, 5, 6,  5, 35,  1, null],
    [15, 7, 0, 7,  3, 30,  1, null],
    // Ngày 16
    [16, 0, 1, 8,  0, 20,  1, null],
    [16, 2, 0, 9,  2, 26,  1, null],
    [16, 4, 3, 10, 4, 40,  1, null],
    [16, 6, 2, 11, 5, 32,  0, null],
    [16, 7, 4, 12, 3, 28,  1, null],
    [16, 1, 5, 13, 1,  7,  1, null],
    // Ngày 17
    [17, 0, 0, 14, 0, 18,  1, null],
    [17, 0, 2, 15, 0, 16,  1, null],
    [17, 1, 1, 16, 1,  8,  1, null],
    [17, 2, 3, 17, 2, 24,  0, null],
    [17, 3, 4, 18, 4, 13,  1, null],
    [17, 4, 5, 19, 4, 42,  1, null],
    [17, 5, 0, 0,  2, 20,  1, null],
    [17, 6, 2, 1,  5, 35,  1, null],
    [17, 7, 4, 2,  3, 28,  0, null],
  ];

  let titleIdx = 0;
  for (const [day, rIdx, sIdx, uIdx, fIdx, np, status, rejectReason] of bookingPlan) {
    const roomID    = rIDs[rIdx % rIDs.length];
    const userID    = uIDs[uIdx % uIDs.length];
    const facultyID = fIDs[fIdx % fIDs.length];
    const [startH, endH] = timeSlots[sIdx % timeSlots.length];
    const title = titles[titleIdx % titles.length];
    titleIdx++;

    const ts = fmt(2026, 6, day, startH);
    const te = fmt(2026, 6, day, endH);

    const bid = await ins(`INSERT INTO Booking (UserID) VALUES (@uid)`, { uid: userID });

    const approvedBy = status === 1 ? 'admin' : null;
    const approvedAt = status === 1 ? fmt(2026, 6, day, startH - 1 > 0 ? startH - 1 : 7) : null;
    const rr = status === 2 ? (rejectReason || 'Không đáp ứng yêu cầu') : null;

    await run(
      `INSERT INTO LineRoom
         (BookingID, UserID, FacultyID, RoomID, TimeStart, TimeEnd, Title, NumberPerson, Status, ApprovedBy, ApprovedAt, RejectReason)
       VALUES
         (@bid, @uid, @fid, @rid, @ts, @te, @title, @np, @st, @ab, @aa, @rr)`,
      { bid, uid: userID, fid: facultyID, rid: roomID, ts, te, title, np, st: status, ab: approvedBy, aa: approvedAt, rr }
    );
    count++;
  }

  await pool.close();
  console.log(`\n✅ Đã thêm ${count} lịch đặt phòng cho ngày 01-17/06/2026`);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
