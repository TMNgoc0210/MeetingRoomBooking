# CLAUDE.md — Dự án Đặt Phòng Họp

## Tổng quan dự án

Hệ thống quản lý và đặt phòng họp thông minh (Smart Meeting Room). Người dùng tìm phòng, xem lịch trên calendar, đặt phòng; admin quản lý phòng/khu vực/người dùng và xem báo cáo thống kê.

**Trạng thái:** Đang phát triển — MVP + P0/P1 hoàn thành, đang hoàn thiện UI/UX nâng cao.

---

## Tech Stack

### Backend
| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js (v25 hiện tại) |
| Framework | Express.js |
| Database | SQLite (better-sqlite3) — file `backend/data/meeting_booking.db` |
| Auth | JWT — access token 15m (Bearer header) + refresh token 7d (HttpOnly cookie) |
| File upload | Multer → `backend/uploads/images/` (ảnh) + `backend/uploads/docs/` (tài liệu) |
| Security | helmet, express-rate-limit, bcryptjs |
| AI Chatbot | **LangChain** (`@langchain/google-genai`) + **Gemini 2.5 Flash** (GEMINI_API_KEY) |
| Entry point | `backend/server.js` → chạy `node server.js` hoặc `npm run dev` |

### Frontend
| Thành phần | Công nghệ |
|---|---|
| Framework | React 18 + Vite (port 3000) |
| Routing | React Router v6 |
| State | Zustand (`authStore`, `uiStore`, `settingsStore`) — authStore/uiStore có persist |
| Calendar | FullCalendar (`BookingCalendar.jsx`) — slotDuration từ `settingsStore` |
| HTTP | Axios (`services/api.js`) — auto refresh token, `_silent` flag cho background requests |
| Toast | react-hot-toast |
| Icons | Font Awesome (CDN, không cài npm) |
| Ngày giờ | dayjs |

### Database Schema (SQLite)
```
Faculty → User → Booking → LineRoom ← Room ← Area
                              ↓              ↑
                       BookingAttendee    Equipment
                       BookingAttachment
Role (standalone)
Setting (key/value)
```

**Bảng chính:**
- **Area**: khu vực phòng họp (Khu A, Khu B...)
- **Faculty**: khoa/đơn vị/phòng ban
- **User**: `UserID TEXT PK`, `Roles=0` user thường, `Roles=1` admin, `Visible=1` hoạt động
- **Room**: `IsVIP=1` yêu cầu phê duyệt; `VIPCondition` (0=mọi booking, 1=chỉ vượt VIPMinutes); `VIPMinutes` ngưỡng phút
- **Equipment**: thiết bị phòng (`RoomID`, `Name`, `Icon` FA class, `Quantity`, `Visible`)
- **LineRoom**: 1 slot đặt phòng; **Status**: `0=Pending, 1=Approved, 2=Rejected, 3=Cancelled`
  - `ApprovedBy`, `ApprovedAt` — ai duyệt, khi nào
  - `RejectReason` — lý do từ chối (KHÔNG ghi đè `Note`)
  - `ServiceRequest` — yêu cầu dịch vụ kèm theo
  - `RecurringGroupID`, `RecurringType` (daily/weekly/monthly), `RecurringEnd` — lịch lặp
- **BookingAttendee**: danh sách thành viên được mời (`LineRoomID`, `UserID`, `Status`)
- **BookingAttachment**: tài liệu đính kèm (`LineRoomID`, `FileName`, `FilePath`, `FileSize`, `MimeType`, `UploadedBy`)
- **Role**: vai trò hệ thống (`RoleID`, `Name`, `Description`) — quản lý định nghĩa vai trò, không ảnh hưởng permission (vẫn dùng `User.Roles=0/1`)
- **Setting**: cài đặt hệ thống key/value (`Key` TEXT PK, `Value` TEXT)
  - Keys: `timeFormat` (24h/AM/PM), `slotMinutes` (5/10/15/30), `defaultDuration`, `maxDuration`, `timezone`, `theme` (dark/light), `workdayStart`, `workdayEnd`
- **Booking**: header đặt phòng (hiện ít dùng, LineRoom gần như độc lập)

---

## Cấu trúc thư mục

