/**
 * seed-bookings.js — Thêm lịch đặt mẫu cho toàn bộ tháng 5/2026
 * Chạy: node seed-bookings.js (từ thư mục backend/)
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'MeetingRoomBooking',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: { encrypt: false, trustServerCertificate: true },
};

const TODAY = '2026-05-26';

// Tất cả ngày trong tháng 5/2026 — bỏ cuối tuần (thứ 7, CN)
function weekdaysOfMay() {
  const days = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 4, d); // month 4 = May
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      days.push(`2026-05-${String(d).padStart(2, '0')}`);
    }
  }
  return days;
}

// Dữ liệu nguồn
const USERS = [
  { id: 'admin',       fid: 4  },
  { id: 'user01',      fid: 1  },
  { id: 'user02',      fid: 2  },
  { id: 'user03',      fid: 1  },
  { id: 'user04',      fid: 2  },
  { id: 'user05',      fid: 3  },
  { id: 'user06',      fid: 1  },
  { id: 'user07',      fid: 4  },
  { id: 'user08',      fid: 5  },
  { id: 'user09',      fid: 6  },
  { id: 'user10',      fid: 9  },
  { id: 'user11',      fid: 8  },
  { id: 'user12',      fid: 10 },
  { id: 'user13',      fid: 11 },
  { id: 'user14',      fid: 1  },
  { id: 'user15',      fid: 2  },
  { id: 'user16',      fid: 7  },
  { id: 'user17',      fid: 6  },
  { id: 'user18',      fid: 12 },
  { id: 'user19',      fid: 8  },
  { id: 'user20',      fid: 9  },
  { id: 'ngocphan',    fid: 1  },
  { id: 'ngocpro457',  fid: 1  },
  { id: 'ngoctran457', fid: 2  },
];

// Rooms: 1,2 = VIP (AreaID 1); 3,4,5 = thường; 6,7,8
// roomID 1=A101(VIP), 2=A201, 3=A301, 4=B101, 5=B201(seminar), 6=Lab C101, 7=B301(VIP), 8=ĐàoTạo C202
const SLOTS = [
  [7, 30, 9, 0],
  [8, 0,  9, 30],
  [8, 0,  10, 0],
  [8, 30, 10, 0],
  [9, 0,  10, 30],
  [9, 0,  11, 0],
  [9, 30, 11, 30],
  [10, 0, 11, 30],
  [10, 0, 12, 0],
  [13, 0, 14, 30],
  [13, 0, 15, 0],
  [13, 30, 15, 0],
  [13, 30, 15, 30],
  [14, 0, 15, 30],
  [14, 0, 16, 0],
  [14, 30, 16, 0],
  [15, 0, 16, 30],
  [15, 0, 17, 0],
  [15, 30, 17, 0],
  [16, 0, 17, 30],
];

const TITLES = [
  'Họp nhóm nghiên cứu',
  'Seminar chuyên đề',
  'Hội thảo khoa học',
  'Họp Ban Giám hiệu',
  'Bảo vệ KLTN',
  'Bảo vệ luận văn thạc sĩ',
  'Tập huấn nghiệp vụ',
  'Họp Hội đồng Khoa học',
  'Seminar Công nghệ mới',
  'Họp triển khai dự án',
  'Thảo luận đề tài NCKH',
  'Báo cáo tiến độ',
  'Họp tổng kết học kỳ',
  'Hội nghị sinh viên',
  'Họp Liên chi đoàn',
  'Gặp gỡ đối tác',
  'Phỏng vấn tuyển dụng',
  'Họp Công đoàn',
  'Tập huấn PCCC an toàn',
  'Họp triển khai chuyển đổi số',
  'Báo cáo cuối kỳ',
  'Seminar AI & Machine Learning',
  'Hội thảo Blockchain',
  'Họp Hội đồng tuyển sinh',
  'Thực hành Lab mạng',
  'Họp kế hoạch năm học',
  'Ôn tập kiểm tra giữa kỳ',
  'Họp Ban cán sự khoa',
  'Seminar Khoa học dữ liệu',
  'Họp triển khai LMS',
  'Trao đổi học thuật',
  'Họp nhóm phát triển phần mềm',
  'Họp Phòng Đào tạo',
  'Hội thảo Giáo dục STEM',
  'Seminar Mạng nơ-ron',
  'Họp tổng kết năm học',
  'Thảo luận chương trình đào tạo mới',
  'Họp Ban cố vấn học tập',
  'Tọa đàm kinh nghiệm học tập',
  'Họp Phòng Khảo thí',
];

const SERVICE_REQS = [
  '', '', '', '', '', '', '', // most have no service req
  'Nước suối, cà phê',
  'Máy chiếu, bảng trắng',
  'Micro, loa',
  'Nước suối, snack',
  'Máy chiếu HD, âm thanh',
  'Bảng flipchart, marker',
  'Trà, cà phê, bánh ngọt',
];

const REJECT_REASONS = [
  'Phòng đã được ưu tiên cho sự kiện cấp trường',
  'Vượt quá số lượng người cho phép của phòng',
  'Thời gian đặt trùng với lịch bảo trì phòng',
  'Chưa đủ điều kiện theo quy định VIP',
];

function pick(arr, seed) { return arr[seed % arr.length]; }
function rand(min, max, seed) { return min + (seed % (max - min + 1)); }

async function run() {
  const pool = await sql.connect(config);
  const r = () => pool.request();

  // Xoá toàn bộ DEMO cũ
  await r().query(`DELETE FROM BookingAttendee WHERE LineRoomID IN (SELECT LineRoomID FROM LineRoom WHERE Title LIKE '%[DEMO]%')`);
  await r().query(`DELETE FROM LineRoom WHERE Title LIKE '%[DEMO]%'`);
  console.log('🗑️  Đã xoá lịch DEMO cũ\n');

  const weekdays = weekdaysOfMay();
  let totalCount = 0;
  let seed = 7; // deterministic "random"

  for (const date of weekdays) {
    const isPast   = date < TODAY;
    const isToday  = date === TODAY;
    const isFuture = date > TODAY;

    // Số lịch mỗi ngày: 3-7
    seed += 3;
    const numBookings = rand(3, 7, seed + date.charCodeAt(8));

    // Tập hợp slot đã dùng cho ngày này (roomID + hStart) để tránh conflict
    const usedSlots = new Set();

    for (let i = 0; i < numBookings; i++) {
      seed += 13;
      const user  = pick(USERS, seed + i * 7);
      const slot  = pick(SLOTS, seed + i * 11);
      const [hS, mS, hE, mE] = slot;
      const roomID = rand(1, 8, seed + i * 5);

      // Tránh trùng slot trong cùng phòng
      const slotKey = `${roomID}-${hS}-${mS}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      const title   = pick(TITLES, seed + i * 3);
      const nPerson = rand(4, 30, seed + i * 17);
      const svcReq  = pick(SERVICE_REQS, seed + i * 19);
      const isVIP   = (roomID === 1 || roomID === 7);

      // Xác định status
      let status, approvedBy, rejectReason;
      if (isPast) {
        const r4 = (seed + i * 23) % 10;
        if (r4 <= 6) { status = 1; approvedBy = 'admin'; rejectReason = ''; }       // 70% approved
        else if (r4 === 7) { status = 2; approvedBy = 'admin'; rejectReason = pick(REJECT_REASONS, seed); } // 10% rejected
        else if (r4 === 8) { status = 3; approvedBy = ''; rejectReason = ''; }       // 10% cancelled
        else { status = isVIP ? 0 : 1; approvedBy = isVIP ? '' : 'admin'; rejectReason = ''; } // 10%
      } else if (isToday) {
        if (isVIP && hS >= 14) { status = 0; approvedBy = ''; rejectReason = ''; }  // chiều nay VIP → pending
        else { status = 1; approvedBy = 'admin'; rejectReason = ''; }
      } else {
        // tương lai: VIP → pending, thường → approved
        status = isVIP ? 0 : 1;
        approvedBy = isVIP ? '' : 'admin';
        rejectReason = '';
      }

      const ts = `${date} ${String(hS).padStart(2,'0')}:${String(mS).padStart(2,'0')}:00`;
      const te = `${date} ${String(hE).padStart(2,'0')}:${String(mE).padStart(2,'0')}:00`;

      const bRes = await r()
        .input('uid', sql.NVarChar, user.id)
        .query(`INSERT INTO Booking (UserID) OUTPUT INSERTED.BookingID VALUES (@uid)`);
      const bookingID = bRes.recordset[0].BookingID;

      const req2 = r()
        .input('bid',    sql.Int,     bookingID)
        .input('uid',    sql.NVarChar, user.id)
        .input('fid',    sql.Int,     user.fid)
        .input('rid',    sql.Int,     roomID)
        .input('ts',     sql.NVarChar, ts)
        .input('te',     sql.NVarChar, te)
        .input('title',  sql.NVarChar, '[DEMO] ' + title)
        .input('np',     sql.Int,     nPerson)
        .input('status', sql.Int,     status)
        .input('svc',    sql.NVarChar, svcReq)
        .input('ab',     sql.NVarChar, approvedBy || null)
        .input('aat',    sql.NVarChar, approvedBy ? ts : null)
        .input('rr',     sql.NVarChar, rejectReason || null);

      const lrRes = await req2.query(`
        INSERT INTO LineRoom (BookingID, UserID, FacultyID, RoomID, TimeStart, TimeEnd,
          Title, NumberPerson, Status, ServiceRequest, ApprovedBy, ApprovedAt, RejectReason)
        OUTPUT INSERTED.LineRoomID
        VALUES (@bid,@uid,@fid,@rid,@ts,@te,@title,@np,@status,@svc,@ab,@aat,@rr)
      `);

      const lrid = lrRes.recordset[0].LineRoomID;
      totalCount++;

      // Thêm 1-3 attendees cho lịch đã duyệt
      if (status === 1) {
        const attCount = rand(1, 3, seed + i);
        for (let a = 0; a < attCount; a++) {
          const att = pick(USERS, seed + i * 31 + a * 7);
          if (att.id !== user.id) {
            await r()
              .input('lrid', sql.Int,     lrid)
              .input('uid',  sql.NVarChar, att.id)
              .query(`IF NOT EXISTS (SELECT 1 FROM BookingAttendee WHERE LineRoomID=@lrid AND UserID=@uid)
                      INSERT INTO BookingAttendee (LineRoomID, UserID, Status) VALUES (@lrid, @uid, 1)`);
          }
        }
      }
    }

    const label = isPast ? '✅' : isToday ? '📌' : '📅';
    process.stdout.write(`  ${label} ${date}: ${numBookings} lịch\n`);
  }

  await pool.close();
  console.log(`\n🎉 Hoàn tất! Tổng cộng ${totalCount} lịch đặt cho tháng 5/2026.`);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
