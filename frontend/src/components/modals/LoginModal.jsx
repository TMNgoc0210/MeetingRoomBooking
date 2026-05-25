import { useState, useEffect } from 'react'
import { authService, facultyService } from '../../services'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import toast from 'react-hot-toast'

const EyeIcon = ({ show, onToggle }) => (
  <button type="button" onClick={onToggle} tabIndex={-1}
    style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
    <i className={`fa ${show ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.88rem' }} />
  </button>
)

const Field = ({ label, required, icon, hint, error, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: 0.2 }}>
      {label}{required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
    </label>
    <div style={{ position: 'relative' }}>
      {icon && <i className={`fa ${icon}`} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', pointerEvents: 'none' }} />}
      {children}
    </div>
    {hint && !error && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    {error && <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 4 }}><i className="fa fa-exclamation-circle" style={{ marginRight: 4 }} />{error}</div>}
  </div>
)

const inputStyle = (withIcon) => ({
  width: '100%', padding: `0.55rem 0.75rem 0.55rem ${withIcon ? '34px' : '0.75rem'}`,
  border: '1.5px solid var(--border)', borderRadius: 10,
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
})

const LoginModal = () => {
  const { loginModal, loginTab, closeLoginModal } = useUIStore()
  const { setAuth } = useAuthStore()
  const [tab, setTab] = useState('login')
  const [faculties, setFaculties] = useState([])

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  const [regForm, setRegForm] = useState({
    username: '', fullName: '', email: '', mobi: '', facultyID: '', password: '', confirmPassword: '',
  })
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [showRegConfirm, setShowRegConfirm] = useState(false)
  const [regLoading, setRegLoading] = useState(false)

  useEffect(() => {
    if (loginModal) {
      setTab(loginTab)
      facultyService.getList().then(r => setFaculties(r.data.data || [])).catch(() => {})
    }
  }, [loginModal, loginTab])

  if (!loginModal) return null

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginForm.username.trim()) { toast.error('Vui lòng nhập tên đăng nhập'); return }
    if (!loginForm.password) { toast.error('Vui lòng nhập mật khẩu'); return }
    setLoginLoading(true)
    try {
      const res = await authService.login(loginForm.username, loginForm.password)
      const { user, accessToken } = res.data.data
      setAuth(user, accessToken)
      closeLoginModal()
      setLoginForm({ username: '', password: '' })
      toast.success(`Chào mừng, ${user.FullName}!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regForm.username.trim()) { toast.error('Vui lòng nhập tên đăng nhập'); return }
    if (!regForm.fullName.trim()) { toast.error('Vui lòng nhập họ và tên'); return }
    if (!regForm.password) { toast.error('Vui lòng nhập mật khẩu'); return }
    if (regForm.password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return }
    if (regForm.password !== regForm.confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return }
    setRegLoading(true)
    try {
      await authService.register(regForm)
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.')
      setRegForm({ username: '', fullName: '', email: '', mobi: '', facultyID: '', password: '', confirmPassword: '' })
      setTab('login')
      setLoginForm(f => ({ ...f, username: regForm.username }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setRegLoading(false)
    }
  }

  const pwdMismatch = regForm.confirmPassword && regForm.password !== regForm.confirmPassword

  return (
    <div className="modal-overlay" onClick={closeLoginModal}>
      <div onClick={e => e.stopPropagation()} style={{
        display: 'flex', borderRadius: 18, overflow: 'hidden',
        width: tab === 'register' ? 640 : 520,
        maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--bg-secondary)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        transition: 'width 0.3s ease',
      }}>

        {/* ── Left branding panel ── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'linear-gradient(160deg, #c9a96e 0%, #7a5a1e 55%, #3d2c0a 100%)',
          padding: '2rem 1.5rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: 80, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ position: 'relative' }}>
            {/* Logo */}
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <i className="fa fa-building" style={{ color: '#fff', fontSize: '1.3rem' }} />
            </div>

            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3, marginBottom: 6 }}>
              Meeting<br />Booking
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', lineHeight: 1.5 }}>
              Hệ thống đặt phòng họp thông minh
            </div>
          </div>

          {/* Feature bullets */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'fa-calendar-check', text: 'Đặt phòng nhanh chóng' },
              { icon: 'fa-robot', text: 'AI Chatbot hỗ trợ 24/7' },
              { icon: 'fa-chart-bar', text: 'Báo cáo thống kê' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`fa ${f.icon}`} style={{ color: '#fff', fontSize: '0.72rem' }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '1.5rem 1.75rem 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                {tab === 'login' ? 'Chào mừng trở lại 👋' : 'Tạo tài khoản mới'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tab === 'login' ? 'Đăng nhập để tiếp tục sử dụng hệ thống' : 'Điền thông tin bên dưới để bắt đầu'}
              </div>
            </div>
            <button className="modal-close" onClick={closeLoginModal} style={{ flexShrink: 0, marginTop: 2 }}>
              <i className="fa fa-times" />
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{ padding: '1rem 1.75rem 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: 10, padding: 3 }}>
              {[
                { key: 'login', label: 'Đăng nhập', icon: 'fa-sign-in-alt' },
                { key: 'register', label: 'Đăng ký', icon: 'fa-user-plus' },
              ].map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '0.45rem 0.75rem', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontWeight: tab === t.key ? 700 : 400, fontSize: '0.82rem',
                  background: tab === t.key ? 'var(--accent)' : 'transparent',
                  color: tab === t.key ? '#0f0f0f' : 'var(--text-muted)',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <i className={`fa ${t.icon}`} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem 0' }}>

            {/* ── Login form ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <Field label="Tên đăng nhập" required icon="fa-user">
                  <input className="form-control" style={{ ...inputStyle(true) }}
                    placeholder="Nhập tên đăng nhập..."
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    autoComplete="username" autoFocus
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </Field>

                <Field label="Mật khẩu" required icon="fa-lock">
                  <input type={showLoginPwd ? 'text' : 'password'} className="form-control"
                    style={{ ...inputStyle(true), paddingRight: 36 }}
                    placeholder="Nhập mật khẩu..."
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    autoComplete="current-password"
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <EyeIcon show={showLoginPwd} onToggle={() => setShowLoginPwd(v => !v)} />
                </Field>

                <button type="submit" disabled={loginLoading}
                  style={{
                    width: '100%', padding: '0.65rem', border: 'none', borderRadius: 10, cursor: loginLoading ? 'not-allowed' : 'pointer',
                    background: loginLoading ? 'var(--bg-hover)' : 'var(--accent)',
                    color: loginLoading ? 'var(--text-muted)' : '#0f0f0f',
                    fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s', marginBottom: '1rem',
                  }}>
                  {loginLoading
                    ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, borderTopColor: 'var(--text-muted)' }} />Đang đăng nhập...</>
                    : <><i className="fa fa-sign-in-alt" />Đăng nhập</>}
                </button>
              </form>
            )}

            {/* ── Register form ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <Field label="Tên đăng nhập" required icon="fa-at"
                    hint="Chữ, số, dấu chấm, gạch dưới">
                    <input className="form-control" style={{ ...inputStyle(true) }}
                      placeholder="vd: nguyen.van.a"
                      value={regForm.username}
                      onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                      autoFocus
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </Field>
                  <Field label="Họ và tên" required icon="fa-user">
                    <input className="form-control" style={{ ...inputStyle(true) }}
                      placeholder="Nguyễn Văn A"
                      value={regForm.fullName}
                      onChange={e => setRegForm({ ...regForm, fullName: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <Field label="Email" icon="fa-envelope">
                    <input type="email" className="form-control" style={{ ...inputStyle(true) }}
                      placeholder="email@example.com"
                      value={regForm.email}
                      onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </Field>
                  <Field label="Số điện thoại" icon="fa-phone">
                    <input type="tel" className="form-control" style={{ ...inputStyle(true) }}
                      placeholder="0901..."
                      value={regForm.mobi}
                      onChange={e => setRegForm({ ...regForm, mobi: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </Field>
                </div>

                <Field label="Khoa / Đơn vị" icon="fa-sitemap">
                  <select className="form-control" style={{ ...inputStyle(true) }}
                    value={regForm.facultyID}
                    onChange={e => setRegForm({ ...regForm, facultyID: e.target.value })}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  >
                    <option value="">-- Chọn khoa (không bắt buộc) --</option>
                    {faculties.map(f => <option key={f.FacultyID} value={f.FacultyID}>{f.FacultyName}</option>)}
                  </select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <Field label="Mật khẩu" required icon="fa-lock" hint="Ít nhất 6 ký tự">
                    <input type={showRegPwd ? 'text' : 'password'} className="form-control"
                      style={{ ...inputStyle(true), paddingRight: 36 }}
                      placeholder="••••••"
                      value={regForm.password}
                      onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <EyeIcon show={showRegPwd} onToggle={() => setShowRegPwd(v => !v)} />
                  </Field>
                  <Field label="Xác nhận mật khẩu" required icon="fa-lock"
                    error={pwdMismatch ? 'Mật khẩu không khớp' : null}>
                    <input type={showRegConfirm ? 'text' : 'password'} className="form-control"
                      style={{ ...inputStyle(true), paddingRight: 36, borderColor: pwdMismatch ? '#f87171' : undefined }}
                      placeholder="••••••"
                      value={regForm.confirmPassword}
                      onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                      onFocus={e => e.target.style.borderColor = pwdMismatch ? '#f87171' : 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = pwdMismatch ? '#f87171' : 'var(--border)'}
                    />
                    <EyeIcon show={showRegConfirm} onToggle={() => setShowRegConfirm(v => !v)} />
                  </Field>
                </div>

                <button type="submit" disabled={regLoading}
                  style={{
                    width: '100%', padding: '0.65rem', border: 'none', borderRadius: 10, cursor: regLoading ? 'not-allowed' : 'pointer',
                    background: regLoading ? 'var(--bg-hover)' : 'var(--accent)',
                    color: regLoading ? 'var(--text-muted)' : '#0f0f0f',
                    fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s', marginBottom: '1rem',
                  }}>
                  {regLoading
                    ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2, borderTopColor: 'var(--text-muted)' }} />Đang tạo tài khoản...</>
                    : <><i className="fa fa-user-plus" />Tạo tài khoản</>}
                </button>
              </form>
            )}
          </div>

          {/* Footer switch link */}
          <div style={{ padding: '0.75rem 1.75rem 1.25rem', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {tab === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
            </div>
            <button type="button" onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              style={{
                marginTop: 8, background: 'none', border: '1.5px solid var(--accent)', borderRadius: 8,
                cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, padding: '0.4rem 1.5rem',
                fontSize: '0.82rem', transition: 'all 0.2s', width: '100%',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#0f0f0f' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent)' }}
            >
              {tab === 'login' ? 'Đăng ký tài khoản mới' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
