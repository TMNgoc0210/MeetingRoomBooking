/**
 * seed_demo_may2026.js
 * Tạo dữ liệu demo lịch đặt phòng tháng 5/2026
 * Chạy: node backend/scripts/seed_demo_may2026.js
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

const MONTH = 5;
const YEAR  = 2026;

const TITLES = [
  'Họp Ban Giám hiệu',         'Họp Hội đồng Khoa',          'Báo cáo tiến độ đề tài',
  'Hội thảo Khoa học',         'Bảo vệ Luận văn',            'Họp Tổ chuyên môn',
  'Seminar Sinh viên NCKH',    'Họp Ban Cố vấn học tập',     'Tập huấn Phần mềm mới',
  'Buổi học bù',               'Họp Dự án khởi nghiệp',      'Review Sprint #7',
  'Họp Phòng Đào tạo',         'Hội nghị Hợp tác doanh nghiệp','Workshop AI & Data Science',
  'Họp Nhóm nghiên cứu',       'Kiểm tra giữa kỳ (vấn đáp)', 'Demo sản phẩm tốt nghiệp',
  'Brainstorm UI/UX',           'Họp Định kỳ Tháng 5',        'Triển khai Chương trình mới',
  'Phỏng vấn ứng viên',        'Đánh giá kết quả thực tập',  'Kế hoạch học kỳ hè',
  'Họp Ủy ban Kiểm tra',       'Khởi động Dự án Q2',         'Họp đội ngũ IT',
  'Báo cáo tài chính tháng 5', 'Tổng kết học kỳ',            'Tiếp đoàn khách quốc tế',
];

const SERVICE_REQUESTS = [
  null, null, null, // 3/5 không có yêu cầu dịch vụ
  'Chuẩn bị nước uống cho 10 người',
  'Cần máy chiếu và màn hình phụ',
  'Chuẩn bị 2 bảng trắng và bút dạ',
  'Đặt trước 30 phút để cài đặt thiết bị',
  'Cần bố trí bàn chữ U cho 15 người',
];

// Tạo số ngẫu nhiên trong đoạn [min, max]
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Tạo TimeStart/TimeEnd không trùng với các slot đã dùng
// bookedSlots: Map<roomID, [{start, end}]>
function generateSlot(roomID, day, bookedSlots) {
  const slots = bookedSlots.get(roomID) || [];
  // Thử tối đa 20 lần
  for (let attempt = 0; attempt < 20; attempt++) {
    const startH  = rand(7, 17); // 07:00–17:00
    const durH    = rand(1, 3);  // 1–3 tiếng
    const endH    = startH + durH;
    if (endH > 21) continue;

    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${YEAR}-${pad(MONTH)}-${pad(day)}`;
    const ts = `${dateStr} ${pad(startH)}:00:00`;
    const te = `${dateStr} ${pad(endH)}:00:00`;

    // Kiểm tra conflict
    const conflict = slots.some(s => ts < s.end && te > s.start);
    if (!conflict) {
      if (!bookedSlots.has(roomID)) bookedSlots.set(roomID, []);
      bookedSlots.get(roomID).push({ start: ts, end: te });
      return { ts, te };
    }
  }
  return null; // không tạo được slot
}

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server\n');

    // Lấy rooms
    const roomsRes = await pool.request().query(`SELECT RoomID, RoomName, IsVIP FROM Room WHERE Visible=1`);
    const rooms = roomsRes.recordset;
    console.log(`📋 Found ${rooms.length} rooms`);

    // Lấy users (không phải admin)
    const usersRes = await pool.request().query(`SELECT TOP 20 UserID FROM [User] WHERE Visible=1 AND Roles=0`);
    const users = usersRes.recordset.map(u => u.UserID);
    console.log(`👥 Found ${users.length} users\n`);

    if (!rooms.length || !users.length) {
      console.error('❌ Không có phòng hoặc user, kiểm tra DB');
      return;
    }

    // Lấy FacultyID mặc định
    const facRes = await pool.request().query(`SELECT TOP 1 FacultyID FROM Faculty`);
    const defaultFacultyID = facRes.recordset[0]?.FacultyID || 1;

    // Kiểm tra đã có dữ liệu tháng 5/2026 chưa
    const existsRes = await pool.request().query(
      `SELECT COUNT(*) AS c FROM LineRoom WHERE TimeStart LIKE '${YEAR}-${String(MONTH).padStart(2,'0')}%'`
    );
    const existingCount = existsRes.recordset[0].c;
    if (existingCount > 0) {
      console.log(`⚠️  Đã có ${existingCount} lịch tháng 5/2026 trong DB.`);
      console.log('   Nhập "yes" để tiếp tục thêm, hoặc Ctrl+C để thoát:');
      // Auto-continue nếu chạy không interactive
    }

    // Phân bổ bookings theo phòng (mô phỏng tỷ lệ sử dụng khác nhau)
    // ~60% phòng đầu tiên, giảm dần
    const bookingCounts = rooms.map((r, i) => {
      if (i === 0) return rand(18, 22);       // Phòng đầu tiên: sử dụng cao ~80%
      if (i === 1) return rand(14, 18);       // Phòng 2: sử dụng khá
      if (i === 2) return rand(10, 14);       // Phòng 3: trung bình
      if (i === 3) return rand(8, 12);        // Phòng 4: trung bình
      if (i < 6)   return rand(5, 9);         // Phòng 5-6: thấp-trung
      return rand(2, 6);                      // Phòng còn lại: thấp
    });

    const bookedSlots = new Map(); // roomID → [{start, end}]
    let totalInserted = 0;
    let errors = 0;

    for (let ri = 0; ri < rooms.length; ri++) {
      const room  = rooms[ri];
      const count = bookingCounts[ri];
      console.log(`🏢 ${room.RoomName} — target ${count} bookings`);

      let roomInserted = 0;

      for (let b = 0; b < count; b++) {
        // Chọn ngày ngẫu nhiên 1-28 (tháng 5/2026, tránh cuối tuần với xác suất cao)
        let day;
        let attempts = 0;
        do {
          day = rand(1, 28);
          const dow = new Date(YEAR, MONTH - 1, day).getDay(); // 0=Sun, 6=Sat
          if (dow !== 0 && dow !== 6) break; // ưu tiên ngày trong tuần
          attempts++;
        } while (attempts < 10);

        const slot = generateSlot(room.RoomID, day, bookedSlots);
        if (!slot) { errors++; continue; }

        const userID = users[rand(0, users.length - 1)];
        const title  = TITLES[rand(0, TITLES.length - 1)];
        const nPer   = rand(3, Math.min(25, 40));
        const svcReq = SERVICE_REQUESTS[rand(0, SERVICE_REQUESTS.length - 1)];
        // Phòng VIP → pending/approved mix; phòng thường → approved
        const status = room.IsVIP ? (rand(0, 4) === 0 ? 0 : 1) : 1;
        const createDate = `${YEAR}-${String(MONTH).padStart(2,'0')}-${String(day).padStart(2,'0')} 08:00:00`;

        try {
          const req = pool.request();
          req.input('userID',       sql.NVarChar, userID);
          req.input('facultyID',    sql.Int,      defaultFacultyID);
          req.input('roomID',       sql.Int,      room.RoomID);
          req.input('ts',           sql.NVarChar, slot.ts);
          req.input('te',           sql.NVarChar, slot.te);
          req.input('title',        sql.NVarChar, title);
          req.input('nPer',         sql.Int,      nPer);
          req.input('status',       sql.Int,      status);
          req.input('svcReq',       sql.NVarChar, svcReq);
          req.input('createDate',   sql.NVarChar, createDate);

          await req.query(`
            INSERT INTO LineRoom
              (UserID, FacultyID, RoomID, TimeStart, TimeEnd, Title, NumberPerson,
               Status, ServiceRequest, Content, Note, CreateDate)
            VALUES
              (@userID, @facultyID, @roomID, @ts, @te, @title, @nPer,
               @status, @svcReq, N'', N'', @createDate)
          `);
          roomInserted++;
          totalInserted++;
        } catch (e) {
          errors++;
        }
      }
      console.log(`   ✓ Inserted ${roomInserted} bookings`);
    }

    console.log(`\n🎉 Done! Inserted ${totalInserted} bookings (${errors} skipped/failed)`);

    // Xem thống kê nhanh
    const stats = await pool.request().query(`
      SELECT r.RoomName,
             COUNT(lr.LineRoomID) AS cnt,
             ISNULL(SUM(DATEDIFF(MINUTE, CAST(lr.TimeStart AS DATETIME2), CAST(lr.TimeEnd AS DATETIME2))/60.0),0) AS hours
      FROM Room r
      LEFT JOIN LineRoom lr ON r.RoomID = lr.RoomID
        AND lr.TimeStart LIKE '${YEAR}-${String(MONTH).padStart(2,'0')}%'
        AND lr.Status = 1
      WHERE r.Visible = 1
      GROUP BY r.RoomID, r.RoomName
      ORDER BY cnt DESC
    `);

    console.log('\n📊 Thống kê tháng 5/2026 (chỉ approved):');
    console.log('─'.repeat(55));
    for (const row of stats.recordset) {
      const bar = '█'.repeat(Math.min(25, Math.round(row.cnt)));
      console.log(`  ${row.RoomName.padEnd(28)} ${String(row.cnt).padStart(3)} lịch │${bar}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

main();
