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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropRef = useRef(null)
  const mobileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [navigate])

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {}
    logout()
    setDropdownOpen(false)
    setMobileMenuOpen(false)
    navigate('/')
    toast.success('Đã đăng xuất')
  }

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => { navigate('/'); closeMobile() }}>
          <img src="/logo.png" alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span>Meeting Booking</span>
        </div>

        {/* Desktop Nav links */}
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

        {/* Right side — desktop */}
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
                <span className="navbar-username">{user.FullName}</span>
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
                className="theme-toggle-btn"
              >
                <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
              </button>
              <button className="btn btn-secondary btn-sm navbar-auth-btn" onClick={openRegisterModal}>
                <i className="fa fa-user-plus" /> <span>Đăng ký</span>
              </button>
              <button className="btn btn-primary btn-sm navbar-auth-btn" onClick={openLoginModal}>
                <i className="fa fa-sign-in-alt" /> <span>Đăng nhập</span>
              </button>
            </div>
          )}

          {/* Hamburger button — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <i className={`fa ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav" ref={mobileRef}>
          <NavLink to="/" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
            <i className="fa fa-home" /> Trang chủ
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
            <i className="fa fa-calendar-alt" /> Lịch phòng
          </NavLink>
          {user && (
            <NavLink to="/report" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <i className="fa fa-chart-bar" /> Thống kê
            </NavLink>
          )}
          {admin && (
            <NavLink to="/admin" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <i className="fa fa-shield-alt" /> Quản trị <PendingBadge />
            </NavLink>
          )}
          <div className="mobile-nav-divider" />
          {user ? (
            <>
              <button className="mobile-nav-link" onClick={() => { openUserModal(user.UserID); closeMobile() }}>
                <i className="fa fa-user" /> Cá nhân
              </button>
              <button className="mobile-nav-link" onClick={() => { openChangePassModal(); closeMobile() }}>
                <i className="fa fa-key" /> Đổi mật khẩu
              </button>
              <button className="mobile-nav-link" onClick={() => { toggleTheme(); closeMobile() }}>
                <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
                {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
              </button>
              <button className="mobile-nav-link danger" onClick={handleLogout}>
                <i className="fa fa-sign-out-alt" /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button className="mobile-nav-link" onClick={() => { toggleTheme(); closeMobile() }}>
                <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
                {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
              </button>
              <button className="mobile-nav-link" onClick={() => { openRegisterModal(); closeMobile() }}>
                <i className="fa fa-user-plus" /> Đăng ký
              </button>
              <button className="mobile-nav-link accent" onClick={() => { openLoginModal(); closeMobile() }}>
                <i className="fa fa-sign-in-alt" /> Đăng nhập
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
