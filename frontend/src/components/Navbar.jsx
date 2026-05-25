import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUIStore from '../store/uiStore'
import { authService } from '../services'
import toast from 'react-hot-toast'

const PendingBadge = () => {
  const [count, setCount] = useState(0)
  const { refreshKey } = useUIStore()
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    if (!accessToken) return
    // _silent: true → interceptor KHÔNG redirect khi 401, tránh reload loop
    import('../services/api').then(({ default: api }) => {
      api.get('/bookings/pending', { _silent: true })
        .then(r => setCount((r.data.data || []).length))
        .catch(() => setCount(0))
    })
  }, [refreshKey, accessToken])

  if (count === 0) return null
  return (
    <span style={{ marginLeft: 5, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
      {count}
    </span>
  )
}

const Navbar = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const admin = useAuthStore(s => s.user?.Roles === 1)
  const { openLoginModal, openRegisterModal, openChangePassModal, openUserModal, theme, toggleTheme } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {}
    logout()
    setDropdownOpen(false)
    navigate('/')
    toast.success('Đã đăng xuất')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <i className="fa fa-building" style={{ fontSize: '1.4rem' }} />
          <span>Meeting Booking</span>
        </div>

        {/* Nav links */}
        <ul className="navbar-nav">
          <li>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Trang chủ
            </NavLink>
          </li>
          <li>
            <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <i className="fa fa-calendar-alt" style={{ marginRight: 4 }} />Lịch phòng
            </NavLink>
          </li>
          {user && (
            <li>
              <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Thống kê
              </NavLink>
            </li>
          )}
          {admin && (
            <li>
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <i className="fa fa-shield-alt" style={{ marginRight: 4 }} />Quản trị
                <PendingBadge />
              </NavLink>
            </li>
          )}
        </ul>

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <div className="user-menu" ref={dropRef}>
              <button className="user-btn" onClick={() => setDropdownOpen((v) => !v)}>
                <img
                  src={user.Avatar || '/uploads/images/nopic.png'}
                  alt="avatar"
                  className="user-avatar"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
                />
                <span>{user.FullName}</span>
                <i className={`fa fa-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }} />
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { openUserModal(user.UserID); setDropdownOpen(false) }}>
                    <i className="fa fa-user" style={{ width: 16 }} /> Cá nhân
                  </button>
                  <button className="dropdown-item" onClick={() => { openChangePassModal(); setDropdownOpen(false) }}>
                    <i className="fa fa-key" style={{ width: 16 }} /> Đổi mật khẩu
                  </button>
                  <button className="dropdown-item" onClick={toggleTheme}>
                    <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} style={{ width: 16 }} />
                    {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <i className="fa fa-sign-out-alt" style={{ width: 16 }} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--accent)', fontSize: '0.9rem',
                }}
              >
                <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
              </button>
              <button className="btn btn-secondary btn-sm" onClick={openRegisterModal}>
                <i className="fa fa-user-plus" /> Đăng ký
              </button>
              <button className="btn btn-primary btn-sm" onClick={openLoginModal}>
                <i className="fa fa-sign-in-alt" /> Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
