# Hướng Dẫn Demo Đồ Án — Smart Meeting Room Booking System

## Thông tin hệ thống

| Mục | Thông tin |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5001 |
| Admin | `admin` / `admin123` |
| User demo | `ngocphan` / `123456` |
| User demo 2 | `user01` / `123456` |

---

## Trước khi demo — Checklist

```
□ Backend đang chạy (cửa sổ cmd hiển thị "SQL Server connected")
□ Frontend đang chạy (Vite dev server port 3000)
□ Mở sẵn 2 tab: localhost:3000 (user) và localhost:3000/admin (admin)
□ Mở sẵn Gmail để demo nhận mail (bookingroom457@gmail.com)
□ Xóa cache nếu có lỗi lạ: F12 → Console → localStorage.removeItem('meeting-auth')
```

---

## PHẦN 1 — Giao diện người dùng (không cần đăng nhập)

### 1.1 Trang chủ — Tìm kiếm phòng

**Thao tác:**
1. Mở `localhost:3000` — thấy ngay grid các phòng họp với ảnh thực tế
2. Nhập từ khóa vào ô tìm kiếm (VD: "VIP") → kết quả lọc tức thì
3. Chọn khu vực từ dropdown (Khu A / Khu B / Khu C) → lọc theo khu vực
4. Click vào 1 phòng → vào trang chi tiết phòng

**Điểm nhấn khi trình bày:**
- Giao diện tối/sáng có thể đổi ngay góc trên phải (chưa cần đăng nhập)
- Ảnh phòng thực tế, hiển thị sức chứa, thiết bị có sẵn
- Badge VIP màu vàng cho phòng cần phê duyệt

---

### 1.2 Chi tiết phòng + Calendar

**Thao tác:**
1. Từ trang chủ click vào **Phòng họp A101** (phòng VIP, đầy đủ thiết bị)
2. Kéo xuống thấy danh sách thiết bị (máy chiếu, điều hòa, micro...)
3. Click tab **Lịch đặt phòng** → thấy FullCalendar với các slot đã đặt

**Điểm nhấn:**
- Lịch theo ngày/tuần, màu sắc theo trạng thái (xanh = duyệt, vàng = chờ)
- Hover vào event thấy tên cuộc họp, giờ bắt đầu/kết thúc
- Người dùng thấy ngay khung giờ nào còn trống mà không cần đăng nhập

---

### 1.3 Trang Lịch phòng — 3 chế độ xem

**Thao tác:**
1. Click **Lịch phòng** trên navbar
2. Demo **chế độ "Tất cả phòng"** → thấy toàn bộ lịch hệ thống
3. Chuyển sang **"Theo khu vực"** → chọn Khu A → lọc phòng trong khu
4. Chuyển sang **"Theo phòng riêng"** → chọn 1 phòng cụ thể → xem riêng

**Điểm nhấn:**
- Event hiển thị `[Tên phòng] Tiêu đề` khi xem nhiều phòng cùng lúc
- Chuyển giữa Day / Week / Month view trên FullCalendar
- Navigate qua lại các tuần bằng mũi tên

---

## PHẦN 2 — Đăng ký & Đăng nhập

### 2.1 Đăng ký tài khoản mới

**Thao tác:**
1. Click **Đăng ký** trên navbar
2. Điền: Username, Họ tên, Email (Gmail), Mật khẩu, Khoa
3. Submit → thông báo "Đăng ký thành công"
4. Đăng nhập ngay bằng tài khoản vừa tạo

**Điểm nhấn:**
- Validate username chỉ dùng chữ/số/dấu chấm/gạch dưới
- Mật khẩu tối thiểu 6 ký tự
- Tài khoản mới mặc định Role = User (không có quyền admin)

---

### 2.2 Đăng nhập

**Thao tác:**
1. Click **Đăng nhập** → nhập `ngocphan` / `123456`
2. Thấy avatar + tên hiện trên navbar
3. **Demo sai mật khẩu** → thông báo lỗi rõ ràng

**Điểm nhấn bảo mật:**
- JWT access token 15 phút + refresh token 7 ngày (HttpOnly cookie)
- Mỗi lần đăng nhập thất bại được ghi log → demo ở phần Admin

---

### 2.3 Đăng xuất có xác nhận

