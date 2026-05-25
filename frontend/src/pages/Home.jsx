import { useState, useEffect } from 'react'
import { roomService, areaService } from '../services'
import useUIStore from '../store/uiStore'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const [rooms, setRooms] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState({ roomName: '', areaID: '' })
  const { refreshKey } = useUIStore()
  const navigate = useNavigate()

  useEffect(() => {
    areaService.getList().then(r => setAreas(r.data.data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    roomService.search(search)
      .then(r => setRooms(r.data.data || []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [refreshKey, search.areaID])

  const handleSearch = (e) => {
    e.preventDefault()
    setLoading(true)
    roomService.search(search)
      .then(r => setRooms(r.data.data || []))
      .finally(() => setLoading(false))
  }

  const handleCardClick = (room) => {
    navigate(`/book-detail/${room.RoomID}`)
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '2.5rem 0 2rem', marginBottom: '0.5rem' }}>
          <h1 className="hero-title" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--accent)' }}>Đặt phòng họp</span> thông minh
          </h1>
          <p className="hero-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Tìm và đặt phòng họp dễ dàng — hoặc hỏi AI chatbot để được hỗ trợ tức thì
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="search-bar">
          <div className="search-input-wrap">
            <i className="fa fa-search" />
            <input
              className="form-control"
              placeholder="Tìm theo tên phòng..."
              value={search.roomName}
              onChange={e => setSearch({ ...search, roomName: e.target.value })}
            />
          </div>
          <select
            className="form-control"
            style={{ maxWidth: 200 }}
            value={search.areaID}
            onChange={e => setSearch({ ...search, areaID: e.target.value })}
          >
            <option value="">Tất cả khu vực</option>
            {areas.map(a => <option key={a.AreaID} value={a.AreaID}>{a.AreaName}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">
            <i className="fa fa-search" /> Tìm kiếm
          </button>
        </form>

        {/* Rooms grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <i className="fa fa-door-open" />
            <h3>Không tìm thấy phòng nào</h3>
            <p>Thử thay đổi bộ lọc tìm kiếm</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Tìm thấy <strong style={{ color: 'var(--accent)' }}>{rooms.length}</strong> phòng
            </p>
            <div className="room-grid">
              {rooms.map(room => (
                <RoomCard key={room.RoomID} room={room} onClick={() => handleCardClick(room)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const RoomCard = ({ room, onClick }) => (
  <div className="room-card" onClick={onClick}>
    <div style={{ position: 'relative' }}>
      <img
        src={room.Avatar || '/uploads/images/nopic.png'}
        alt={room.RoomName}
        className="room-card-img"
        onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
      />
      {room.IsVIP === 1 && (
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.7rem', background: '#92400e', color: '#fde68a', borderRadius: 5, padding: '3px 8px', fontWeight: 700, letterSpacing: 0.5 }}>VIP</span>
      )}
    </div>
    <div className="room-card-body">
      <div className="room-card-title">{room.RoomName}</div>
      <div className="room-card-area"><i className="fa fa-map-marker-alt" style={{ marginRight: 4 }} />{room.AreaName}</div>
      <div className="room-card-meta">
        <div className="room-meta-item"><i className="fa fa-users" />{room.Seat} chỗ</div>
        {room.PhoneCall === 1 && <div className="room-meta-item"><i className="fa fa-phone" />Điện thoại</div>}
        {room.VideoCall === 1 && <div className="room-meta-item"><i className="fa fa-video" />Camera</div>}
      </div>
    </div>
  </div>
)

export default Home
