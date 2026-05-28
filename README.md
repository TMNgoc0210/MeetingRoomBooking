# Smart Meeting Room Booking System

Hệ thống quản lý và đặt phòng họp thông minh — Node.js + React + SQL Server.

---

## Yêu cầu

| Phần mềm | Phiên bản |
|---|---|
| Node.js | 18+ |
| SQL Server | 2019+ (hoặc SQL Server Express) |
| npm | 9+ |

---

## Cài đặt lần đầu

### 1. Clone & cài thư viện

```bash
git clone <repo-url>
cd DoAn2026

# Cài backend
cd backend
npm install

# Cài frontend
cd ../frontend
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `backend/.env` (copy từ mẫu bên dưới):

```env
PORT=5001
NODE_ENV=development

# SQL Server
DB_SERVER=localhost
DB_NAME=MeetingRoomBooking
DB_USER=sa
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=false

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Frontend URL (CORS)
CLIENT_URL=http://localhost:3000

# AI Chatbot (ShopAIKey — OpenAI-compatible)
SHOPAIKEY_API_KEY=your_shopaikey_api_key

# Email nhắc lịch (bỏ trống để tắt)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
REMINDER_MINUTES_BEFORE=60
```

### 3. Khởi tạo Database

Đảm bảo SQL Server đang chạy, sau đó:

```bash
cd backend
node src/config/init-db.js
```

Script này tạo database, tất cả bảng, và seed dữ liệu mẫu (phòng, người dùng, khoa).

> Nếu database đã tồn tại và chỉ cần thêm cột/bảng mới:
> ```bash
> node src/config/migrate.js
> ```

---

## Chạy dự án

### Cách 1 — Mở 2 terminal riêng (khuyên dùng)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server khởi động tại http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Vite dev server tại http://localhost:3000
```

### Cách 2 — Docker Compose (cần có SQL Server riêng)

```bash
docker compose up --build
# Truy cập http://localhost
```

---

## Truy cập

| Địa chỉ | Mô tả |
|---|---|
| http://localhost:3000 | Giao diện người dùng |
| http://localhost:3000/admin | Trang quản trị |
| http://localhost:5001/api | Backend API |

---

## Tài khoản mặc định

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `admin123` | Quản trị viên |
| `ngocphan` | `123456` | Người dùng |
| `user01` đến `user20` | `123456` | Người dùng |

---

## Cấu trúc dự án

```
DoAn2026/
├── backend/               # Node.js + Express API (port 5001)
│   ├── server.js          # Entry point
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── config/        # DB connection, init, migrate
│   │   ├── middleware/
│   │   └── utils/
│   └── uploads/           # Ảnh phòng + tài liệu đính kèm
├── frontend/              # React 18 + Vite (port 3000)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/
│       ├── store/         # Zustand
│       └── router/
├── MeetingBooking.sql     # Schema SQL Server (tham khảo)
├── docker-compose.yml
└── DEMO_GUIDE.md          # Hướng dẫn demo đồ án
```

---

## Tính năng chính

- Đặt phòng họp với kiểm tra conflict tự động
- Lịch phòng theo ngày/tuần/tháng (FullCalendar)
- Phê duyệt lịch cho phòng VIP
- Đặt lịch định kỳ (hàng ngày/tuần/tháng)
- Mời thành viên tham dự + email thông báo
- Upload tài liệu đính kèm
- AI Chatbot đặt phòng bằng ngôn ngữ tự nhiên
- Báo cáo thống kê tỷ lệ sử dụng phòng (admin)
- Email nhắc lịch tự động (cron job)