**Thao tác:**
1. Click avatar → dropdown → **Đăng xuất**
2. Popup xác nhận "Bạn có chắc chắn muốn đăng xuất không?"
3. Click **Đăng xuất** đỏ → về trang chủ

---

## PHẦN 3 — Đặt phòng (User đã đăng nhập)

> Dùng tài khoản `ngocphan` / `123456`

### 3.1 Đặt phòng thường — Duyệt tự động

**Thao tác:**
1. Vào chi tiết **Phòng họp A201** (phòng thường, không VIP)
2. Click **Đặt phòng**
3. Điền form:
   - Tiêu đề: "Họp nhóm demo"
   - Ngày: hôm nay, Giờ: 14:00 – 15:00
   - Số người: 5
   - Nội dung: mô tả ngắn
4. Submit → thông báo **"Đặt phòng thành công"**, Status = Approved (xanh)

**Điểm nhấn:**
- Kiểm tra conflict tự động: thử đặt trùng giờ → báo lỗi "Phòng đã được đặt"
- Slot mới xuất hiện ngay trên calendar

---

### 3.2 Đặt phòng VIP — Chờ phê duyệt

**Thao tác:**
1. Vào **Phòng Hội Nghị VIP B301**
2. Click **Đặt phòng**
3. Điền form tương tự, Submit
4. Thông báo **"Chờ admin phê duyệt"**, Status = Pending (vàng)
5. Event màu vàng xuất hiện trên calendar

**Điểm nhấn:**
- Badge VIP trên phòng giải thích tại sao cần duyệt
- Admin sẽ nhận được booking này ở phần Phê duyệt

---

### 3.3 Mời thành viên tham dự

**Thao tác:**
1. Tạo booking mới, kéo xuống phần **Thành viên tham dự**
2. Gõ tên vào ô tìm kiếm (VD: "Ngoc") → chọn user từ gợi ý
3. Thêm 2–3 người → submit
4. **Kiểm tra email** → attendees nhận được mail mời với đầy đủ thông tin

---

### 3.4 Đặt lịch định kỳ (Recurring)

**Thao tác:**
1. Tạo booking, tick vào **Lịch định kỳ**
2. Chọn: **Hàng tuần**, ngày kết thúc = 4 tuần sau
3. Submit → thông báo "Đặt phòng thành công (4 lịch)"
4. Vào calendar, navigate qua các tuần → thấy event lặp lại

---

### 3.5 Yêu cầu dịch vụ kèm theo

**Thao tác:**
1. Tạo booking, tick **Yêu cầu dịch vụ**
2. Nhập: "Cần 10 chai nước, bảng trắng và bút"
3. Submit → xem chi tiết booking → thấy box màu amber hiển thị yêu cầu

---

### 3.6 Đính kèm tài liệu

**Thao tác:**
1. Vào **Chi tiết lịch đặt** của 1 booking đã tạo
2. Click **Thêm tài liệu** → chọn file PDF/Word
3. File upload thành công, hiện trong danh sách
4. **Kiểm tra email** → attendees nhận thông báo có tài liệu mới
5. Demo **xóa file** → file bị xóa cả trên server

---

### 3.7 Sửa & Huỷ lịch

**Thao tác:**
1. Vào **Lịch của tôi** (từ calendar hoặc chi tiết booking)
2. Click **Sửa** → đổi giờ → lưu
3. Click **Huỷ lịch** → popup xác nhận → event chuyển màu xám

---

## PHẦN 4 — Admin Panel

> Đăng nhập bằng `admin` / `admin123`

### 4.1 Dashboard tổng quan

**Thao tác:**
1. Vào `localhost:3000/admin`
2. Giới thiệu 5 stat card: Phòng, Người dùng, Tổng lịch, Hôm nay, Chờ duyệt
3. Biểu đồ bar chart — đổi tháng/năm/phòng → chart cập nhật
4. Panel **Chờ phê duyệt** bên phải — click vào 1 item đi thẳng đến trang phê duyệt
5. Kéo xuống panel **Nhật ký đăng nhập**:
   - Filter "Thất bại" → thấy các lần đăng nhập sai mật khẩu (từ demo trước)
   - Thấy rõ: Tài khoản, IP, Lý do, Thời gian

---

### 4.2 Phê duyệt lịch VIP

