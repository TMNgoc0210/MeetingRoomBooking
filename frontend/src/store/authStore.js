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
