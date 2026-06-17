import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationService } from '../services'

const TYPE_ICON = {
  booking:  { icon: 'fa-calendar-plus',  color: '#3b82f6' },
  pending:  { icon: 'fa-hourglass-half', color: '#f59e0b' },
  approved: { icon: 'fa-check-circle',   color: '#16a34a' },
  rejected: { icon: 'fa-times-circle',   color: '#dc2626' },
  cancelled:{ icon: 'fa-ban',            color: '#6b7280' },
  reminder: { icon: 'fa-clock',          color: '#c9a96e' },
}

const timeAgo = (createDate) => {
  if (!createDate) return ''
  const diffMs = Date.now() - new Date(createDate.replace(' ', 'T')).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  return `${Math.floor(hr / 24)} ngày trước`
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  const fetchUnread = () => {
    notificationService.getUnreadCount()
      .then(r => setUnread(r.data.data?.count || 0))
      .catch(() => {})
  }

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      notificationService.getMy(20)
        .then(r => setItems(r.data.data || []))
        .catch(() => {})
    }
  }

  const handleItemClick = (item) => {
    if (!item.IsRead) {
      notificationService.markRead(item.NotificationID).catch(() => {})
      setItems(prev => prev.map(i => i.NotificationID === item.NotificationID ? { ...i, IsRead: 1 } : i))
      setUnread(prev => Math.max(0, prev - 1))
    }
    if (item.LineRoomID) navigate('/calendar')
    setOpen(false)
  }

  const handleMarkAllRead = () => {
    notificationService.markAllRead().catch(() => {})
    setItems(prev => prev.map(i => ({ ...i, IsRead: 1 })))
    setUnread(0)
  }

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-btn" onClick={toggleOpen} style={{ position: 'relative', padding: '0.5rem 0.6rem' }} title="Thông báo">
        <i className="fa fa-bell" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#dc2626', color: '#fff', borderRadius: 10,
            padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.4,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu" style={{ width: 320, maxHeight: 420, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Thông báo</strong>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', cursor: 'pointer' }}>
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Không có thông báo nào
            </div>
          ) : (
            items.map((item) => {
              const meta = TYPE_ICON[item.Type] || TYPE_ICON.booking
              return (
                <button
                  key={item.NotificationID}
                  className="dropdown-item"
                  onClick={() => handleItemClick(item)}
                  style={{ alignItems: 'flex-start', background: item.IsRead ? 'none' : 'rgba(201, 169, 110, 0.08)' }}
                >
                  <i className={`fa ${meta.icon}`} style={{ width: 16, color: meta.color, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ whiteSpace: 'normal', lineHeight: 1.4, color: 'var(--text-primary)' }}>{item.Message}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{timeAgo(item.CreateDate)}</div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
