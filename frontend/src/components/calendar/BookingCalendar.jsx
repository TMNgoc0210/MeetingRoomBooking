import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import useUIStore from '../../store/uiStore'
import useAuthStore from '../../store/authStore'
import useSettingsStore from '../../store/settingsStore'

// Status: 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
const STATUS_COLOR = {
  0: { bg: '#b45309', border: '#92400e', label: '⏳ Chờ duyệt' },
  1: { bg: '#c9a96e', border: '#a07850', label: '✅ Đã duyệt' },
  2: { bg: '#7f1d1d', border: '#6b1414', label: '❌ Từ chối' },
  3: { bg: '#374151', border: '#1f2937', label: '🚫 Đã huỷ' },
}

const BookingCalendar = ({ bookings = [], roomId, room }) => {
  const { openDetailModal } = useUIStore()
  const { user } = useAuthStore()
  const slotDuration = useSettingsStore(s => s.slotDuration())
  const hour12 = useSettingsStore(s => s.hour12())
  const calendarRef = useRef(null)

  const events = bookings.map(b => {
    const status = b.Status ?? 1
    const color = STATUS_COLOR[status] || STATUS_COLOR[1]
    return {
      id: String(b.LineRoomID),
      title: b.Title,
      start: b.TimeStart,
      end: b.TimeEnd,
      extendedProps: { lineRoomID: b.LineRoomID, status, userName: b.UserName },
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: '#f5f0e8',
    }
  })

  const handleEventClick = ({ event }) => {
    openDetailModal(parseInt(event.extendedProps.lineRoomID))
  }

  const handleDateClick = () => {
    if (!user) { useUIStore.getState().openLoginModal(); return }
    const target = room || (roomId ? { RoomID: roomId } : null)
    if (target) useUIStore.getState().openBookingModal(target)
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border)' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, display: 'inline-block' }} />
            {c.label}
          </span>
        ))}
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{ today: 'Hôm nay', month: 'Tháng', week: 'Tuần', day: 'Ngày' }}
        locale="vi"
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration={slotDuration}
        allDaySlot={false}
        height="auto"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12 }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12 }}
        nowIndicator={true}
        selectable={!!user}
        eventContent={({ event }) => (
          <div style={{ padding: '2px 4px', fontSize: '0.75rem', overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.title}
            </div>
            <div style={{ opacity: 0.85 }}>
              {event.extendedProps.userName || ''}
            </div>
          </div>
        )}
        eventMouseEnter={info => { info.el.style.opacity = '0.85'; info.el.style.cursor = 'pointer' }}
        eventMouseLeave={info => { info.el.style.opacity = '1' }}
      />
    </div>
  )
}

export default BookingCalendar
