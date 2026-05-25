import { useState, useRef, useEffect, useCallback } from 'react'
import { chatService, bookingService } from '../../services'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const WELCOME = {
  role: 'bot',
  text: 'Xin chào Admin! Tôi có thể giúp bạn:\n• Xem & duyệt lịch chờ phê duyệt\n• Thêm phòng họp mới\n• Xem thống kê theo ngày/tuần/tháng\n• Tra cứu và quản lý lịch đặt\n\nHãy đặt câu hỏi hoặc chọn gợi ý bên dưới.',
}

const QUICK_REPLIES = [
  'Lịch chờ duyệt hôm nay',
  'Thống kê tuần này',
  'Danh sách tất cả phòng',
  'Thêm phòng mới',
]

const ACCENT = '#4f46e5'
const ACCENT2 = '#7c3aed'

// ─── Inline pending booking card ─────────────────────────────────────────────

const PendingBookingCard = ({ booking, onApproved }) => {
  const [loading, setLoading] = useState(null) // 'approve' | 'reject'
  const [done, setDone] = useState(null)        // 'approved' | 'rejected'
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const handleApprove = async () => {
    setLoading('approve')
    try {
      await bookingService.approve(booking.lineRoomID)
      setDone('approved')
      toast.success(`Đã duyệt: ${booking.title}`)
      onApproved?.()
    } catch {
      toast.error('Duyệt thất bại')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Nhập lý do từ chối'); return }
    setLoading('reject')
    try {
      await bookingService.reject(booking.lineRoomID, rejectReason)
      setDone('rejected')
      toast.success(`Đã từ chối: ${booking.title}`)
      onApproved?.()
    } catch {
      toast.error('Từ chối thất bại')
    } finally {
      setLoading(null)
    }
  }

  const cardBase = {
    background: 'var(--bg-hover)',
    border: `1px solid ${done ? (done === 'approved' ? '#166534' : '#7f1d1d') : 'var(--border)'}`,
    borderRadius: 10, padding: '0.75rem', fontSize: '0.8rem', marginBottom: 6,
  }

  if (done) {
    return (
      <div style={cardBase}>
        <span style={{ color: done === 'approved' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
          <i className={`fa fa-${done === 'approved' ? 'check' : 'times'}-circle`} style={{ marginRight: 5 }} />
          {done === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
        </span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{booking.title}</span>
      </div>
    )
  }

  return (
    <div style={cardBase}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
        #{booking.lineRoomID} · {booking.title}
      </div>
      <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span><i className="fa fa-door-open" style={{ width: 14, marginRight: 4, color: ACCENT }} />{booking.room}</span>
        <span><i className="fa fa-clock" style={{ width: 14, marginRight: 4, color: ACCENT }} />
          {dayjs(booking.timeStart).format('DD/MM HH:mm')} – {dayjs(booking.timeEnd).format('HH:mm')}
        </span>
        <span><i className="fa fa-user" style={{ width: 14, marginRight: 4, color: ACCENT }} />{booking.bookedBy || booking.userID}</span>
      </div>

      {showReject ? (
        <div style={{ marginTop: 8 }}>
          <input
            autoFocus
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReject()}
            style={{
              width: '100%', padding: '0.35rem 0.5rem', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
            <button
              onClick={handleReject}
              disabled={!!loading}
              style={{
                flex: 1, padding: '0.3rem', borderRadius: 6, border: 'none',
                background: '#7f1d1d', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              {loading === 'reject' ? '...' : 'Xác nhận từ chối'}
            </button>
            <button
              onClick={() => setShowReject(false)}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)',
                background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem',
              }}
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
          <button
            onClick={handleApprove}
            disabled={!!loading}
            style={{
              flex: 1, padding: '0.3rem', borderRadius: 6, border: 'none',
              background: '#166534', color: '#86efac', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            {loading === 'approve' ? '...' : '✓ Duyệt'}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={!!loading}
            style={{
              flex: 1, padding: '0.3rem', borderRadius: 6, border: '1px solid #7f1d1d',
              background: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            ✕ Từ chối
          </button>
        </div>
      )}
    </div>
  )
}

// ─── History panel ────────────────────────────────────────────────────────────

const HistoryPanel = ({ onReopen }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    chatService.getHistory(80)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = history.reduce((acc, row) => {
    const d = dayjs(row.CreateDate).format('DD/MM/YYYY')
    if (!acc[d]) acc[d] = []
    acc[d].push(row)
    return acc
  }, {})

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 22, height: 22, borderTopColor: ACCENT }} />
    </div>
  )

  if (history.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', padding: '2rem' }}>
      <i className="fa fa-history" style={{ fontSize: '2rem', opacity: 0.3 }} />
      <span style={{ fontSize: '0.85rem', textAlign: 'center' }}>Chưa có lịch sử hội thoại nào</span>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
      {Object.entries(grouped).map(([date, rows]) => (
        <div key={date}>
          <div style={{
            padding: '0.4rem 0.875rem', fontSize: '0.7rem', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1,
            background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)',
          }}>
            {date}
          </div>
          {rows.map(row => (
            <div
              key={row.LogID}
              style={{
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: expanded === row.LogID ? 'rgba(79,70,229,0.06)' : 'transparent',
                transition: 'background 0.12s',
              }}
              onClick={() => setExpanded(expanded === row.LogID ? null : row.LogID)}
              onMouseEnter={e => { if (expanded !== row.LogID) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (expanded !== row.LogID) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ padding: '0.6rem 0.875rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <i className="fa fa-user-circle" style={{ color: ACCENT, fontSize: '0.85rem', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.UserMessage}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {dayjs(row.CreateDate).format('HH:mm')}
                  </div>
                </div>
                <i className={`fa fa-chevron-${expanded === row.LogID ? 'up' : 'down'}`}
                  style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
              </div>

              {expanded === row.LogID && (
                <div style={{ padding: '0 0.875rem 0.75rem' }}>
                  <div style={{
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff',
                    borderRadius: '12px 12px 4px 12px', padding: '0.5rem 0.75rem',
                    fontSize: '0.82rem', marginBottom: 8, marginLeft: '1.5rem',
                    whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  }}>
                    {row.UserMessage}
                  </div>
                  {row.BotReply && (
                    <div style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: '4px 12px 12px 12px', padding: '0.5rem 0.75rem',
                      fontSize: '0.82rem', marginRight: '1.5rem',
                      whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)',
                    }}>
                      <i className="fa fa-robot" style={{ color: ACCENT, marginRight: 5, fontSize: '0.75rem' }} />
                      {row.BotReply}
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onReopen(row.UserMessage) }}
                    style={{
                      marginTop: 8, width: '100%', padding: '0.35rem',
                      background: 'none', border: `1px solid ${ACCENT}44`, borderRadius: 8,
                      cursor: 'pointer', fontSize: '0.75rem', color: '#818cf8', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}22` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <i className="fa fa-redo" style={{ marginRight: 5 }} />Hỏi lại câu này
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

const AdminChatbotWidget = () => {
  const { user } = useAuthStore()
  const { triggerRefresh } = useUIStore()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('chat')
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading, tab])

  const send = useCallback(async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : input).trim()
    if (!text || !user) return

    setTab('chat')
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const res = await chatService.sendMessage(text)
      const { reply, isBookingSuccess, pendingData } = res.data.data
      setMessages(prev => [...prev, {
        role: 'bot',
        text: reply,
        pendingData: pendingData?.length ? pendingData : null,
      }])
      if (isBookingSuccess) {
        triggerRefresh()
        toast.success('Đặt phòng thành công qua AI!')
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: err.response?.data?.message || 'Xin lỗi, AI đang gặp sự cố. Vui lòng thử lại.',
      }])
    } finally {
      setLoading(false)
    }
  }, [input, user, triggerRefresh])

  const handleReopen = useCallback((text) => {
    setTab('chat')
    send(text)
  }, [send])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Trợ lý ảo Admin"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#374151' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', boxShadow: '0 4px 16px rgba(79,70,229,0.45)',
          zIndex: 1200, transition: 'all 0.2s ease',
        }}
      >
        {open ? <i className="fa fa-times" /> : <img src="/chatbot-avatar.png" alt="bot" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%' }} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem',
          width: 370, height: 540,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          zIndex: 1200, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem', flexShrink: 0,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src="/chatbot-avatar.png" alt="bot" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                  Trợ lý ảo Admin
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>● Trực tuyến</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {messages.length > 1 && (
                <button
                  title="Cuộc hội thoại mới"
                  onClick={() => setMessages([WELCOME])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '4px 6px', borderRadius: 6, fontSize: '0.85rem' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                >
                  <i className="fa fa-plus-circle" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '1rem', padding: 4 }}
              >
                <i className="fa fa-times" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            {[
              { key: 'chat', icon: 'fa-comment-dots', label: 'Trò chuyện' },
              { key: 'history', icon: 'fa-history', label: 'Lịch sử' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer',
                  background: 'none', fontSize: '0.78rem', fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? ACCENT : 'var(--text-muted)',
                  borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all 0.12s',
                }}
              >
                <i className={`fa ${t.icon}`} />{t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {tab === 'history' ? (
            <HistoryPanel onReopen={handleReopen} />
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      padding: '0.2rem 0.75rem',
                    }}>
                      <div style={{
                        maxWidth: '84%',
                        background: msg.role === 'user'
                          ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`
                          : 'var(--bg-hover)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '0.55rem 0.85rem', fontSize: '0.85rem',
                        lineHeight: 1.5, whiteSpace: 'pre-wrap',
                        border: msg.role === 'bot' ? '1px solid var(--border)' : 'none',
                      }}>
                        {msg.text}
                      </div>
                    </div>

                    {/* Inline pending booking action cards */}
                    {msg.role === 'bot' && msg.pendingData?.length > 0 && (
                      <div style={{ padding: '0.25rem 0.75rem' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                          <i className="fa fa-bell" style={{ marginRight: 4, color: '#f59e0b' }} />
                          {msg.pendingData.length} lịch chờ duyệt — duyệt ngay tại đây:
                        </div>
                        {msg.pendingData.map(b => (
                          <PendingBookingCard key={b.lineRoomID} booking={b} onApproved={triggerRefresh} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={{ padding: '0.2rem 0.75rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: '14px 14px 14px 4px', padding: '0.55rem 0.85rem',
                    }}>
                      <div className="thinking-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick replies */}
              {messages.length === 1 && (
                <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  {QUICK_REPLIES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => send(t)}
                      style={{
                        textAlign: 'left', fontSize: '0.8rem', borderRadius: 20,
                        padding: '0.3rem 0.875rem', cursor: 'pointer',
                        background: 'transparent', border: `1px solid ${ACCENT}66`,
                        color: '#818cf8', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#818cf8' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{
                display: 'flex', gap: 8, padding: '0.75rem',
                borderTop: '1px solid var(--border)', alignItems: 'flex-end', flexShrink: 0,
              }}>
                <textarea
                  rows={1}
                  placeholder="Nhập câu hỏi... (Enter để gửi)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  style={{
                    flex: 1, resize: 'none', borderRadius: 10,
                    border: '1px solid var(--border)', padding: '0.5rem 0.75rem',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                    fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: loading || !input.trim()
                      ? 'var(--bg-hover)'
                      : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                    color: loading || !input.trim() ? 'var(--text-muted)' : '#fff',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="fa fa-paper-plane" style={{ fontSize: '0.85rem' }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default AdminChatbotWidget