**Thao tác:**
1. Vào menu **Phê duyệt** (có badge số đỏ)
2. Thấy danh sách lịch VIP chờ duyệt từ demo Phần 3.2
3. Click **Duyệt** → lịch biến mất khỏi danh sách
4. Click **Từ chối** một lịch khác → nhập lý do → confirm
5. Quay lại calendar user → thấy lịch được duyệt chuyển xanh, lịch từ chối chuyển đỏ

---

### 4.3 Quản lý phòng

**Thao tác:**
1. Vào **Quản lý phòng** → danh sách 8 phòng
2. Click **Sửa** phòng bất kỳ:
   - Tab **Thông tin chung**: tên, khu vực, sức chứa, ảnh
   - Tab **Thông tin khác**: bật VIP, chọn điều kiện VIP (mọi booking / chỉ > X phút)
3. Demo **upload ảnh phòng mới** → ảnh cập nhật ngay
4. Demo **thêm phòng mới** → điền form → lưu → xuất hiện trên trang chủ

---

### 4.4 Quản lý thiết bị

**Thao tác:**
1. Vào **Thiết bị** → filter theo phòng → thấy thiết bị từng phòng
2. Thêm thiết bị mới: chọn icon FA, tên, số lượng
3. Sửa số lượng → lưu → vào BookDetail xem cập nhật

---

### 4.5 Quản lý khu vực, Khoa, Người dùng

**Thao tác nhanh (3 phút):**
1. **Khu vực**: thêm khu vực mới → phòng mới có thể chọn khu vực này
2. **Khoa / Đơn vị**: thêm khoa → user có thể chọn khi đăng ký
3. **Người dùng**: tìm user, xem thông tin, đổi Role 0↔1 (user↔admin), khóa tài khoản (Visible=0)

---

### 4.6 Thiết lập chung

**Thao tác:**
1. Vào **Thiết lập chung**
2. Đổi **Slot Calendar** từ 30 phút → 15 phút → lưu
3. Quay ra xem Calendar → các ô giờ chia nhỏ hơn
4. Đổi **Giờ làm việc**: start 07:00, end 21:00
5. Đổi **Theme** dark/light → toàn hệ thống đổi màu ngay

---

## PHẦN 5 — AI Chatbot

### 5.1 Chatbot User — hỏi thông tin

**Thao tác:**
1. Đăng nhập user, click FAB vàng góc phải
2. Hỏi: *"Có phòng nào còn trống chiều nay 3 giờ không?"*
3. Bot tìm kiếm và trả về danh sách phòng trống
4. Hỏi: *"Đặt phòng A201 từ 3 giờ đến 4 giờ hôm nay tên là Họp nhóm"*
5. Bot xác nhận thông tin → hỏi lại → gõ "xác nhận" → bot đặt phòng

**Điểm nhấn:**
- Bot nhớ context trong 30 phút (server-side memory)
- 4 công cụ: tìm phòng, đặt phòng, xem lịch, huỷ lịch

---

### 5.2 Chatbot Admin — hỏi thống kê

**Thao tác:**
1. Đăng nhập admin, click FAB tím trong admin panel
2. Hỏi: *"Hôm nay có bao nhiêu lịch đặt?"*
3. Hỏi: *"Phòng nào được đặt nhiều nhất tháng này?"*

---

## PHẦN 6 — Email tự động

> Chuẩn bị sẵn tab Gmail trước khi demo

| Tình huống | Email gửi đến |
|---|---|
| Đặt phòng thành công | Người đặt — xác nhận + thông tin phòng |
| Đặt phòng VIP (pending) | Người đặt — thông báo chờ duyệt |
| Có người mời tham dự | Từng attendee — lời mời họp |
| Upload tài liệu mới | Toàn bộ attendees — thông báo file mới |
| Trước giờ họp 60 phút | Người đặt — email nhắc lịch tự động |

**Cách demo nhanh:**
1. Đặt phòng mới có mời attendee có Gmail thật
2. Mở Gmail → thấy email xác nhận + email mời gửi đến attendee
3. Upload file vào booking → thấy email thông báo tài liệu

---

## PHẦN 7 — Bảo mật (nếu bị hỏi)

### Các điểm bảo mật có thể demo trực tiếp:

