import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUIStore from '../store/uiStore'
import { authService } from '../services'
import NotificationBell from './NotificationBell'
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
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

  const handleLogout = () => {
    setDropdownOpen(false)
    setMobileMenuOpen(false)
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    try { await authService.logout() } catch {}
    logout()
    navigate('/')
    toast.success('Đã đăng xuất')
  }

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <>
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => { navigate('/'); closeMobile() }}>
          <img src="/logo.png" alt="logo" />
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
            <>
              {/* Dropdown avatar + tên user (Cá nhân / Đổi mật khẩu / theme / Đăng xuất) */}
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
              {/* Chuông thông báo — đặt ngay sau avatar (bên phải) theo yêu cầu thiết kế */}
              <NotificationBell />
            </>
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

    {showLogoutConfirm && (
      <div
        onClick={() => setShowLogoutConfirm(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '90%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)', textAlign: 'center',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(220,38,38,0.12)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa fa-sign-out-alt" style={{ color: '#dc2626', fontSize: 22 }} />
          </div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
            Đăng xuất
          </h3>
          <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn đăng xuất không?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-hover)', color: 'var(--text-primary)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              }}
            >
              Huỷ
            </button>
            <button
              onClick={confirmLogout}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: '#dc2626', color: '#fff',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default Navbar
