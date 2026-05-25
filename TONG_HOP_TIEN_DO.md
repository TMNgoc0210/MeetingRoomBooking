# Tổng hợp tiến độ đồ án — Đặt phòng họp tích hợp AI Chatbot
> Cập nhật: 18/05/2026

---

## ✅ Đã hoàn thành

### Hệ thống core
| Tính năng | File | Ghi chú |
|---|---|---|
| Đăng nhập / Đăng ký / JWT | `auth.controller.js`, `LoginModal.jsx` | Register tự đăng ký, refresh token giữ roles |
| Đặt phòng + conflict detection | `booking.controller.js` | 100% chặn trùng lịch |
| Phòng VIP → Pending → Admin duyệt | `booking.controller.js`, `Approvals.jsx` | Workflow hoàn chỉnh |
| Đặt lịch định kỳ (daily/weekly/monthly) | `booking.controller.js` | Recurring + end date |
| Mời thành viên tham dự | `BookingModal.jsx`, `lineroom.controller.js` | Search + tag user |
| Xem/sửa/huỷ lịch đặt | `EditBookingModal.jsx`, `BookingDetailModal.jsx` | |
| CRUD Phòng + upload ảnh + VIP flag | `AdminRooms.jsx`, `room.controller.js` | |
| CRUD Khu vực / Khoa / Người dùng | `Areas.jsx`, `Faculties.jsx`, `Users.jsx` | |
| Equipment (thiết bị phòng) | `equipment.controller.js`, `BookDetail.jsx` | CRUD + hiển thị |
| Báo cáo thống kê (chart) | `Report.jsx`, `report.controller.js` | Bar chart theo tuần |
| Upload ảnh phòng | `upload.controller.js` | Multer |
| AI Chatbot (Q&A) | `ChatbotWidget.jsx`, `chat.controller.js` | Gemini 2.0-flash-lite |

### UI/UX (session này)
| Tính năng | File |
|---|---|
| Trang Lịch phòng kiểu AMIS | `CalendarView.jsx` — `/calendar` |
| Admin Sidebar layout | `AdminLayout.jsx` + `Dashboard.jsx` |
| Admin Dashboard (stats + chart + pending) | `pages/admin/Dashboard.jsx` — `/admin` |
| Routes gom vào `/admin/*` | `AppRouter.jsx` |

---

## ❌ Còn thiếu (quan trọng cho bảo vệ)

### 1. Chatbot đặt phòng bằng NLP ← **QUAN TRỌNG NHẤT**
Đề cương ghi rõ: *"thực hiện thao tác đặt phòng tự động"* — ví dụ: **"Đặt phòng họp cho 6 người vào 2h chiều mai"**

Chatbot hiện tại chỉ trả lời Q&A, chưa gọi được API đặt phòng thật.

### 2. Database mismatch
Đề cương: SQL Server — Thực tế: SQLite. Cần ghi chú trong báo cáo.

---

## 🤖 Kế hoạch Chatbot Function Calling (làm trong 2 tiếng tới)

### Không nên dùng n8n — lý do:
- n8n là workflow automation tool, phù hợp khi có nhiều service kết nối (email, Slack, webhook)
- Đồ án chỉ cần chatbot → gọi API nội bộ → không cần middleware
- Thêm n8n = thêm 1 server nữa, phức tạp deployment, không có thêm giá trị
- Hội đồng hỏi "n8n làm gì ở đây?" → khó giải thích

### Nên dùng: **Gemini Function Calling** (đã có Gemini, thêm ~100 dòng code)

### Workflow chatbot đề xuất:

```
User nhắn: "Đặt phòng cho 6 người vào 14h ngày mai"
    ↓
Gemini phân tích intent + trích xuất entities:
  - intent: book_room
  - numberPerson: 6
  - timeStart: "2026-05-19 14:00"
  - timeEnd: (mặc định +1h = "2026-05-19 15:00")
    ↓
Gemini gọi function: search_available_rooms({ date, timeStart, timeEnd, minSeat })
    ↓
Backend trả về danh sách phòng trống
    ↓
Gemini hỏi user: "Có 3 phòng trống: A101 (10 chỗ), B202 (8 chỗ), C303 (15 chỗ). Bạn chọn phòng nào?"
    ↓
User: "Phòng A101"
    ↓
Gemini gọi function: book_room({ roomID, timeStart, timeEnd, title, userID })
    ↓
Backend đặt phòng → trả về kết quả
    ↓
Gemini xác nhận: "Đã đặt phòng A101 lúc 14:00-15:00 ngày 19/05 thành công!"
```

### Các functions cần định nghĩa cho Gemini:

```js
const tools = [
  {
    name: "search_available_rooms",
    description: "Tìm phòng họp còn trống theo thời gian và số người",
    parameters: {
      date: "string (YYYY-MM-DD)",
      timeStart: "string (HH:mm)",
      timeEnd: "string (HH:mm)",
      minSeat: "number — số người tối thiểu"
    }
  },
  {
    name: "book_room",
    description: "Đặt phòng họp",
    parameters: {
      roomID: "number",
      title: "string — tên cuộc họp",
      timeStart: "string (YYYY-MM-DD HH:mm:ss)",
      timeEnd: "string (YYYY-MM-DD HH:mm:ss)",
      numberPerson: "number"
    }
  },
  {
    name: "get_my_bookings",
    description: "Xem lịch đặt phòng của tôi",
    parameters: {}
  },
  {
    name: "cancel_booking",
    description: "Huỷ lịch đặt phòng",
    parameters: { lineRoomID: "number" }
  }
]
```

### Files cần sửa/tạo:
1. **`backend/src/controllers/chat.controller.js`** — thêm function calling logic
2. **`backend/src/routes/chat.routes.js`** — thêm endpoint `/chat/message` nhận userID
3. **`frontend/src/components/chat/ChatbotWidget.jsx`** — gửi userID kèm message
4. **Backend endpoint mới**: `GET /api/rooms/available?date=&timeStart=&timeEnd=&minSeat=`

### System prompt cho Gemini:
```
Bạn là trợ lý đặt phòng họp của hệ thống Meeting Booking.
Khi user muốn đặt phòng, PHẢI dùng function calling để thực hiện.
Ngày "hôm nay" = {currentDate}, ngày "mai" = {tomorrow}.
User đang đăng nhập: {userID} - {userName}.
Nếu thiếu thông tin (giờ, ngày), hỏi lại trước khi đặt.
Luôn xác nhận với user trước khi thực sự đặt phòng.
```

---

## Thứ tự làm trong buổi tới (2 tiếng):

1. **Backend** (45 phút):
   - Thêm endpoint `GET /api/rooms/available` — tìm phòng trống
   - Sửa `chat.controller.js` — thêm Gemini function calling

2. **Frontend** (30 phút):
   - Sửa `ChatbotWidget.jsx` — gửi `userID` + hiển thị kết quả đặt phòng

3. **Test** (15 phút):
   - Test câu lệnh tự nhiên → đặt phòng thành công
   - Test khi không còn phòng trống → chatbot báo lỗi

4. **Báo cáo** (30 phút):
   - Ghi note SQLite thay SQL Server
   - Screenshot các tính năng

---

## Tài khoản test:
- Admin: `admin` / `admin123`
- User: `user01` / `123456`, `user02` / `123456`

## Lệnh khởi động:
```bash
# Backend (từ thư mục backend/)
node server.js

# Frontend (từ thư mục frontend/)
npm run dev
```
