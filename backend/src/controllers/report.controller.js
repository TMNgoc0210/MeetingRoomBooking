const { query } = require('../config/db');
const { success, error, badRequest } = require('../utils/response');

/**
 * GET /api/reports/chart?month=5&year=2026&roomID=0
 * Thống kê số lượt đặt phòng theo tuần trong tháng
 */
const getDataChart = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const roomID = parseInt(req.query.roomID) || 0;

    if (!month || !year || month < 1 || month > 12) {
      return badRequest(res, 'Tháng hoặc năm không hợp lệ');
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const weeks = [];

    let weekStart = new Date(firstDay);
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
      weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
      weekStart.setDate(weekStart.getDate() + 7);
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    let sql = `SELECT "TimeStart" FROM LineRoom WHERE "TimeStart" LIKE @prefix AND "Status" IN (0, 1)`;
    const params = { prefix: `${prefix}%` };

    if (roomID > 0) {
      sql += ` AND "RoomID" = @roomID`;
      params.roomID = roomID;
    }

    const bookings = await query(sql, params);

    const fmt = (d) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const chartData = weeks.map(({ start, end }) => {
      const count = bookings.filter((b) => {
        const t = new Date(b.TimeStart);
        return t >= start && t <= end;
      }).length;
      return { name: `${fmt(start)} - ${fmt(end)}`, y: count };
    });

    return success(res, chartData);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/reports/summary — tổng hợp nhanh
 */
const getSummary = async (req, res) => {
  try {
    const [totalRooms] = await query(`SELECT COUNT(*) AS total FROM Room WHERE "Visible" = 1`);
    const [totalUsers] = await query(`SELECT COUNT(*) AS total FROM "User" WHERE "Visible" = 1`);
    const [totalBookings] = await query(`SELECT COUNT(*) AS total FROM LineRoom`);
    const [todayBookings] = await query(
      `SELECT COUNT(*) AS total FROM LineRoom
       WHERE LEFT("TimeStart",10) = TO_CHAR(NOW(), 'YYYY-MM-DD')`
    );

    return success(res, {
      totalRooms: totalRooms.total,
      totalUsers: totalUsers.total,
      totalBookings: totalBookings.total,
      todayBookings: todayBookings.total,
    });
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/**
 * GET /api/reports/room-usage?month=5&year=2026
 * Thống kê tỷ lệ sử dụng từng phòng
 */
const getRoomUsage = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    if (!month || !year) return badRequest(res, 'Thiếu tháng hoặc năm');

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}%`;

    const rows = await query(
      `SELECT r."RoomName", COUNT(lr."LineRoomID") AS bookingCount,
              COALESCE(SUM(
                EXTRACT(EPOCH FROM (lr."TimeEnd"::TIMESTAMP - lr."TimeStart"::TIMESTAMP)) / 3600.0
              ), 0) AS totalHours
       FROM Room r
       LEFT JOIN LineRoom lr ON r."RoomID" = lr."RoomID"
         AND lr."TimeStart" LIKE @prefix
         AND lr."Status" = 1
       WHERE r."Visible" = 1
       GROUP BY r."RoomID", r."RoomName"
       ORDER BY bookingCount DESC`,
      { prefix }
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

module.exports = { getDataChart, getSummary, getRoomUsage };
