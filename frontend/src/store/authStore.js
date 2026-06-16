/**
 * store/authStore.js — State đăng nhập (Zustand + persist)
 * ────────────────────────────────────────────────────────────
 * Lưu trữ thông tin người dùng đang đăng nhập và access token.
 * persist middleware tự động sync vào localStorage → không bị mất khi F5.
 *
 * State:
 *   user        — object thông tin user (UserID, FullName, Roles, Avatar...)
 *   accessToken — JWT access token (15 phút), dùng cho Authorization header
 *
 * Actions:
 *   setAuth(user, token) — gọi sau khi đăng nhập thành công
 *   logout()             — xoá state (interceptor gọi khi refresh token thất bại)
 *
 * Computed:
 *   isLoggedIn() — kiểm tra có token chưa
 *   isAdmin()    — user.Roles === 1
 *
 * Lý do dùng Zustand thay Redux: nhẹ hơn (~1KB), không cần boilerplate
 * action/reducer, persist middleware có sẵn, đủ cho quy mô project này.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: () => set({ user: null, accessToken: null }),

      isLoggedIn: () => !!get().accessToken,
      isAdmin: () => get().user?.Roles === 1,
    }),
    {
      name: 'meeting-auth',
      version: 2,
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
)

export default useAuthStore
