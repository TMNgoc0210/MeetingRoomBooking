# Smart Meeting Room Booking System

Đồ án tốt nghiệp — Hệ thống quản lý và đặt phòng họp thông minh.

**Tech stack:** Node.js · Express · SQL Server · React 18 · Vite · Zustand · FullCalendar · Claude AI

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
