import { useState, useEffect, useCallback } from 'react'
import { bookingService } from '../../services'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const STATUS_LABEL = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối', 3: 'Đã huỷ' }
const STATUS_COLOR = { 0: '#b45309', 1: '#2d6a2d', 2: '#7f1d1d', 3: '#374151' }

const Approvals = () => {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState({ open: false, id: null })
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    bookingService.getPending()
      .then(r => setList(r.data.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id) => {
    setProcessing(id)
    try {
      await bookingService.approve(id)
      toast.success('Đã phê duyệt lịch đặt phòng')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống')
    } finally { setProcessing(null) }
  }

  const handleReject = async () => {
    if (!reason.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return }
    setProcessing(rejectModal.id)
    try {
      await bookingService.reject(rejectModal.id, reason)
      toast.success('Đã từ chối lịch đặt phòng')
      setRejectModal({ open: false, id: null })
      setReason('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống')
    } finally { setProcessing(null) }
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title">
          <i className="fa fa-clipboard-check" /> Phê duyệt lịch đặt phòng
        </h1>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>
              Lịch chờ duyệt
              {list.length > 0 && (
                <span style={{ marginLeft: 8, background: '#b45309', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: '0.78rem' }}>
                  {list.length}
                </span>
              )}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <i className="fa fa-sync-alt" /> Làm mới
            </button>
          </div>

          {loading ? (
            <div className="loading-center" style={{ height: 200 }}><div className="spinner" /></div>
          ) : list.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <i className="fa fa-check-circle" style={{ color: 'var(--success)' }} />
              <h3>Không có lịch nào chờ duyệt</h3>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <th style={thStyle}>Người đặt</th>
                  <th style={thStyle}>Phòng</th>
                  <th style={thStyle}>Thời gian</th>
                  <th style={thStyle}>Tiêu đề</th>
                  <th style={thStyle}>Số người</th>
                  <th style={thStyle}>Ngày đặt</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.LineRoomID} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{b.UserName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.FacultyName}</div>
                    </td>
                    <td style={tdStyle}>
                      <div>{b.RoomName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.AreaName}</div>
                      {b.IsVIP === 1 && (
                        <span style={{ fontSize: '0.72rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '1px 5px' }}>VIP</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div>{dayjs(b.TimeStart).format('DD/MM/YYYY')}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {dayjs(b.TimeStart).format('HH:mm')} – {dayjs(b.TimeEnd).format('HH:mm')}
                      </div>
                    </td>
                    <td style={tdStyle}>{b.Title}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{b.NumberPerson}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {dayjs(b.CreateDate).format('DD/MM HH:mm')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#166534', color: '#fff', border: 'none' }}
                          disabled={processing === b.LineRoomID}
                          onClick={() => handleApprove(b.LineRoomID)}
                        >
                          <i className="fa fa-check" /> Duyệt
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={processing === b.LineRoomID}
                          onClick={() => { setRejectModal({ open: true, id: b.LineRoomID }); setReason('') }}
                        >
                          <i className="fa fa-times" /> Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={() => setRejectModal({ open: false, id: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title"><i className="fa fa-times-circle" /> Từ chối lịch đặt</span>
              <button className="modal-close" onClick={() => setRejectModal({ open: false, id: null })}>
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-0">
                <label className="form-label">Lý do từ chối <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Nhập lý do từ chối..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal({ open: false, id: null })}>Huỷ</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={!!processing}>
                <i className="fa fa-times" /> Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 500 }
const tdStyle = { padding: '0.875rem 1rem', verticalAlign: 'middle' }

export default Approvals
