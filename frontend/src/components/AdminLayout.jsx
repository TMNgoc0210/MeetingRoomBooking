import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useUIStore from '../store/uiStore'
import { authService } from '../services'
import toast from 'react-hot-toast'
import api from '../services/api'
import AdminChatbotWidget from './chat/AdminChatbotWidget'

const MENU = [
  { to: '/admin', end: true, icon: 'fa-chart-pie', label: 'Thống kê' },
  { to: '/admin/report', icon: 'fa-chart-bar', label: 'Báo cáo' },
  { to: '/admin/approvals', icon: 'fa-clipboard-check', label: 'Phê duyệt', badge: true },
  { to: '/admin/rooms', icon: 'fa-door-open', label: 'Quản lý phòng' },
  { to: '/admin/equipment', icon: 'fa-tools', label: 'Thiết bị' },
  { to: '/admin/areas', icon: 'fa-map-marker-alt', label: 'Khu vực' },
  { to: '/admin/faculties', icon: 'fa-graduation-cap', label: 'Khoa / Đơn vị' },
  { to: '/admin/users', icon: 'fa-users', label: 'Người dùng' },
  { to: '/admin/roles', icon: 'fa-user-tag', label: 'Vai trò' },
  { to: '/admin/settings', icon: 'fa-cog', label: 'Thiết lập chung' },
]

const AdminLayout = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { refreshKey } = useUIStore()
  const [pendingCount, setPendingCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    api.get('/bookings/pending', { _silent: true })
      .then(r => setPendingCount((r.data.data || []).length))
      .catch(() => setPendingCount(0))
  }, [refreshKey])

  const handleLogout = async () => {
    try { await authService.logout() } catch {}
    logout()
    navigate('/')
    toast.success('Đã đăng xuất')
  }

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // On mobile: sidebar shown as overlay when mobileOpen; collapsed has no effect
  const showSidebar = isMobile ? mobileOpen : true
  const effectiveCollapsed = isMobile ? false : collapsed
  const sidebarWidth = effectiveCollapsed ? 64 : 240

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', position: 'relative' }}>

      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarWidth,
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, transform 0.25s ease',
        overflow: 'hidden',
        // Mobile: fixed overlay
        ...(isMobile ? {
          position: 'fixed',
          top: 0, left: 0, height: '100vh',
          zIndex: 300,
          transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
          width: 260,
        } : {}),
      }}>

        {/* Brand */}
        <div style={{
          padding: effectiveCollapsed ? '1.25rem 0' : '1.25rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}>
          {!effectiveCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className="fa fa-building" style={{ color: '#1a1a1a', fontSize: '0.9rem' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2 }}>Quản Trị</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>Admin Panel</div>
              </div>
            </div>
          )}
          {effectiveCollapsed && (
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa fa-building" style={{ color: '#1a1a1a', fontSize: '0.9rem' }} />
            </div>
          )}
          <button
            onClick={() => isMobile ? closeMobile() : setCollapsed(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 4,
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <i className={`fa fa-${isMobile ? 'times' : (effectiveCollapsed ? 'chevron-right' : 'chevron-left')}`} style={{ fontSize: '0.75rem' }} />
          </button>
        </div>

        {/* Nav menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {MENU.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={isMobile ? closeMobile : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: effectiveCollapsed ? '0.7rem 0' : '0.7rem 1.25rem',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(201,169,110,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 0.15s',
                position: 'relative',
              })}
              onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.1')) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.1')) e.currentTarget.style.background = 'transparent' }}
            >
              <i className={`fa ${item.icon}`} style={{ fontSize: '0.9rem', width: 18, textAlign: 'center', flexShrink: 0 }} />
              {!effectiveCollapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && pendingCount > 0 && (
                    <span style={{
                      background: '#dc2626', color: '#fff',
                      borderRadius: 10, padding: '1px 7px',
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
              {effectiveCollapsed && item.badge && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 8, height: 8, borderRadius: '50%', background: '#dc2626',
                }} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: back to site + user info */}
        <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => { navigate('/'); isMobile && closeMobile() }}
            style={{
              width: '100%', padding: effectiveCollapsed ? '0.7rem 0' : '0.7rem 1.25rem',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              color: 'var(--text-muted)', fontSize: '0.875rem',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <i className="fa fa-arrow-left" style={{ fontSize: '0.85rem', width: 18, textAlign: 'center', flexShrink: 0 }} />
            {!effectiveCollapsed && <span>Về trang chủ</span>}
          </button>

          <div style={{
            padding: effectiveCollapsed ? '0.75rem 0' : '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            borderTop: '1px solid var(--border)',
          }}>
            <img
              src={user?.Avatar || '/uploads/images/nopic.png'}
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }}
              onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=A' }}
            />
            {!effectiveCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.FullName}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quản trị viên</div>
              </div>
            )}
            {!effectiveCollapsed && (
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4, borderRadius: 4,
                  flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <i className="fa fa-sign-out-alt" style={{ fontSize: '0.9rem' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
          }}>
            <button
              onClick={() => setMobileOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: '1.1rem', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <i className="fa fa-bars" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="fa fa-building" style={{ color: '#1a1a1a', fontSize: '0.8rem' }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>Admin Panel</span>
            </div>
          </div>
        )}
        <Outlet />
      </div>

      <AdminChatbotWidget />
    </div>
  )
}

export default AdminLayout
