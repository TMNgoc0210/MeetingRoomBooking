/**
 * server.js — ENTRY POINT của backend
 * ─────────────────────────────────────
 * Chạy: node server.js  hoặc  npm run dev (nodemon)
 *
 * Vai trò:
 *   1. Load biến môi trường từ .env
 *   2. Khởi động Express app (từ src/app.js)
 *   3. Lắng nghe cổng PORT (mặc định 5001)
 *   4. Khởi động cron job gửi email nhắc lịch họp
 */
require('dotenv').config();
const app = require('./src/app');
const { startReminderCron } = require('./src/utils/reminder-cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Meeting Booking API Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startReminderCron();
});