```
DoAn2026/
├── backend/
│   ├── server.js                     ← Entry point (node server.js)
│   └── src/
│       ├── app.js                    ← Express setup, tất cả middleware và routes mount
│       ├── config/
│       │   ├── db.js                 ← SQLite + convertParams (@param→:param, [Table]→"Table", GETDATE()→datetime)
│       │   ├── init-db.js            ← Tạo schema fresh + seed (chạy 1 lần, XÓA data cũ)
│       │   └── migrate.js            ← Thêm cột/bảng mới vào DB đang có (an toàn, idempotent)
│       ├── controllers/
│       │   ├── auth.controller.js    ← login, register, logout, getMe, refreshToken
│       │   ├── booking.controller.js ← book (conflict check, VIP logic), approve, reject (RejectReason), cancel, getPending
│       │   ├── lineroom.controller.js ← getByRoom, getByArea, getAllBookings, getMy, getDetail, delete, addAttendees
│       │   ├── attachment.controller.js ← getAttachments, addAttachment, deleteAttachment (xóa file vật lý)
│       │   ├── room.controller.js    ← CRUD + VIPCondition/VIPMinutes
│       │   ├── area.controller.js
│       │   ├── faculty.controller.js
│       │   ├── user.controller.js
│       │   ├── equipment.controller.js ← getAll (admin, join Room+Area), getByRoom, add, update, delete
│       │   ├── role.controller.js    ← CRUD vai trò (admin only)
│       │   ├── setting.controller.js ← getSettings (public), updateSettings (admin, upsert)
│       │   ├── report.controller.js  ← chart, summary, roomUsage
│       │   ├── chat.controller.js    ← AI chatbot (Gemini, server-side session memory)
│       │   └── upload.controller.js
│       ├── routes/                   ← 1 file route per controller
│       │   ├── lineroom.routes.js    ← /all và /area/:id PHẢI trước /:id (route ordering!)
│       │   └── ...
│       ├── middleware/
│       │   ├── auth.js               ← verifyToken (JWT Bearer)
│       │   ├── adminOnly.js          ← default export, chặn non-admin (Roles !== 1)
│       │   ├── upload.js             ← Multer ảnh (JPG/PNG, 5MB) → uploads/images/
│       │   └── uploadDocs.js         ← Multer tài liệu (PDF/Word/Excel/PPT/ZIP/img, 20MB) → uploads/docs/
│       └── utils/
│           ├── response.js           ← success/error/notFound/badRequest/forbidden
│           └── hashPassword.js       ← bcrypt + SHA256 legacy support
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx              ← Trang chủ: tìm kiếm + room grid
│       │   ├── BookDetail.jsx        ← Chi tiết phòng + calendar + equipment
│       │   ├── CalendarView.jsx      ← /calendar — 3 chế độ: Tất cả / Khu vực / Phòng riêng
│       │   ├── Report.jsx            ← Báo cáo thống kê (chart)
│       │   └── admin/
│       │       ├── Dashboard.jsx     ← Stat cards + bar chart + pending panel
│       │       ├── Approvals.jsx     ← Duyệt lịch VIP (chỉ admin)
│       │       ├── Rooms.jsx         ← CRUD phòng: tab Thông tin chung + Thông tin khác (VIP)
│       │       ├── Areas.jsx         ← CRUD khu vực
│       │       ├── Faculties.jsx     ← CRUD khoa/đơn vị
│       │       ├── Users.jsx         ← CRUD người dùng
│       │       ├── Equipment.jsx     ← Quản lý thiết bị toàn hệ thống (filter theo phòng)
│       │       ├── Roles.jsx         ← Quản lý định nghĩa vai trò (Name + Description)
│       │       └── Settings.jsx      ← Thiết lập chung: theme, timeFormat, slotMinutes, workday hours, timezone
│       ├── components/
│       │   ├── Navbar.jsx            ← Navbar user (ẩn trên /admin/*)
│       │   ├── AdminLayout.jsx       ← Admin sidebar layout + AdminChatbotWidget
│       │   ├── calendar/BookingCalendar.jsx ← FullCalendar, slotDuration từ settingsStore, màu theo Status
│       │   ├── chat/
│       │   │   ├── ChatbotWidget.jsx      ← User chatbot (gold FAB, chỉ hiện ngoài /admin)
│       │   │   └── AdminChatbotWidget.jsx ← Admin chatbot (purple/indigo FAB, trong AdminLayout)
│       │   └── modals/
│       │       ├── LoginModal.jsx         ← Auth modal: tab Đăng nhập + Đăng ký
│       │       ├── BookingModal.jsx       ← Đặt phòng: date/time, attendees, recurring, ServiceRequest, Attachments
│       │       ├── EditBookingModal.jsx
│       │       ├── BookingDetailModal.jsx ← Hiện ServiceRequest, RejectReason, Attachments
│       │       ├── ChangePasswordModal.jsx
│       │       └── UserModal.jsx
│       ├── services/
│       │   ├── api.js                ← Axios instance, auto-refresh token, _silent flag
│       │   └── index.js              ← tất cả services: auth, room, booking, lineRoom, attachment, equipment, equipmentAdmin, user, area, faculty, report, chat, settings, role
│       ├── store/
│       │   ├── authStore.js          ← user, accessToken, setAuth, logout, isAdmin()
│       │   ├── uiStore.js            ← modal states, loginTab, refreshKey, triggerRefresh()
│       │   └── settingsStore.js      ← settings (từ /api/settings), fetch(), save(), slotDuration(), hour12()
│       └── router/AppRouter.jsx      ← Routes + AdminRoute guard
└── CLAUDE.md
```

