import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Request interceptor — đính kèm access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — tự động refresh token khi hết hạn
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Bỏ qua nếu request đánh dấu silent (background polling, không redirect)
    if (original?._silent) return Promise.reject(error)

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { accessToken } = res.data.data
        useAuthStore.getState().setAuth(useAuthStore.getState().user, accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        // Token hết hạn hoàn toàn → logout, KHÔNG reload trang
        // React tự cập nhật UI qua Zustand state
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
