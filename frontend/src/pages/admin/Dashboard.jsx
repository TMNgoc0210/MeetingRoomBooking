import { useState, useEffect } from 'react'
import { reportService, bookingService, roomService } from '../../services'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [pending, setPending] = useState([])
  const [rooms, setRooms] = useState([])
  const [filter, setFilter] = useState({ month: dayjs().month() + 1, year: dayjs().year(), roomID: 0 })
  const [loadingChart, setLoadingChart] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    reportService.getSummary().then(r => setSummary(r.data.data)).catch(() => {})
    bookingService.getPending().then(r => setPending(r.data.data || [])).catch(() => {})
    roomService.getAll().then(r => setRooms(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => { fetchChart() }, [filter])

  const fetchChart = async () => {
    setLoadingChart(true)
    try {
      const res = await reportService.getChart(filter)
      const data = res.data.data || []
      setChartData({
        labels: data.map(d => d.name),
        datasets: [{
          label: 'Số lượt đặt phòng',
          data: data.map(d => d.y),
          backgroundColor: 'rgba(201,169,110,0.55)',
          borderColor: '#c9a96e',
          borderWidth: 2,
          borderRadius: 6,
        }],
      })
    } catch {}
    setLoadingChart(false)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i)

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.75rem 2rem', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
          <i className="fa fa-chart-pie" style={{ marginRight: 8 }} />Tổng quan hệ thống
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {dayjs().format('dddd, DD/MM/YYYY')}
        </p>
      </div>

      {/* Stats cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatCard icon="door-open" label="Tổng phòng họp" value={summary.totalRooms} color="var(--accent)" sub={`${rooms.filter(r => r.Visible).length} đang hoạt động`} />
          <StatCard icon="users" label="Người dùng" value={summary.totalUsers} color="var(--info)" sub="Tài khoản đăng ký" />
          <StatCard icon="calendar-check" label="Tổng lịch đặt" value={summary.totalBookings} color="var(--success)" sub="Tất cả thời gian" />
          <StatCard icon="clock" label="Đặt hôm nay" value={summary.todayBookings} color="var(--warning)" sub={dayjs().format('DD/MM/YYYY')} />
          <StatCard
            icon="clipboard-list" label="Chờ phê duyệt" value={pending.length}
            color={pending.length > 0 ? 'var(--danger)' : 'var(--success)'}
            sub={pending.length > 0 ? 'Cần xử lý' : 'Đã xử lý hết'}
            onClick={() => navigate('/admin/approvals')}
            clickable
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '1rem', alignItems: 'start' }}>
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              <i className="fa fa-chart-bar" style={{ color: 'var(--accent)', marginRight: 6 }} />
              Biểu đồ đặt phòng theo tuần
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select className="form-control" style={{ width: 110, fontSize: '0.8rem', padding: '0.35rem 0.625rem' }}
                value={filter.month} onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}>
                {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
              <select className="form-control" style={{ width: 90, fontSize: '0.8rem', padding: '0.35rem 0.625rem' }}
                value={filter.year} onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="form-control" style={{ width: 160, fontSize: '0.8rem', padding: '0.35rem 0.625rem' }}
                value={filter.roomID} onChange={e => setFilter({ ...filter, roomID: parseInt(e.target.value) })}>
                <option value={0}>Tất cả phòng</option>
                {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
              </select>
            </div>
          </div>
          {loadingChart ? (
            <div className="loading-center" style={{ height: 200 }}><div className="spinner" /></div>
          ) : chartData ? (
            <Bar data={chartData} options={{
              responsive: true,
              plugins: {
                legend: { labels: { color: '#a09880', font: { family: 'Inter', size: 12 } } },
                tooltip: { backgroundColor: '#1e1e1e', titleColor: '#f0ece4', bodyColor: '#a09880', borderColor: '#2e2a24', borderWidth: 1 },
              },
              scales: {
                x: { ticks: { color: '#6b6455', font: { size: 11 } }, grid: { color: '#2e2a24' } },
                y: { ticks: { color: '#6b6455', stepSize: 1, font: { size: 11 } }, grid: { color: '#2e2a24' }, beginAtZero: true },
              },
            }} />
          ) : null}
        </div>

        {/* Pending approvals panel */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <i className="fa fa-clipboard-check" style={{ color: 'var(--accent)', marginRight: 6 }} />
              Chờ phê duyệt
            </h3>
            {pending.length > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <i className="fa fa-check-circle" style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 8, display: 'block' }} />
              Không có lịch nào chờ duyệt
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {pending.slice(0, 5).map(item => (
                <div key={item.LineRoomID} style={{
                  background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                  padding: '0.625rem 0.75rem', cursor: 'pointer', border: '1px solid var(--border)',
                }}
                  onClick={() => navigate('/admin/approvals')}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.Title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <i className="fa fa-door-open" style={{ marginRight: 4, color: 'var(--accent)' }} />{item.RoomName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <i className="fa fa-user" style={{ marginRight: 4 }} />{item.UserName || item.UserID}
                    <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
                    <i className="fa fa-clock" style={{ marginRight: 4 }} />
                    {dayjs(item.TimeStart).format('DD/MM HH:mm')}
                  </div>
                </div>
              ))}
              {pending.length > 5 && (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/approvals')}
                  style={{ width: '100%', marginTop: 4, fontSize: '0.78rem' }}>
                  Xem thêm {pending.length - 5} lịch khác
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Room quick list */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            <i className="fa fa-door-open" style={{ color: 'var(--accent)', marginRight: 6 }} />Danh sách phòng
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/rooms')} style={{ fontSize: '0.78rem' }}>
            Quản lý phòng <i className="fa fa-arrow-right" style={{ marginLeft: 4 }} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
          {rooms.slice(0, 6).map(room => (
            <div key={room.RoomID} style={{
              background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
              padding: '0.75rem', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <img src={room.Avatar || '/uploads/images/nopic.png'} alt=""
                style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {room.RoomName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {room.AreaName} · {room.Seat} chỗ
                </div>
              </div>
              {room.IsVIP === 1 && (
                <span style={{ fontSize: '0.6rem', background: '#92400e', color: '#fde68a', borderRadius: 3, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>VIP</span>
              )}
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: room.Visible ? 'var(--success)' : 'var(--text-muted)',
              }} title={room.Visible ? 'Hoạt động' : 'Ẩn'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon, label, value, color, sub, onClick, clickable }) => (
  <div
    className="stat-card"
    onClick={onClick}
    style={{ cursor: clickable ? 'pointer' : 'default', transition: 'transform 0.15s', ...(clickable ? { ':hover': { transform: 'translateY(-2px)' } } : {}) }}
  >
    <div className="stat-icon" style={{ background: `${color}18` || 'rgba(201,169,110,0.1)', color }}>
      <i className={`fa fa-${icon}`} />
    </div>
    <div className="stat-info">
      <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
)

export default AdminDashboard
