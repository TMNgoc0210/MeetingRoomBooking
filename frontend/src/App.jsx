import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoginModal from './components/modals/LoginModal'
import ChangePasswordModal from './components/modals/ChangePasswordModal'
import BookingModal from './components/modals/BookingModal'
import EditBookingModal from './components/modals/EditBookingModal'
import BookingDetailModal from './components/modals/BookingDetailModal'
import UserModal from './components/modals/UserModal'
import ChatbotWidget from './components/chat/ChatbotWidget'
import AdminChatbotWidget from './components/chat/AdminChatbotWidget'
import useUIStore from './store/uiStore'
import useSettingsStore from './store/settingsStore'
import useAuthStore from './store/authStore'

const App = () => {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const isAdminUser = useAuthStore(s => s.isAdmin())
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
      {!isAdmin && <Footer />}

      {/* Global Modals */}
      <LoginModal />
      <ChangePasswordModal />
      <BookingModal />
      <EditBookingModal />
      <BookingDetailModal />
      <UserModal />

      {/* AI Chatbot — admin dùng AdminChatbotWidget ở mọi trang */}
      {!isAdmin && (isAdminUser ? <AdminChatbotWidget /> : <ChatbotWidget />)}
    </>
  )
}

export default App
