const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Khởi tạo DB connection ngay khi app start (SQLite — tự động connect)
require('./config/db');

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:3000').trim().replace(/\/$/, ''),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 200, // Thoải mái hơn trong development
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
  skip: () => isDev, // Bỏ qua hoàn toàn trong dev
});
app.use('/api/', limiter);

// Giới hạn chặt hơn cho login (chỉ áp dụng production)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { success: false, message: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút' },
});
app.use('/api/auth/login', loginLimiter);

// ─── Body Parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logger ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static Files ─────────────────────────────────────────────
// Serve uploaded files (images + docs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/users',     require('./routes/user.routes'));
app.use('/api/rooms',     require('./routes/room.routes'));
app.use('/api/bookings',  require('./routes/booking.routes'));
app.use('/api/linerooms', require('./routes/lineroom.routes'));
app.use('/api/areas',     require('./routes/area.routes'));
app.use('/api/faculties', require('./routes/faculty.routes'));
app.use('/api/reports',   require('./routes/report.routes'));
app.use('/api/upload',    require('./routes/upload.routes'));
app.use('/api/equipment', require('./routes/equipment.routes'));
app.use('/api/chat',      require('./routes/chat.routes'));
app.use('/api/settings',  require('./routes/setting.routes'));
app.use('/api/roles',     require('./routes/role.routes'));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Meeting Booking API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── Serve React build (production only) ──────────────────────
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));
  // SPA fallback — mọi route không phải /api đều trả index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Không tìm thấy endpoint: ${req.method} ${req.url}` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File quá lớn, tối đa 5MB' });
  }
  if (err.message && err.message.includes('Chỉ chấp nhận file ảnh')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({
    success: false,
    message: 'Lỗi server nội bộ',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
});

module.exports = app;
