import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatService, roomService } from '../../services'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const WELCOME = {
  role: 'bot',
  text: 'Xin chào! Tôi có thể giúp bạn tìm và đặt phòng họp.\nHãy nói yêu cầu, ví dụ: "Tìm phòng 10 người lúc 2h chiều mai"',
}

const QUICK_REPLIES = [
  'Tìm phòng họp 8 người chiều nay',
  'Có phòng nào trống sáng mai không?',
  'Đặt phòng 5 người lúc 9h ngày mai',
]

// ─── Tab: Lịch sử ───────────────────────────────────────────────────────────

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

  // Group by date
  const grouped = history.reduce((acc, row) => {
    const d = dayjs(row.CreateDate).format('DD/MM/YYYY')
    if (!acc[d]) acc[d] = []
    acc[d].push(row)
    return acc
  }, {})

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ width: 22, height: 22 }} />
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
          {/* Date divider */}
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
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: expanded === row.LogID ? 'rgba(201,169,110,0.06)' : 'transparent',
                transition: 'background 0.12s',
              }}
              onClick={() => setExpanded(expanded === row.LogID ? null : row.LogID)}
              onMouseEnter={e => { if (expanded !== row.LogID) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (expanded !== row.LogID) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Collapsed: show user message + time */}
              <div style={{ padding: '0.6rem 0.875rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <i className="fa fa-user-circle" style={{ color: 'var(--accent)', fontSize: '0.85rem', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {row.UserMessage}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {dayjs(row.CreateDate).format('HH:mm')}
                  </div>
                </div>
                <i className={`fa fa-chevron-${expanded === row.LogID ? 'up' : 'down'}`}
                  style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
              </div>

              {/* Expanded: full Q&A */}
              {expanded === row.LogID && (
                <div style={{ padding: '0 0.875rem 0.75rem' }}>
                  {/* User bubble */}
                  <div style={{
                    background: 'var(--accent)', color: '#1a1a1a',
                    borderRadius: '12px 12px 4px 12px',
                    padding: '0.5rem 0.75rem', fontSize: '0.82rem',
                    marginBottom: 8, marginLeft: '1.5rem',
                    whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  }}>
                    {row.UserMessage}
                  </div>
                  {/* Bot bubble */}
                  {row.BotReply && (
                    <div style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: '4px 12px 12px 12px',
                      padding: '0.5rem 0.75rem', fontSize: '0.82rem',
                      marginRight: '1.5rem',
                      whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)',
                    }}>
                      <i className="fa fa-robot" style={{ color: 'var(--accent)', marginRight: 5, fontSize: '0.75rem' }} />
                      {row.BotReply}
                    </div>
                  )}
                  {/* Reopen conversation button */}
                  <button
                    onClick={e => { e.stopPropagation(); onReopen(row.UserMessage) }}
                    style={{
                      marginTop: 8, width: '100%', padding: '0.35rem',
                      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                      cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
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

// ─── Main Widget ─────────────────────────────────────────────────────────────

const ChatbotWidget = () => {
  const { user } = useAuthStore()
  const { openLoginModal, openBookingModal, triggerRefresh } = useUIStore()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('chat') // 'chat' | 'history'
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading, tab])

  const handleBotBookRoom = useCallback(async (roomID) => {
    if (!user) { openLoginModal(); return }
    try {
      const res = await roomService.getDetail(roomID)
      openBookingModal(res.data.data)
    } catch {
      toast.error('Không thể tải thông tin phòng')
    }
  }, [user, openLoginModal, openBookingModal])

  const handleViewRoom = useCallback((roomID) => {
    navigate(`/book-detail/${roomID}`)
    setOpen(false)
  }, [navigate])

  const send = useCallback(async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : input).trim()
    if (!text) return
    if (!user) {
      toast.error('Vui lòng đăng nhập để sử dụng chatbot')
      openLoginModal()
      return
    }

    setTab('chat')
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const res = await chatService.sendMessage(text)
      const { reply, isBookingSuccess, bookingData } = res.data.data
      setMessages(prev => [...prev, { role: 'bot', text: reply, bookingData: isBookingSuccess ? bookingData : null }])
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
  }, [input, user, openLoginModal, triggerRefresh])

  // "Hỏi lại" từ history — switch sang chat tab và send
  const handleReopen = useCallback((text) => {
    setTab('chat')
    send(text)
  }, [send])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const parseRooms = (botMsg) => {
    if (!botMsg.bookingData) return null
    const d = botMsg.bookingData
    if (d.lineRoomID) return <BookingSuccessCard data={d} onView={handleViewRoom} />
    if (d.status === 'available' && d.rooms) return <RoomSuggestCards rooms={d.rooms} onBook={handleBotBookRoom} onView={handleViewRoom} />
    return null
  }

  return (
    <>
      <button className="chatbot-fab" onClick={() => setOpen(v => !v)} title="AI Chatbot">
        {open ? <i className="fa fa-times" /> : <img src="/chatbot-avatar.png" alt="bot" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
      </button>

      {open && (
        <div className="chatbot-window" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar"><img src="/chatbot-avatar.png" alt="bot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
              <div>
                <div className="chat-name">AI Booking Assistant</div>
                <div className="chat-status">● Trực tuyến</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* New chat button */}
              {messages.length > 1 && (
                <button
                  title="Cuộc hội thoại mới"
                  onClick={() => setMessages([WELCOME])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, fontSize: '0.85rem' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <i className="fa fa-plus-circle" />
                </button>
              )}
              <button className="modal-close" onClick={() => setOpen(false)}>
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
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all 0.12s',
                }}
              >
                <i className={`fa ${t.icon}`} />{t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'history' ? (
            <HistoryPanel onReopen={handleReopen} />
          ) : (
            <>
              {/* Messages */}
              <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`chat-msg ${msg.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                    {msg.role === 'bot' && parseRooms(msg)}
                  </div>
                ))}

                {loading && (
                  <div className="chat-msg bot">
                    <div className="thinking-dots"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick replies */}
              {messages.length === 1 && (
                <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)' }}>
                  {QUICK_REPLIES.map((t, i) => (
                    <button key={i}
                      className="btn btn-secondary btn-sm"
                      style={{ textAlign: 'left', fontSize: '0.8rem', borderRadius: 20, padding: '0.3rem 0.875rem' }}
                      onClick={() => send(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="chat-input-row">
                <textarea
                  className="chat-input"
                  placeholder="Nhập yêu cầu... (Enter để gửi)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  rows={1}
                />
                <button
                  className="chat-send"
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                >
                  <i className="fa fa-paper-plane" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoomSuggestCards = ({ rooms, onBook, onView }) => (
  <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
    {rooms.map(room => (
      <div key={room.roomID} style={{
        background: 'var(--bg-hover)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '0.75rem', fontSize: '0.82rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {room.name}
          {room.isVIP && (
            <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '1px 5px' }}>VIP</span>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
          <i className="fa fa-map-marker-alt" style={{ marginRight: 4 }} />{room.area}
          <span style={{ marginLeft: 10 }}><i className="fa fa-users" style={{ marginRight: 4 }} />{room.seat} chỗ</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem', flex: 1 }} onClick={() => onBook(room.roomID)}>
            <i className="fa fa-calendar-plus" style={{ marginRight: 4 }} />Đặt ngay
          </button>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }} onClick={() => onView(room.roomID)}>
            <i className="fa fa-eye" />
          </button>
        </div>
      </div>
    ))}
  </div>
)

const BookingSuccessCard = ({ data, onView }) => (
  <div style={{
    margin: '0 0.75rem 0.5rem',
    background: 'var(--bg-hover)', border: '1px solid #2d6a2d',
    borderRadius: 10, padding: '0.875rem', fontSize: '0.82rem',
  }}>
    <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: 8 }}>
      <i className="fa fa-check-circle" style={{ marginRight: 6 }} />
      {data.needApproval ? 'Đã gửi yêu cầu — chờ Admin duyệt' : 'Đặt phòng thành công!'}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
      <span><i className="fa fa-door-open" style={{ width: 16, color: 'var(--accent)', marginRight: 4 }} />{data.roomName}</span>
      <span><i className="fa fa-calendar-alt" style={{ width: 16, color: 'var(--accent)', marginRight: 4 }} />{dayjs(data.timeStart).format('DD/MM/YYYY')}</span>
      <span><i className="fa fa-clock" style={{ width: 16, color: 'var(--accent)', marginRight: 4 }} />{dayjs(data.timeStart).format('HH:mm')} – {dayjs(data.timeEnd).format('HH:mm')}</span>
      <span><i className="fa fa-tag" style={{ width: 16, color: 'var(--accent)', marginRight: 4 }} />{data.title}</span>
    </div>
    {data.roomID && (
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: '100%', fontSize: '0.78rem' }} onClick={() => onView(data.roomID)}>
        <i className="fa fa-calendar" style={{ marginRight: 4 }} />Xem lịch phòng
      </button>
    )}
  </div>
)

export default ChatbotWidget
