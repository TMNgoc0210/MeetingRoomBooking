require('dotenv').config();
const app = require('./src/app');
const { startReminderCron } = require('./src/utils/reminder-cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Meeting Booking API Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startReminderCron();
});