---

## Luồng Admin

Admin truy cập qua **sidebar riêng** tại `/admin/*` (không dùng Navbar chung):
1. Đăng nhập `admin / admin123` → Navbar chỉ thấy link "Quản trị" → `/admin`
2. **Dashboard** (`/admin`) — stat cards + bar chart + pending panel
3. **Phê duyệt** (`/admin/approvals`) — duyệt/từ chối lịch VIP (với lý do RejectReason)
4. **Phòng** (`/admin/rooms`) — CRUD phòng: tab "Thông tin chung" + tab "Thông tin khác" (VIP condition + VIPMinutes)
5. **Thiết bị** (`/admin/equipment`) — quản lý thiết bị toàn hệ thống, filter theo phòng
6. **Khu vực** (`/admin/areas`) — CRUD khu vực
7. **Khoa** (`/admin/faculties`) — CRUD khoa/đơn vị
8. **Người dùng** (`/admin/users`) — CRUD người dùng
9. **Vai trò** (`/admin/roles`) — CRUD định nghĩa vai trò (Name + Description), có detail panel
10. **Thiết lập chung** (`/admin/settings`) — theme, time format, slot minutes, default/max duration, workday hours, timezone

Route bảo vệ bởi `AdminRoute` guard; `App.jsx` ẩn Navbar và ChatbotWidget khi `pathname.startsWith('/admin')`.
Legacy redirects: `/list-room` → `/admin/rooms`, `/approvals` → `/admin/approvals`, v.v.

---

## Tính năng hiện có

