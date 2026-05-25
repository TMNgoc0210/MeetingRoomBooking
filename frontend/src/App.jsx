import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import Navbar from './components/Navbar'
import LoginModal from './components/modals/LoginModal'
import ChangePasswordModal from './components/modals/ChangePasswordModal'
import BookingModal from './components/modals/BookingModal'
import EditBookingModal from './components/modals/EditBookingModal'
import BookingDetailModal from './components/modals/BookingDetailModal'
import UserModal from './components/modals/UserModal'
import ChatbotWidget from './components/chat/ChatbotWidget'
import useUIStore from './store/uiStore'
import useSettingsStore from './store/settingsStore'

const App = () => {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const theme = useUIStore(s => s.theme)
  const fetchSettings = useSettingsStore(s => s.fetch)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => { fetchSettings() }, [])

  return (
    <>
      {!isAdmin && <Navbar />}
      <AppRouter />

      {/* Global Modals */}
      <LoginModal />
      <ChangePasswordModal />
      <BookingModal />
      <EditBookingModal />
      <BookingDetailModal />
      <UserModal />

      {/* AI Chatbot — chỉ hiện trên trang user */}
      {!isAdmin && <ChatbotWidget />}
    </>
  )
}

export default App
