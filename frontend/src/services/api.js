/**
 * services/api.js — Axios instance trung tâm
 * ────────────────────────────────────────────
 * Mọi request HTTP trong frontend đều đi qua file này (không gọi axios trực tiếp).
 *
 * Cấu hình:
 *   baseURL   = /api  (hoặc VITE_API_URL/api khi deploy tách frontend/backend)
 *   withCredentials = true  (để gửi cookie chứa refresh token)
 *
 * Request interceptor:
 *   Tự động đính kèm "Authorization: Bearer <accessToken>" vào mọi request
 *   (đọc token từ authStore Zustand)
 *
 * Response interceptor — Auto refresh token:
 *   Khi nhận lỗi 401 (token hết hạn):
 *     1. Gọi POST /api/auth/refresh (cookie refresh token được gửi tự động)
 *     2. Lưu access token mới vào authStore
 *     3. Retry request gốc với token mới — người dùng không thấy gián đoạn
 *
 * _retry flag   — tránh vòng lặp vô hạn khi refresh cũng thất bại
 * _silent flag  — request background (polling, prefetch) gắn { _silent: true }
 *                 để interceptor KHÔNG tự logout khi gặp 401
 */
import axios from 'axios'
import useAuthStore from '../store/authStore'

// Tạo axios instance với config mặc định
const api = axios.create({
  // Nếu có VITE_API_URL (deploy riêng frontend/backend) thì dùng URL đó
  // Nếu không → dùng /api (Nginx hoặc Express cùng server)
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true, // bắt buộc để trình duyệt gửi cookie refreshToken
})

// ─── Request interceptor — đính kèm access token ──────────────────────────
// Chạy trước MỌI request, tự động lấy token mới nhất từ Zustand store
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — tự động refresh token khi hết hạn ─────────────
api.interceptors.response.use(
  // Request thành công → trả thẳng về
  (response) => response,

  // Request thất bại → kiểm tra xem có phải 401 không
  async (error) => {
    const original = error.config // config của request gốc bị lỗi

    // _silent: request background (prefetch, polling) không cần auto-refresh
    // → tránh trường hợp nhiều request nền cùng trigger refresh
    if (original?._silent) return Promise.reject(error)

    // Chỉ xử lý lỗi 401 (Unauthorized) và chưa retry lần nào
    // _retry flag ngăn vòng lặp: nếu refresh cũng 401 thì không retry nữa
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // Gọi endpoint refresh — cookie refreshToken được trình duyệt tự đính kèm
        const baseURL = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/api`
          : '/api'
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const { accessToken } = res.data.data

        // Lưu access token mới vào Zustand (các request sau tự dùng token này)
        useAuthStore.getState().setAuth(useAuthStore.getState().user, accessToken)

        // Gắn token mới vào header của request gốc rồi gửi lại
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original) // retry request gốc → user không thấy gián đoạn

      } catch {
        // Refresh token cũng hết hạn hoặc không hợp lệ → buộc đăng xuất
        // Không reload trang — Zustand cập nhật state → React tự re-render UI
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