| # | Tính năng | Backend | Frontend | Ghi chú |
|---|---|---|---|---|
| 1 | Đăng nhập / Đăng ký / JWT | ✅ | ✅ | Register: tự đăng ký tài khoản user |
| 2 | Đổi mật khẩu | ✅ | ✅ | |
| 3 | CRUD Khu vực (Area) | ✅ | ✅ | |
| 4 | CRUD Phòng họp + upload ảnh | ✅ | ✅ | Tab Thông tin chung + Thông tin khác (VIP) |
| 5 | CRUD Khoa/Đơn vị (Faculty) | ✅ | ✅ | |
| 6 | CRUD Người dùng | ✅ | ✅ | |
| 7 | Tìm kiếm phòng (tên + khu vực) | ✅ | ✅ | |
| 8 | Xem lịch calendar — 3 chế độ | ✅ | ✅ | Tất cả phòng / Khu vực / Phòng riêng; event có [RoomName] khi xem nhiều phòng |
| 9 | Đặt phòng (conflict detection) | ✅ | ✅ | VIP → Pending (theo VIPCondition/VIPMinutes), thường → Approved |
| 10 | Xóa/sửa lịch đặt | ✅ | ✅ | |
| 11 | Phê duyệt lịch đặt VIP | ✅ | ✅ | Từ chối kèm lý do → `LineRoom.RejectReason` (không ghi đè Note) |
| 12 | Trạng thái lịch đặt (0-3) | ✅ | ✅ | Calendar màu theo status; BookingDetailModal hiện RejectReason |
| 13 | Equipment (thiết bị phòng) | ✅ | ✅ | BookDetail + CalendarView header; admin CRUD tại /admin/equipment |
| 14 | Mời thành viên tham dự | ✅ | ✅ | BookingModal có search + tag |
| 15 | Đặt lịch định kỳ (Recurring) | ✅ | ✅ | daily/weekly/monthly + end date |
| 16 | Báo cáo chart tuần/tháng | ✅ | ✅ | |
| 17 | Upload ảnh phòng | ✅ | ✅ | |
| 18 | AI Chatbot Q&A (User) | ✅ | ✅ | Gold FAB; Gemini 2.5 Flash; rate limit → friendly message |
| 19 | AI Chatbot đặt phòng NLP | ✅ | ✅ | LangChain + Gemini Function Calling; 4 tools; server-side memory 30 phút |
| 20 | AI Chatbot Admin | ✅ | ✅ | Purple/indigo FAB trong AdminLayout; quick replies admin |
| 21 | Admin Dashboard + Sidebar | ✅ | ✅ | Collapsible sidebar, 9 menu items, pending badge |
| 22 | Yêu cầu dịch vụ (ServiceRequest) | ✅ | ✅ | Checkbox + textarea trong BookingModal; amber box trong DetailModal |
| 23 | Tài liệu đính kèm (Attachment) | ✅ | ✅ | Upload PDF/Word/Excel khi đặt phòng và trong DetailModal; xóa file vật lý |
| 24 | VIP Condition linh hoạt | ✅ | ✅ | Condition=0: mọi booking cần duyệt; Condition=1: chỉ > VIPMinutes phút |
| 25 | Quản lý thiết bị (admin) | ✅ | ✅ | /admin/equipment — filter theo phòng, modal add/edit với icon picker |
| 26 | Vai trò (Roles) | ✅ | ✅ | /admin/roles — CRUD định nghĩa vai trò, detail panel bên phải |
| 27 | Thiết lập chung (Settings) | ✅ | ✅ | /admin/settings — theme, timeFormat, slotMinutes, workday, timezone |
| 28 | slotDuration từ Settings | ✅ | ✅ | BookingCalendar.jsx đọc `settingsStore.slotDuration()` |

---

## Còn thiếu / Cần cải thiện

| # | Hạng mục | Ưu tiên | Ghi chú |
|---|---|---|---|
| A | Equipment icon hiển thị trên Home card | P1 | Hiện chỉ có ở BookDetail và CalendarView header |
| B | Report page redesign | P1 | Thêm tỷ lệ sử dụng, top phòng, export |
| C | Email nhắc lịch tự động (cron) | P2 | nodemailer + node-cron; deferred vì cần SMTP config |
| D | Vai trò gắn với User (phân quyền thực) | P2 | Hiện Role chỉ là định nghĩa, permission vẫn dùng Roles=0/1 |
| E | Notification trong app | P3 | Khi lịch được duyệt/từ chối |

---

## AI Chatbot Architecture

### Thư viện & Model
- **`@langchain/google-genai`** — `ChatGoogleGenerativeAI` dùng để validate API key + LLM singleton
- **Model:** `gemini-2.5-flash` (thay `gemini-2.0-flash-lite` hết quota)
- **Tool calling:** Raw Gemini REST API (`/v1beta/models/:model:generateContent`) vì `@langchain/core` v1.x có bug CJS/UUID khi dùng `tool()` wrapper

### Server-side Conversation Memory
- `sessionStore` = `Map<userID, { messages[], lastActive }>` — không dùng frontend-sent history
- TTL 30 phút, cleanup mỗi 10 phút
- Tối đa 30 messages per session (rolling window)

### Gemini Function Calling Format
```js
// Đúng: functionDeclarations wrapper + UPPERCASE types
const TOOLS = [{ functionDeclarations: [{ name, description, parameters: { type: 'OBJECT', properties: { key: { type: 'STRING' } } } }] }];
// Sai: truyền thẳng array hoặc dùng lowercase
```

