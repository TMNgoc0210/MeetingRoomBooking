import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { roomService, lineRoomService, equipmentService } from '../services'
import BookingCalendar from '../components/calendar/BookingCalendar'
import useUIStore from '../store/uiStore'
import useAuthStore from '../store/authStore'

const BookDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [bookings, setBookings] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const { openBookingModal, openLoginModal, refreshKey } = useUIStore()
  const { user } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      roomService.getDetail(id),
      lineRoomService.getByRoom(id),
      equipmentService.getByRoom(id),
    ])
      .then(([roomRes, bookRes, equipRes]) => {
        setRoom(roomRes.data.data)
        setBookings(bookRes.data.data || [])
        setEquipment(equipRes.data.data || [])
      })
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  if (loading) return <div className="loading-center" style={{ height: '60vh' }}><div className="spinner" /></div>
  if (!room) return <div className="empty-state" style={{ height: '60vh' }}><i className="fa fa-door-open" /><h3>Không tìm thấy phòng</h3></div>

  const handleBook = () => {
    if (!user) { openLoginModal(); return }
    openBookingModal(room)
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
          <i className="fa fa-arrow-left" /> Quay lại
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Room Info Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={room.Avatar || '/uploads/images/nopic.png'}
                alt={room.RoomName}
                style={{ width: '100%', height: 220, objectFit: 'cover' }}
                onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
              />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.25rem' }}>
                  <h1 style={{ fontSize: '1.25rem', margin: 0 }}>{room.RoomName}</h1>
                  {room.IsVIP === 1 && (
                    <span style={{ fontSize: '0.72rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                      VIP
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <i className="fa fa-map-marker-alt" style={{ marginRight: 4 }} />{room.AreaName}
                </p>

                {room.IsVIP === 1 && (
                  <div style={{ background: '#451a03', border: '1px solid #92400e', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fde68a' }}>
                    <i className="fa fa-shield-alt" style={{ marginRight: 6 }} />
                    Phòng VIP — lịch đặt cần được Admin phê duyệt
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <InfoRow icon="users" label="Sức chứa" value={`${room.Seat} người`} />
                  <InfoRow icon="phone" label="Điện thoại" value={room.PhoneCall ? 'Có' : 'Không'} />
                  <InfoRow icon="video" label="Camera/Hội nghị" value={room.VideoCall ? 'Có' : 'Không'} />
                </div>

                {room.Desc && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{room.Desc}</p>
                )}

                <button className="btn btn-primary w-100" style={{ marginTop: '1.25rem' }} onClick={handleBook}>
                  <i className="fa fa-calendar-plus" /> Đặt phòng này
                </button>
              </div>
            </div>

            {/* Equipment Card */}
            {equipment.length > 0 && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.875rem' }}>
                  <i className="fa fa-tools" style={{ color: 'var(--accent)', marginRight: 6 }} />
                  Thiết bị phòng
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {equipment.map(e => (
                    <div key={e.EquipmentID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <i className={`fa ${e.Icon}`} style={{ width: 16, color: 'var(--accent)', marginRight: 6 }} />
                        {e.Name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {e.Quantity > 1 ? `x${e.Quantity}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Lịch đặt phòng</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{bookings.length} lịch đặt</span>
            </div>
            <BookingCalendar bookings={bookings} roomId={parseInt(id)} room={room} />
          </div>
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
    <span style={{ color: 'var(--text-muted)' }}>
      <i className={`fa fa-${icon}`} style={{ width: 16, color: 'var(--accent)', marginRight: 6 }} />{label}
    </span>
    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
  </div>
)

export default BookDetail
