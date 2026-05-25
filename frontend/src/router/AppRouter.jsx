import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import Home from '../pages/Home'
import BookDetail from '../pages/BookDetail'
import CalendarView from '../pages/CalendarView'
import Report from '../pages/Report'
import AdminLayout from '../components/AdminLayout'
import AdminDashboard from '../pages/admin/Dashboard'
import AdminRooms from '../pages/admin/Rooms'
import AdminUsers from '../pages/admin/Users'
import AdminAreas from '../pages/admin/Areas'
import AdminFaculties from '../pages/admin/Faculties'
import Approvals from '../pages/admin/Approvals'
import AdminEquipment from '../pages/admin/Equipment'
import AdminSettings from '../pages/admin/Settings'
import AdminRoles from '../pages/admin/Roles'

const AdminRoute = ({ children }) => {
  const admin = useAuthStore(s => s.user?.Roles === 1)
  return admin ? children : <Navigate to="/" replace />
}

const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/book-detail/:id" element={<BookDetail />} />
      <Route path="/report" element={<Report />} />

      {/* Admin routes — wrapped in AdminLayout + AdminRoute guard */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="areas" element={<AdminAreas />} />
        <Route path="faculties" element={<AdminFaculties />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="equipment" element={<AdminEquipment />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Legacy redirects — giữ backward compat nếu có link cũ */}
      <Route path="/approvals" element={<Navigate to="/admin/approvals" replace />} />
      <Route path="/list-room" element={<Navigate to="/admin/rooms" replace />} />
      <Route path="/list-area" element={<Navigate to="/admin/areas" replace />} />
      <Route path="/list-faculty" element={<Navigate to="/admin/faculties" replace />} />
      <Route path="/list-user" element={<Navigate to="/admin/users" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
