import { useState, useEffect, useCallback } from 'react'
import { roomService, areaService, lineRoomService, equipmentService } from '../services'
import BookingCalendar from '../components/calendar/BookingCalendar'
import useUIStore from '../store/uiStore'
import useAuthStore from '../store/authStore'

const DEFAULT_SEL = { type: 'all', data: null }

const CalendarView = () => {
  const [rooms, setRooms]           = useState([])
  const [areas, setAreas]           = useState([])
  const [sel, setSel]               = useState(DEFAULT_SEL)
  const [bookings, setBookings]     = useState([])
  const [equipment, setEquipment]   = useState([])
  const [loadingRooms, setLoadingRooms]       = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [sidebarSearch, setSidebarSearch]     = useState('')
  const [collapsedAreas, setCollapsedAreas]   = useState({})
  const [isMobile, setIsMobile]               = useState(window.innerWidth <= 768)
  const [mobileTab, setMobileTab]             = useState('rooms') // 'rooms' | 'calendar'

  const { refreshKey, openBookingModal, openLoginModal } = useUIStore()
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setLoadingRooms(true)
    Promise.all([roomService.getList(), areaService.getList()])
      .then(([roomsRes, areasRes]) => {
        setRooms(roomsRes.data.data || [])
        setAreas(areasRes.data.data || [])
      })
      .finally(() => setLoadingRooms(false))
  }, [])

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      let res
      if (sel.type === 'all')        res = await lineRoomService.getAll()
      else if (sel.type === 'mine')  res = await lineRoomService.getMy()
      else if (sel.type === 'area')  res = await lineRoomService.getByArea(sel.data.AreaID)
      else                           res = await lineRoomService.getByRoom(sel.data.RoomID)
      setBookings(res.data.data || [])

      if (sel.type === 'room') {
        const equipRes = await equipmentService.getByRoom(sel.data.RoomID)
        setEquipment(equipRes.data.data || [])
      } else {
        setEquipment([])
      }
    } catch { setBookings([]) }
    setLoadingBookings(false)
  }, [sel, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBookings() }, [loadBookings])

  const handleBook = () => {
    if (!user) { openLoginModal(); return }
    openBookingModal(sel.type === 'room' ? sel.data : null)
  }

  const toggleArea = (areaID, e) => {
    e.stopPropagation()
    setCollapsedAreas(prev => ({ ...prev, [areaID]: !prev[areaID] }))
  }

  // Khi chọn phòng/khu vực trên mobile → tự chuyển sang tab lịch
  const handleSelect = (newSel) => {
    setSel(newSel)
    if (isMobile) setMobileTab('calendar')
  }

  const calendarBookings = bookings.map(b =>
    sel.type === 'room' ? b : { ...b, Title: `[${b.RoomName}] ${b.Title}` }
  )

  const headerTitleMap = {
    all:  'Tất cả phòng họp',
    mine: 'Lịch của tôi',
    area: sel.data?.AreaName,
    room: sel.data?.RoomName,
  }

  const searchLower = sidebarSearch.toLowerCase()
  const groupedAreas = areas.map(area => ({
    ...area,
    rooms: rooms.filter(r =>
      r.AreaID === area.AreaID &&
      r.RoomName.toLowerCase().includes(searchLower)
    ),
  })).filter(a => a.rooms.length > 0 || a.AreaName?.toLowerCase().includes(searchLower))
  const ungroupedRooms = rooms.filter(r =>
    !areas.find(a => a.AreaID === r.AreaID) &&
    r.RoomName.toLowerCase().includes(searchLower)
  )

  const headerTitle = headerTitleMap[sel.type] ?? ''

  const headerSub = sel.type === 'all'
    ? `${rooms.length} phòng · ${areas.length} khu vực`
    : sel.type === 'mine'
      ? `${bookings.length} lịch đặt của bạn`
      : sel.type === 'area'
        ? `${rooms.filter(r => r.AreaID === sel.data.AreaID).length} phòng trong khu vực`
        : null

  // ── Sidebar content (dùng lại cho cả desktop + mobile tab) ──
  const SidebarContent = (
    <>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' }}>
          <i className="fa fa-building" style={{ marginRight: 6 }} />Phòng họp
        </div>
        <div style={{ position: 'relative' }}>
          <i className="fa fa-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem', pointerEvents: 'none' }} />
          <input
            style={{
              width: '100%', paddingLeft: 28, paddingRight: '0.625rem',
              paddingTop: '0.45rem', paddingBottom: '0.45rem',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              fontSize: '0.82rem', outline: 'none',
            }}
            placeholder="Tìm phòng..."
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingRooms ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        ) : (
          <>
            {!sidebarSearch && (
              <>
                <SidebarItem
                  icon="fa-th-large"
                  label="Tất cả phòng"
                  active={sel.type === 'all'}
                  onClick={() => handleSelect(DEFAULT_SEL)}
                />
                {user && (
                  <SidebarItem
                    icon="fa-calendar-check"
                    label="Lịch của tôi"
                    active={sel.type === 'mine'}
                    onClick={() => handleSelect({ type: 'mine', data: null })}
                    accent
                  />
                )}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              </>
            )}

            {groupedAreas.map(area => (
              <div key={area.AreaID}>
                <div
                  style={{
                    padding: '0.55rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    background: sel.type === 'area' && sel.data?.AreaID === area.AreaID ? 'rgba(201,169,110,0.06)' : 'transparent',
                    borderLeft: sel.type === 'area' && sel.data?.AreaID === area.AreaID ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => handleSelect({ type: 'area', data: area })}
                >
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                    color: sel.type === 'area' && sel.data?.AreaID === area.AreaID ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    {area.AreaName}
                  </span>
                  <button
                    onClick={e => toggleArea(area.AreaID, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}
                  >
                    <i className={`fa fa-chevron-${collapsedAreas[area.AreaID] ? 'right' : 'down'}`} style={{ fontSize: '0.6rem' }} />
                  </button>
                </div>

                {!collapsedAreas[area.AreaID] && area.rooms.map(room => (
                  <RoomItem
                    key={room.RoomID}
                    room={room}
                    selected={sel.type === 'room' && sel.data?.RoomID === room.RoomID}
                    onClick={() => handleSelect({ type: 'room', data: room })}
                  />
                ))}
              </div>
            ))}

            {ungroupedRooms.length > 0 && (
              <div>
                <div style={{ padding: '0.55rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Khác
                </div>
                {ungroupedRooms.map(room => (
                  <RoomItem
                    key={room.RoomID}
                    room={room}
                    selected={sel.type === 'room' && sel.data?.RoomID === room.RoomID}
                    onClick={() => handleSelect({ type: 'room', data: room })}
                  />
                ))}
              </div>
            )}

            {groupedAreas.length === 0 && ungroupedRooms.length === 0 && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Không tìm thấy phòng
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        {rooms.length} phòng · {areas.length} khu vực
      </div>
    </>
  )

  // ── Header + Calendar content ──
  const CalendarContent = (
    <>
      {/* Header bar */}
      <div style={{
        padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        flexShrink: 0, gap: '0.75rem',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <i className={
              sel.type === 'all' ? 'fa fa-th-large' :
              sel.type === 'area' ? 'fa fa-map-marker-alt' : 'fa fa-door-open'
            } style={{ color: 'var(--accent)', fontSize: '0.9rem', flexShrink: 0 }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{headerTitle}</h2>
            {sel.type === 'room' && sel.data.IsVIP === 1 && (
              <span style={{ fontSize: '0.62rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>VIP</span>
            )}
          </div>
          {/* Equipment / sub info — hidden on mobile to save space */}
          {!isMobile && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
              {headerSub && <span>{headerSub}</span>}
              {sel.type === 'room' && (
                <>
                  <span><i className="fa fa-map-marker-alt" style={{ color: 'var(--accent)', marginRight: 4 }} />{sel.data.AreaName}</span>
                  <span><i className="fa fa-users" style={{ marginRight: 4 }} />{sel.data.Seat} người</span>
                  {equipment.map(e => (
                    <span key={e.EquipmentID}>
                      <i className={`fa ${e.Icon}`} style={{ marginRight: 3 }} />
                      {e.Name}{e.Quantity > 1 ? ` ×${e.Quantity}` : ''}
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
          {/* Mobile: compact info */}
          {isMobile && sel.type === 'room' && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span><i className="fa fa-map-marker-alt" style={{ color: 'var(--accent)', marginRight: 3 }} />{sel.data.AreaName}</span>
              <span><i className="fa fa-users" style={{ marginRight: 3 }} />{sel.data.Seat} người</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* View pills — ẩn trên mobile */}
          {!isMobile && (
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', fontSize: '0.8rem' }}>
              {[
                { type: 'all',  label: 'Tất cả', icon: 'fa-th-large' },
                { type: 'area', label: 'Khu vực', icon: 'fa-map-marker-alt', disabled: !sel.data && sel.type !== 'area' },
                { type: 'room', label: 'Phòng',   icon: 'fa-door-open',       disabled: sel.type !== 'room' },
              ].map(m => (
                <button
                  key={m.type}
                  disabled={m.disabled}
                  onClick={() => {
                    if (m.type === 'all') setSel(DEFAULT_SEL)
                    else if (m.type === 'area' && sel.type === 'room') {
                      const area = areas.find(a => a.AreaID === sel.data.AreaID)
                      if (area) setSel({ type: 'area', data: area })
                    }
                  }}
                  style={{
                    padding: '0.35rem 0.75rem', border: 'none', cursor: m.disabled ? 'default' : 'pointer',
                    background: sel.type === m.type ? 'var(--accent)' : 'transparent',
                    color: sel.type === m.type ? '#1a1a1a' : m.disabled ? 'var(--border)' : 'var(--text-muted)',
                    fontWeight: sel.type === m.type ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s',
                  }}
                >
                  <i className={`fa ${m.icon}`} />{m.label}
                </button>
              ))}
            </div>
          )}

          {sel.type === 'room' && sel.data.IsVIP === 1 && !isMobile && (
            <span style={{ fontSize: '0.72rem', color: '#fde68a', background: '#451a03', border: '1px solid #92400e', borderRadius: 6, padding: '4px 10px' }}>
              <i className="fa fa-shield-alt" style={{ marginRight: 4 }} />Cần phê duyệt
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleBook}>
            <i className="fa fa-calendar-plus" />{isMobile ? '' : ' Đặt phòng'}
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0.75rem' : '1rem 1.5rem' }}>
        {loadingBookings ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="spinner" />
          </div>
        ) : (
          <BookingCalendar
            bookings={calendarBookings}
            roomId={sel.type === 'room' ? sel.data.RoomID : null}
            room={sel.type === 'room' ? sel.data : null}
          />
        )}
      </div>
    </>
  )

  // ─── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {[
            { key: 'rooms', icon: 'fa-list', label: 'Danh sách phòng' },
            { key: 'calendar', icon: 'fa-calendar-alt', label: 'Lịch' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setMobileTab(tab.key)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: mobileTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: mobileTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: mobileTab === tab.key ? 700 : 400,
                fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <i className={`fa ${tab.icon}`} />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {mobileTab === 'rooms' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            {SidebarContent}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {CalendarContent}
          </div>
        )}
      </div>
    )
  }

  // ─── Desktop layout ──────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, flexShrink: 0,
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {SidebarContent}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {CalendarContent}
      </div>
    </div>
  )
}

const SidebarItem = ({ icon, label, active, onClick, accent }) => (
  <div
    onClick={onClick}
    style={{
      padding: '0.6rem 1rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
  >
    <i className={`fa ${icon}`} style={{ fontSize: '0.78rem', color: active || accent ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
    <span style={{ fontSize: '0.84rem', fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
      {label}
    </span>
  </div>
)

const RoomItem = ({ room, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '0.55rem 1rem 0.55rem 1.5rem',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      background: selected ? 'rgba(201,169,110,0.1)' : 'transparent',
      borderLeft: selected ? '3px solid var(--accent)' : '3px solid transparent',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)' }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
  >
    <i className="fa fa-door-closed" style={{ fontSize: '0.78rem', color: selected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '0.84rem', fontWeight: selected ? 600 : 400,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {room.RoomName}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{room.Seat} chỗ</div>
    </div>
    {room.IsVIP === 1 && (
      <span style={{ fontSize: '0.58rem', background: '#92400e', color: '#fde68a', borderRadius: 3, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>VIP</span>
    )}
  </div>
)

export default CalendarView