### 4 Tools (User chatbot)
| Tool | Mô tả |
|---|---|
| `search_available_rooms` | Tìm phòng trống theo ngày/giờ/số người |
| `book_room` | Đặt phòng (CHỈ gọi sau khi user xác nhận) |
| `get_my_bookings` | Xem lịch sắp tới của user |
| `cancel_booking` | Huỷ một lịch đặt |

### Lưu ý timezone
- **Không dùng** `new Date().toISOString()` để tạo timeStart/timeEnd — trả về UTC, sai 7 tiếng ở VN
- **Dùng** string arithmetic: `${date} ${hh}:${mm}:00` tính từ startTime + durationMinutes
- `datetime('now','localtime')` trong SQL là đúng (SQLite tự convert)

---

## Quy tắc thiết kế bắt buộc

### Backend
1. **Luôn dùng helper từ `utils/response.js`** — `success()`, `error()`, `notFound()`, `badRequest()`, `forbidden()`
2. **Luôn có auth middleware** cho route cần đăng nhập; `adminOnly` cho route admin
3. **`adminOnly` là default export** — `require('../middleware/adminOnly')` KHÔNG destructure `{ adminOnly }`
4. **Route ordering** — static paths (`/all`, `/area/:id`, `/room/:id`) PHẢI khai báo TRƯỚC dynamic `/:id`
5. **Conflict detection** bắt buộc trước mọi INSERT vào LineRoom
6. **SQLite syntax** — KHÔNG dùng MSSQL: `datetime('now','localtime')`, `strftime()`, `LIKE '%' || @param || '%'`, `"User"` (double-quote) thay `[User]`
   - `db.js` tự convert `[Table]`→`"Table"`, `@param`→`:param`, `GETDATE()`→`datetime(...)` — nhưng tốt nhất viết đúng ngay
7. **Param binding** qua object `{ key: value }` — tuyệt đối không concat string SQL
8. **Response format:** `{ success, data, message }` — không thay đổi
9. **RejectReason** ghi vào `LineRoom.RejectReason`, KHÔNG ghi đè `LineRoom.Note`

### Frontend
1. **Modal state qua `uiStore`** — không dùng local state cho modal mới
2. **API call qua `services/index.js`** — không gọi axios trực tiếp trong component
3. **Toast** cho mọi feedback — `react-hot-toast`, không dùng `alert()`
4. **Không tạo file CSS riêng** — dùng CSS variables (`var(--accent)`, `var(--text-muted)`...) và class có sẵn trong `index.css`
5. **Loading state** — mọi async action có loading boolean + disabled button
6. **Background API** cần `{ _silent: true }` để interceptor không redirect khi 401
7. **settingsStore** — đọc `slotDuration()` và `hour12()` bằng `useSettingsStore(s => s.slotDuration())`; `fetch()` được gọi tự động trong `App.jsx` khi mount

---

## Tài khoản mặc định
- **Admin:** `admin` / `admin123` (Roles=1, thấy tất cả nav link)
- **User:** `user01` / `123456`, `user02` / `123456` (Roles=0)
- Người dùng mới tự đăng ký qua form → Roles=0 mặc định

## Lệnh thường dùng
```bash
# Backend (chạy từ thư mục backend/)
npm run dev                      # nodemon server.js (hot reload)
node server.js                   # production-like

# Chỉ chạy 1 lần khi setup lần đầu:
node src/config/init-db.js       # Tạo DB mới + seed (XÓA data cũ nếu có)
node src/config/migrate.js       # Thêm cột/bảng mới vào DB đang có (an toàn, idempotent)

# Frontend (chạy từ thư mục frontend/)
npm run dev                      # Vite dev server port 3000
```

## Những việc Claude KHÔNG nên làm
- Không đổi DB sang PostgreSQL/MySQL — SQLite cho đơn giản
- Không đổi state management sang Redux — giữ Zustand
- Không thêm TypeScript — JavaScript thuần
- Không mock DB trong test — dùng DB thật
- Không sửa format response `{ success, data, message }`
- Không commit `.env` hoặc `data/*.db`
- Không destructure import adminOnly: `const { adminOnly } = require(...)` sẽ bị undefined
- Không đặt dynamic route `/:id` trước static routes như `/all`, `/area/:areaId`
