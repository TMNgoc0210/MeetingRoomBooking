import { useState, useEffect } from 'react'
import { reportService, roomService } from '../services'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const Report = () => {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [rooms, setRooms] = useState([])
  const [filter, setFilter] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    roomID: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    reportService.getSummary().then(r => setSummary(r.data.data)).catch(() => {})
    roomService.getList().then(r => setRooms(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => { fetchChart() }, [filter])

  const fetchChart = async () => {
    setLoading(true)
    try {
      const res = await reportService.getChart(filter)
      const data = res.data.data || []
      setChartData({
        labels: data.map(d => d.name),
        datasets: [{
          label: 'Số lượt đặt phòng',
          data: data.map(d => d.y),
          backgroundColor: 'rgba(201, 169, 110, 0.6)',
          borderColor: '#c9a96e',
          borderWidth: 2,
          borderRadius: 6,
        }],
      })
    } catch {}
    setLoading(false)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i)

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title"><i className="fa fa-chart-bar" style={{ marginRight: 8 }} />Thống kê đặt phòng</h1>

        {/* Summary cards */}
        {summary && (
          <div className="stats-grid">
            <StatCard icon="door-open" label="Tổng phòng" value={summary.totalRooms} color="#c9a96e" />
            <StatCard icon="users" label="Người dùng" value={summary.totalUsers} color="#5c9ee0" />
            <StatCard icon="calendar-check" label="Tổng lịch đặt" value={summary.totalBookings} color="#4caf8a" />
            <StatCard icon="clock" label="Đặt hôm nay" value={summary.todayBookings} color="#e0a85c" />
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Biểu đồ theo tuần</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select className="form-control" style={{ width: 110 }}
                value={filter.month} onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}>
                {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
              <select className="form-control" style={{ width: 100 }}
                value={filter.year} onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="form-control" style={{ width: 180 }}
                value={filter.roomID} onChange={e => setFilter({ ...filter, roomID: parseInt(e.target.value) })}>
                <option value={0}>Tất cả phòng</option>
                {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : chartData ? (
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: '#a09880', font: { family: 'Inter' } } },
                  title: { display: false },
                  tooltip: { backgroundColor: '#1e1e1e', titleColor: '#f0ece4', bodyColor: '#a09880', borderColor: '#2e2a24', borderWidth: 1 },
                },
                scales: {
                  x: { ticks: { color: '#6b6455' }, grid: { color: '#2e2a24' } },
                  y: { ticks: { color: '#6b6455', stepSize: 1 }, grid: { color: '#2e2a24' }, beginAtZero: true },
                },
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}18`, color }}>
      <i className={`fa fa-${icon}`} />
    </div>
    <div className="stat-info">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

export default Report
