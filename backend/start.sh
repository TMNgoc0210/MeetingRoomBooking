#!/bin/sh
set -e

echo "🚀 Starting Meeting Room Booking..."

# ── Đảm bảo thư mục data tồn tại (volume Fly.io mount tại /app/data) ──
mkdir -p /app/data/uploads/images
mkdir -p /app/data/uploads/docs

# ── Symlink /app/uploads → /app/data/uploads để Multer lưu đúng chỗ ──
if [ ! -L /app/uploads ]; then
  rm -rf /app/uploads
  ln -sf /app/data/uploads /app/uploads
  echo "📁 Linked uploads → /app/data/uploads"
fi

# ── Khởi tạo DB nếu chạy lần đầu (volume rỗng) ──
if [ ! -f /app/data/meeting_booking.db ]; then
  echo "🔧 First run: initializing database..."
  node src/config/init-db.js
  echo "🔄 Running migrations..."
  node src/config/migrate.js
  echo "✅ Database ready!"
else
  echo "✅ Database found, running migrations (safe)..."
  node src/config/migrate.js
fi

# ── Khởi động server ──
exec node server.js
