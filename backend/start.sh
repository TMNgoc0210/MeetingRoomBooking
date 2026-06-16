#!/bin/sh
set -e

echo "🚀 Starting Meeting Room Booking..."

# ── Đảm bảo thư mục uploads tồn tại ──
mkdir -p /app/uploads/images
mkdir -p /app/uploads/docs

# ── Khởi tạo DB (idempotent — CREATE TABLE IF NOT EXISTS) ──
echo "🔧 Initializing database schema..."
node src/config/init-db.js

echo "🔄 Running migrations..."
node src/config/migrate.js

echo "✅ Database ready!"

# ── Khởi động server ──
exec node server.js
