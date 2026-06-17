/**
 * services/index.js — Tập trung tất cả API service calls
 * ──────────────────────────────────────────────────────────
 * Mọi component/page chỉ import từ file này, không gọi api.js trực tiếp.
 * Mỗi service tương ứng với 1 nhóm endpoint backend:
 *
 *   authService      — đăng nhập, đăng ký, getMe
 *   roomService      — danh sách, tìm kiếm, CRUD phòng
 *   bookingService   — đặt phòng, duyệt, từ chối, huỷ
 *   lineRoomService  — truy vấn slot lịch, attendees, attachments
 *   attachmentService— upload tài liệu đính kèm
 *   equipmentService — thiết bị theo phòng (public)
 *   equipmentAdminService — CRUD thiết bị (admin)
 *   userService      — CRUD người dùng, đổi mật khẩu
 *   areaService      — CRUD khu vực
 *   facultyService   — CRUD khoa/đơn vị
 *   reportService    — báo cáo chart, summary, room usage
 *   uploadService    — upload ảnh phòng
 *   chatService      — gửi/nhận tin nhắn chatbot AI
 *   settingsService  — đọc/ghi thiết lập hệ thống
 *   roleService      — CRUD định nghĩa vai trò
 *   notificationService — thông báo trong app (chuông)
 */
import api from './api'

export const authService = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
}

export const roomService = {
  getList: () => api.get('/rooms'),
  getAll: () => api.get('/rooms/all'),
  getDetail: (id) => api.get(`/rooms/${id}`),
  search: (params) => api.get('/rooms/search', { params }),
  searchAll: (params) => api.get('/rooms/search-all', { params }),
  getByArea: (areaId) => api.get(`/rooms/area/${areaId}`),
  add: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
}

export const bookingService = {
  book: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  approve: (id) => api.put(`/bookings/${id}/approve`),
  reject: (id, reason) => api.put(`/bookings/${id}/reject`, { reason }),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  getPending: () => api.get('/bookings/pending'),
}

export const lineRoomService = {
  getAll: () => api.get('/linerooms/all'),
  getByArea: (areaId) => api.get(`/linerooms/area/${areaId}`),
  getByRoom: (roomId) => api.get(`/linerooms/room/${roomId}`),
  getMy: () => api.get('/linerooms/my'),
  getDetail: (id) => api.get(`/linerooms/${id}`),
  getForEdit: (id) => api.get(`/linerooms/${id}/edit`),
  delete: (id) => api.delete(`/linerooms/${id}`),
  addAttendees: (id, userIDs) => api.post(`/linerooms/${id}/attendees`, { userIDs }),
  removeAttendee: (id, userID) => api.delete(`/linerooms/${id}/attendees/${userID}`),
  getAttachments: (id) => api.get(`/linerooms/${id}/attachments`),
  deleteAttachment: (attachmentID) => api.delete(`/linerooms/attachments/${attachmentID}`),
}

export const attachmentService = {
  upload: (lineRoomID, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/linerooms/${lineRoomID}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const equipmentService = {
  getByRoom: (roomId) => api.get(`/equipment/room/${roomId}`),
  add: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
}

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getAllAdmin: (params) => api.get('/users/all', { params }),
  getDetail: (id) => api.get(`/users/${id}`),
  getByFaculty: (facultyId) => api.get(`/users/faculty/${facultyId}`),
  add: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  changePassword: (id, data) => api.post(`/users/${id}/change-password`, data),
}

export const areaService = {
  getList: () => api.get('/areas'),
  getAll: () => api.get('/areas/all'),
  getDetail: (id) => api.get(`/areas/${id}`),
  add: (data) => api.post('/areas', data),
  update: (id, data) => api.put(`/areas/${id}`, data),
  delete: (id) => api.delete(`/areas/${id}`),
}

export const facultyService = {
  getList: () => api.get('/faculties'),
  getAll: () => api.get('/faculties/all'),
  getDetail: (id) => api.get(`/faculties/${id}`),
  add: (data) => api.post('/faculties', data),
  update: (id, data) => api.put(`/faculties/${id}`, data),
  delete: (id) => api.delete(`/faculties/${id}`),
}

export const reportService = {
  getChart: (params) => api.get('/reports/chart', { params }),
  getSummary: () => api.get('/reports/summary'),
  getRoomUsage: (params) => api.get('/reports/room-usage', { params }),
}

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const chatService = {
  sendMessage: (message, history = []) =>
    api.post('/chat/message', { message, history }),
  getHistory: (limit = 50) =>
    api.get('/chat/history', { params: { limit }, _silent: true }),
}

export const settingsService = {
  get: () => api.get('/settings', { _silent: true }),
  update: (data) => api.put('/settings', data),
}

export const equipmentAdminService = {
  getAll: (params) => api.get('/equipment', { params }),
  add: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
}

export const roleService = {
  getAll: () => api.get('/roles'),
  add: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
}

export const notificationService = {
  getMy: (limit = 20) => api.get('/notifications', { params: { limit }, _silent: true }),
  getUnreadCount: () => api.get('/notifications/unread-count', { _silent: true }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}