**1. Nhật ký đăng nhập thất bại**
- Thử đăng nhập sai 2–3 lần
- Vào Admin Dashboard → Nhật ký đăng nhập → thấy log ngay với IP, lý do, thời gian

**2. Phân quyền rõ ràng**
- Thử truy cập `localhost:3000/admin` khi đang đăng nhập user → redirect về trang chủ
- Thử gọi API admin khi không có token → 401 Unauthorized

**3. JWT short-lived token**
- Access token chỉ sống 15 phút, refresh token HttpOnly cookie không thể đọc bằng JS
- Đăng nhập → F12 → Application → Cookies → thấy `refreshToken` là HttpOnly

**4. SQL Injection prevention**
- Mọi query đều dùng parameterized (`@param`) — không concat string SQL

**5. Rate limiting**
- Production: tối đa 10 lần login/15 phút → tự động khóa brute force

---

## Câu hỏi phản biện thường gặp & Gợi ý trả lời

**Q: Tại sao dùng SQL Server thay vì MySQL/PostgreSQL?**
> SQL Server Express miễn phí, tích hợp tốt với môi trường Windows của trường, hỗ trợ stored procedure và T-SQL đầy đủ. Trong môi trường production có thể dùng Azure SQL (cloud-native).

**Q: Tại sao dùng JWT thay vì Session?**
> JWT stateless phù hợp cho kiến trúc REST API tách biệt frontend/backend. Session cần lưu trạng thái server, JWT chỉ cần verify chữ ký. Kết hợp access token ngắn hạn (15m) + refresh token HttpOnly cookie đạt cân bằng tốt giữa bảo mật và UX.

**Q: Hệ thống xử lý conflict lịch như thế nào?**
> Mỗi lần đặt phòng kiểm tra điều kiện: `TimeStart < @timeEnd AND TimeEnd > @timeStart` với cùng RoomID và Status != Cancelled. Đây là interval overlap detection chuẩn, chạy trong transaction để tránh race condition.

**Q: AI chatbot dùng model gì, có lo ngại về chi phí không?**
> Dùng Claude Sonnet 4.5 qua ShopAIKey (API proxy). Rate limit được cài ở backend, có friendly message khi vượt giới hạn. Với quy mô nội bộ trường chi phí không đáng kể.

**Q: Tại sao lịch phòng hiển thị được khi chưa đăng nhập?**
> Lịch phòng là thông tin điều phối công khai trong nội bộ — giống bảng lịch phòng treo ở hành lang. Dữ liệu nhạy cảm (nội dung họp, tài liệu, thành viên) đều yêu cầu xác thực. Đây là thiết kế có chủ ý để tối ưu UX.

**Q: Hệ thống có thể scale lên bao nhiêu user?**
> Connection pool mssql cấu hình max 10 connections, đủ cho ~100 concurrent users trong môi trường nội bộ. Nếu cần scale: tăng pool size, thêm Redis cache cho session, hoặc chuyển sang load balancer nhiều instance.

---

## Thứ tự demo khuyên dùng (30 phút)

```
[0:00] Giới thiệu tổng quan hệ thống (2 phút)
[2:00] Phần 1: Trang chủ + tìm kiếm phòng (3 phút)
[5:00] Phần 1: Calendar 3 chế độ (2 phút)
[7:00] Phần 2: Đăng nhập (1 phút)
[8:00] Phần 3.1: Đặt phòng thường (2 phút)
[10:00] Phần 3.2: Đặt phòng VIP → pending (1 phút)
[11:00] Phần 3.3: Mời attendee + xem email (2 phút)
[13:00] Phần 3.4: Đặt lịch định kỳ (1 phút)
[14:00] Phần 3.6: Upload tài liệu + email thông báo (2 phút)
[16:00] Phần 4.1: Admin Dashboard + login log (2 phút)
[18:00] Phần 4.2: Phê duyệt VIP (2 phút)
[20:00] Phần 4.3: Quản lý phòng (2 phút)
[22:00] Phần 4.6: Thiết lập chung → đổi slot calendar (1 phút)
[23:00] Phần 5: AI Chatbot đặt phòng bằng ngôn ngữ tự nhiên (4 phút)
[27:00] Phần 7: Bảo mật — nhật ký + JWT cookie (2 phút)
[29:00] Kết luận + mở Q&A (1 phút)
```
