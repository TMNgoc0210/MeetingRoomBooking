import { create } from 'zustand'
import api from '../services/api'

const DEFAULTS = {
  timeFormat:      '24h',
  slotMinutes:     '30',
  defaultDuration: '60',
  maxDuration:     '0',
  timezone:        'Asia/Ho_Chi_Minh',
  theme:           'dark',
  workdayStart:    '07:00',
  workdayEnd:      '21:00',
}

const useSettingsStore = create((set, get) => ({
  settings: { ...DEFAULTS },
  loaded: false,

  fetch: async () => {
    try {
      const res = await api.get('/settings', { _silent: true })
      const data = res.data.data || {}
      set({ settings: { ...DEFAULTS, ...data }, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async (updates) => {
    await api.put('/settings', updates)
    set(s => ({ settings: { ...s.settings, ...updates } }))
  },

  // helpers
  slotDuration: () => {
    const mins = parseInt(get().settings.slotMinutes) || 30
    const h = String(Math.floor(mins / 60)).padStart(2, '0')
    const m = String(mins % 60).padStart(2, '0')
    return `${h}:${m}:00`
  },

  hour12: () => get().settings.timeFormat === 'AM/PM',
}))

export default useSettingsStore
