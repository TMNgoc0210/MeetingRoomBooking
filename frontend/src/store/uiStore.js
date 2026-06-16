/**
 * store/uiStore.js — State giao diện & modal (Zustand)
 * ──────────────────────────────────────────────────────
 * Quản lý trạng thái mở/đóng của tất cả modal trong app
 * và một số state UI dùng chung.
 * KHÔNG persist (reset mỗi lần reload — đúng hành vi mong muốn cho modal).
 *
 * Modal states (mỗi modal có open + dữ liệu kèm theo):
 *   bookingModal      — modal đặt phòng mới (kèm room object)
 *   editBookingModal  — modal sửa booking (kèm lineRoomID)
 *   detailModal       — modal xem chi tiết booking (kèm lineRoomID)
 *   roomModal         — modal thêm/sửa phòng (admin)
 *   userModal         — modal thêm/sửa user (admin)
 *   changePassModal   — modal đổi mật khẩu
 *   loginModal        — modal đăng nhập / đăng ký (gồm loginTab: 'login'|'register')
 *
 * UI state:
 *   theme             — 'dark'|'light', đồng bộ với localStorage
 *   refreshKey        — counter tăng khi cần force re-fetch data toàn cục
 *   triggerRefresh()  — gọi sau khi tạo/sửa/xoá booking để Calendar tự cập nhật
 */
import { create } from 'zustand'

const useUIStore = create((set) => ({
  // Theme
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),

  // Booking modal
  bookingModal: { open: false, room: null },
  openBookingModal: (room) => set({ bookingModal: { open: true, room } }),
  closeBookingModal: () => set({ bookingModal: { open: false, room: null } }),

  // Edit booking modal
  editBookingModal: { open: false, lineRoomID: null },
  openEditBookingModal: (lineRoomID) => set({ editBookingModal: { open: true, lineRoomID } }),
  closeEditBookingModal: () => set({ editBookingModal: { open: false, lineRoomID: null } }),

  // Booking detail modal
  detailModal: { open: false, lineRoomID: null },
  openDetailModal: (lineRoomID) => set({ detailModal: { open: true, lineRoomID } }),
  closeDetailModal: () => set({ detailModal: { open: false, lineRoomID: null } }),

  // Add/Edit room modal
  roomModal: { open: false, roomID: null },
  openRoomModal: (roomID = null) => set({ roomModal: { open: true, roomID } }),
  closeRoomModal: () => set({ roomModal: { open: false, roomID: null } }),

  // User modal
  userModal: { open: false, userID: null },
  openUserModal: (userID = null) => set({ userModal: { open: true, userID } }),
  closeUserModal: () => set({ userModal: { open: false, userID: null } }),

  // Change password modal
  changePassModal: false,
  openChangePassModal: () => set({ changePassModal: true }),
  closeChangePassModal: () => set({ changePassModal: false }),

  // Login / Register modal
  loginModal: false,
  loginTab: 'login',
  openLoginModal: (tab = 'login') => set({ loginModal: true, loginTab: tab }),
  openRegisterModal: () => set({ loginModal: true, loginTab: 'register' }),
  closeLoginModal: () => set({ loginModal: false, loginTab: 'login' }),

  // Policy modal
  policyModal: false,
  openPolicyModal: () => set({ policyModal: true }),
  closePolicyModal: () => set({ policyModal: false }),

  // Refresh triggers — dùng để force re-fetch data
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))

export default useUIStore
