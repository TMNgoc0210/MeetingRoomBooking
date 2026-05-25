import { useState, useEffect, useCallback } from 'react'
import { roomService, areaService, lineRoomService, equipmentService } from '../services'
import BookingCalendar from '../components/calendar/BookingCalendar'
import useUIStore from '../store/uiStore'
import useAuthStore from '../store/authStore'

// sel = { type: 'all' | 'area' | 'room', data: null | area | room }
const DEFAULT_SEL = { type: 'all', data: null }

const CalendarView = () => {
  const [rooms, setRooms]           = useState([])
  const [areas, setAreas]           = useState([])
  const [sel, setSel]               = useState(DEFAULT_SEL)
  const [bookings, setBookings]     = useState([])
  const [equipment, setEquipment]   = useState([])
  const [loadingRooms, setLoadingRooms]     = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [sidebarSearch, setSidebarSearch]   = useState('')
  const [collapsedAreas, setCollapsedAreas] = useState({})

  const { refreshKey, openBookingModal, openLoginModal } = useUIStore()
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    setLoadingRooms(true)
    Promise.all([roomService.getList(), areaService.getList()])
      .then(([roomsRes, areasRes]) => {
        setRooms(roomsRes.data.data || [])
        setAreas(areasRes.data.data || [])
      })
      .finally(() => setLoadingRooms(false))
  }, [])

  // Load bookings whenever selection or refreshKey changes
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      let res
      if (sel.type === 'all')  res = await lineRoomService.getAll()
      else if (sel.type === 'area') res = await lineRoomService.getByArea(sel.data.AreaID)
      else res = await lineRoomService.getByRoom(sel.data.RoomID)
      setBookings(res.data.data || [])

      if (sel.type === 'room') {
        const equipRes = await equipmentService.getByRoom(sel.data.RoomID)
        setEquipment(equipRes.data.data || [])
      } else {
        setEquipment([])
      }
    } catch { setBookings([]) }
    setLoadingBookings(false)
  }, [sel, refreshKey])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBookings() }, [loadBookings])

  const handleBook = () => {
    if (!user) { openLoginModal(); return }
    const room = sel.type === 'room' ? sel.data : null
    openBookingModal(room)
  }

  const toggleArea = (areaID, e) => {
    e.stopPropagation()
    setCollapsedAreas(prev => ({ ...prev, [areaID]: !prev[areaID] }))
  }

  // Bookings with room name in title for multi-room views
  const calendarBookings = bookings.map(b =>
    sel.type === 'room'
      ? b
      : { ...b, Title: `[${b.RoomName}] ${b.Title}` }
  )

  // Sidebar search filter
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

  // Header info
  const headerTitle = sel.type === 'all'
    ? 'Tất cả phòng họp'
    : sel.type === 'area'
      ? sel.data.AreaName
      : sel.data.RoomName

  const headerSub = sel.type === 'all'
    ? `${rooms.length} phòng · ${areas.length} khu vực`
    : sel.type === 'area'
      ? `${rooms.filter(r => r.AreaID === sel.data.AreaID).length} phòng trong khu vực`
      : null

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0,
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
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

        {/* Room list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingRooms ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : (
            <>
              {/* Tất cả phòng */}
              {!sidebarSearch && (
                <div
                  onClick={() => setSel(DEFAULT_SEL)}
                  style={{
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: sel.type === 'all' ? 'rgba(201,169,110,0.1)' : 'transparent',
                    borderLeft: sel.type === 'all' ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (sel.type !== 'all') e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (sel.type !== 'all') e.currentTarget.style.background = 'transparent' }}
                >
                  <i className="fa fa-th-large" style={{ fontSize: '0.78rem', color: sel.type === 'all' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: sel.type === 'all' ? 600 : 400, color: sel.type === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    Tất cả phòng
                  </span>
                </div>
              )}

              {/* Areas + rooms */}
              {groupedAreas.map(area => (
                <div key={area.AreaID}>
                  {/* Area header — click to view area calendar */}
                  <div
                    style={{
                      padding: '0.55rem 1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                      background: sel.type === 'area' && sel.data?.AreaID === area.AreaID
                        ? 'rgba(201,169,110,0.06)' : 'transparent',
                      borderLeft: sel.type === 'area' && sel.data?.AreaID === area.AreaID
                        ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setSel({ type: 'area', data: area })}
                    onMouseEnter={e => { if (!(sel.type === 'area' && sel.data?.AreaID === area.AreaID)) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!(sel.type === 'area' && sel.data?.AreaID === area.AreaID)) e.currentTarget.style.background = 'transparent' }}
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
                      onClick={() => setSel({ type: 'room', data: room })}
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
                      onClick={() => setSel({ type: 'room', data: room })}
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
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              {/* Breadcrumb icon */}
              <i className={
                sel.type === 'all' ? 'fa fa-th-large' :
                sel.type === 'area' ? 'fa fa-map-marker-alt' : 'fa fa-door-open'
              } style={{ color: 'var(--accent)', fontSize: '0.9rem' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{headerTitle}</h2>
              {sel.type === 'room' && sel.data.IsVIP === 1 && (
                <span style={{ fontSize: '0.62rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>VIP</span>
              )}
            </div>
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
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {/* View mode pills */}
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
                    // room → already there if sel.type === 'room'
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

            {sel.type === 'room' && sel.data.IsVIP === 1 && (
              <span style={{ fontSize: '0.72rem', color: '#fde68a', background: '#451a03', border: '1px solid #92400e', borderRadius: 6, padding: '4px 10px' }}>
                <i className="fa fa-shield-alt" style={{ marginRight: 4 }} />Cần phê duyệt
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleBook}>
              <i className="fa fa-calendar-plus" /> Đặt phòng
            </button>
          </div>
        </div>

        {/* Calendar area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
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
      </div>
    </div>
  )
}

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
