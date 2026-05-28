import { useState, useEffect } from 'react'
import { reportService, roomService } from '../services'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Số giờ làm việc mỗi ngày và số ngày làm việc trong tháng (ước tính)
const WORK_HOURS_PER_DAY = 4 // ~4 khung giờ đỉnh điểm/ngày (sáng + chiều)

function countWorkdays(year, month) {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

const Report = () => {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [rooms, setRooms] = useState([])
  const [filter, setFilter] = useState({
    month: dayjs().month() + 1,
    year: dayjs().year(),
    roomID: 0,
  })
  const [loading, setLoading] = useState(false)
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    reportService.getSummary().then(r => setSummary(r.data.data)).catch(() => {})
    roomService.getList().then(r => setRooms(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => { fetchChart() }, [filter])
  useEffect(() => { fetchUsage() }, [filter.month, filter.year])

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
          backgroundColor: 'rgba(201,169,110,0.55)',
          borderColor: '#c9a96e',
          borderWidth: 2,
          borderRadius: 6,
        }],
      })
    } catch {}
    setLoading(false)
  }

  const fetchUsage = async () => {
    setUsageLoading(true)
    try {
      const res = await reportService.getRoomUsage({ month: filter.month, year: filter.year })
      const rows = (res.data.data || []).filter(r => r.bookingCount > 0)
      if (!rows.length) { setUsageData(null); setUsageLoading(false); return }

      const workdays = countWorkdays(filter.year, filter.month)
      const maxAvail = workdays * WORK_HOURS_PER_DAY

      // Tỷ lệ sử dụng (%) = tổng giờ đã đặt / (workdays * WORK_HOURS_PER_DAY) * 100
      const rates = rows.map(r => Math.min(100, Math.round(((r.totalHours || 0) / maxAvail) * 100)))

      setUsageData({
        labels: rows.map(r => r.RoomName),
        datasets: [
          {
            label: 'Tỷ lệ sử dụng (%)',
            data: rates,
            backgroundColor: rates.map(v =>
              v >= 70 ? 'rgba(220,60,60,0.65)'
              : v >= 40 ? 'rgba(201,169,110,0.65)'
              : 'rgba(80,180,120,0.65)'
            ),
            borderColor: rates.map(v =>
              v >= 70 ? '#dc3c3c' : v >= 40 ? '#c9a96e' : '#50b478'
            ),
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
        rawRows: rows,
        workdays,
        maxAvail,
      })
    } catch {}
    setUsageLoading(false)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i)

  const chartOptions = (title, xLabel, maxY) => ({
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { labels: { color: '#a09880', font: { family: 'Inter', size: 12 } } },
      title: { display: !!title, text: title, color: '#e8d5b0', font: { size: 13 } },
      tooltip: {
        backgroundColor: '#1e1e1e', titleColor: '#f0ece4',
        bodyColor: '#a09880', borderColor: '#2e2a24', borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b6455' }, grid: { color: '#2e2a24' },
        beginAtZero: true, max: maxY,
        title: { display: true, text: xLabel, color: '#6b6455', font: { size: 11 } },
      },
      y: { ticks: { color: '#a09880', font: { size: 11 } }, grid: { color: '#2e2a24' } },
    },
  })

  const weeklyOptions = {
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
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title"><i className="fa fa-chart-bar" style={{ marginRight: 8 }} />Thống kê đặt phòng</h1>

        {/* Summary cards */}
        {summary && (
          <div className="stats-grid">
            <StatCard icon="door-open"      label="Tổng phòng"    value={summary.totalRooms}    color="#c9a96e" />
            <StatCard icon="users"          label="Người dùng"    value={summary.totalUsers}    color="#5c9ee0" />
            <StatCard icon="calendar-check" label="Tổng lịch đặt" value={summary.totalBookings} color="#4caf8a" />
            <StatCard icon="clock"          label="Đặt hôm nay"   value={summary.todayBookings} color="#e0a85c" />
          </div>
        )}

        {/* Filter bar shared by both charts */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              <i className="fa fa-filter" style={{ marginRight: 5 }} />Lọc theo:
            </span>
            <select className="form-control" style={{ width: 110 }}
              value={filter.month} onChange={e => setFilter(f => ({ ...f, month: parseInt(e.target.value) }))}>
              {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select className="form-control" style={{ width: 100 }}
              value={filter.year} onChange={e => setFilter(f => ({ ...f, year: parseInt(e.target.value) }))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-control" style={{ width: 180 }}
              value={filter.roomID} onChange={e => setFilter(f => ({ ...f, roomID: parseInt(e.target.value) }))}>
              <option value={0}>Tất cả phòng</option>
              {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              (Biểu đồ tỷ lệ sử dụng không áp dụng bộ lọc phòng)
            </span>
          </div>
        </div>

        {/* Row: Weekly chart + Room utilization */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>

          {/* Weekly booking chart */}
          <div className="card">
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa fa-chart-bar" style={{ color: 'var(--accent)' }} />
              Lượt đặt phòng theo tuần
            </h2>
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : chartData ? (
              <Bar data={chartData} options={weeklyOptions} />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Không có dữ liệu</div>
            )}
          </div>

          {/* Room utilization rate chart */}
          <div className="card">
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa fa-tachometer-alt" style={{ color: 'var(--accent)' }} />
              Tỷ lệ sử dụng phòng (%)
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Ước tính dựa trên {usageData?.workdays || '—'} ngày làm việc × {WORK_HOURS_PER_DAY}h/ngày
              &nbsp;=&nbsp;{usageData ? usageData.maxAvail + ' giờ/phòng' : '—'}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap', fontSize: '0.72rem' }}>
              {[
                { color: '#50b478', label: '< 40% — Thấp' },
                { color: '#c9a96e', label: '40–70% — Trung bình' },
                { color: '#dc3c3c', label: '> 70% — Cao' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>

            {usageLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : usageData ? (
              <Bar
                data={{ labels: usageData.labels, datasets: usageData.datasets }}
                options={chartOptions(null, 'Tỷ lệ sử dụng (%)', 100)}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                Chưa có lịch đặt phòng trong tháng này
              </div>
            )}
          </div>
        </div>

        {/* Room usage table */}
        {usageData && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa fa-table" style={{ color: 'var(--accent)' }} />
              Chi tiết sử dụng phòng — Tháng {filter.month}/{filter.year}
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Phòng họp', 'Lượt đặt', 'Tổng giờ', 'Tỷ lệ sử dụng', 'Đánh giá'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usageData.rawRows.map((r, i) => {
                    const rate = Math.min(100, Math.round(((r.totalHours || 0) / usageData.maxAvail) * 100))
                    const color = rate >= 70 ? '#dc3c3c' : rate >= 40 ? '#c9a96e' : '#50b478'
                    const label = rate >= 70 ? 'Cao' : rate >= 40 ? 'Trung bình' : 'Thấp'
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.RoomName}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{r.bookingCount}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{(r.totalHours || 0).toFixed(1)}h</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
                            </div>
                            <span style={{ minWidth: 36, fontSize: '0.8rem', color, fontWeight: 600 }}>{rate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', background: color + '22', color, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
