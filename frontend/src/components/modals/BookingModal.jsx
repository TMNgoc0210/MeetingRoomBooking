import { useState, useEffect, useRef } from 'react'
import { bookingService, facultyService, userService, attachmentService } from '../../services'
import useUIStore from '../../store/uiStore'
import useAuthStore from '../../store/authStore'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const RECURRING_OPTIONS = [
  { value: '', label: 'Không lặp lại' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
]

const SectionHeader = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1.25rem 0 0.875rem', padding: '0 0 0.5rem', borderBottom: '1px solid var(--border)' }}>
    <i className={`fa ${icon}`} style={{ color: 'var(--accent)', fontSize: '0.9rem' }} />
    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{title}</span>
  </div>
)

const BookingModal = () => {
  const { bookingModal, closeBookingModal } = useUIStore()
  const { user } = useAuthStore()
  const [faculties, setFaculties] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const today = dayjs().format('YYYY-MM-DD')

  const [form, setForm] = useState({
    date: today,
    startTime: '08:00',
    endTime: '09:00',
    title: '',
    content: '',
    note: '',
    facultyID: '',
    numberPerson: 1,
    recurringType: '',
    recurringEnd: '',
    attendees: [],
    hasServiceRequest: false,
    serviceRequest: '',
  })
  const [attachments, setAttachments] = useState([]) // { file, name, size } chưa upload
  const fileInputRef = useRef(null)

  useEffect(() => {
    facultyService.getList().then(r => setFaculties(r.data.data || []))
    userService.getAll().then(r => setAllUsers(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) setForm(f => ({ ...f, facultyID: user.FacultyID || '', date: today }))
  }, [user])

  if (!bookingModal.open) return null
  const room = bookingModal.room
  const isVIP = room?.IsVIP === 1

  const filteredUsers = allUsers.filter(u =>
    u.UserID !== user?.UserID &&
    !form.attendees.includes(u.UserID) &&
    (userSearch === '' ||
      u.FullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.UserID?.toLowerCase().includes(userSearch.toLowerCase()))
  ).slice(0, 8)

  const addAttendee = (uid) => {
    setForm(f => ({ ...f, attendees: [...f.attendees, uid] }))
    setUserSearch('')
  }
  const removeAttendee = (uid) => setForm(f => ({ ...f, attendees: f.attendees.filter(a => a !== uid) }))
  const getAttendeeName = (uid) => allUsers.find(u => u.UserID === uid)?.FullName || uid

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Vui lòng đăng nhập'); return }
    if (!form.date) { toast.error('Vui lòng chọn ngày'); return }
    if (!form.startTime || !form.endTime) { toast.error('Vui lòng chọn giờ'); return }
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề cuộc họp'); return }
    if (form.startTime >= form.endTime) { toast.error('Giờ kết thúc phải sau giờ bắt đầu'); return }
    if (form.recurringType && !form.recurringEnd) { toast.error('Vui lòng chọn ngày kết thúc lặp lại'); return }

    const timeStart = `${form.date} ${form.startTime}:00`
    const timeEnd = `${form.date} ${form.endTime}:00`

    setLoading(true)
    try {
      const res = await bookingService.book({
        userID: user.UserID,
        facultyID: form.facultyID || null,
        roomID: room.RoomID,
        timeStart,
        timeEnd,
        title: form.title,
        content: form.content,
        note: form.note,
        serviceRequest: form.hasServiceRequest ? form.serviceRequest.trim() || null : null,
        numberPerson: form.numberPerson,
        attendees: form.attendees,
        recurringType: form.recurringType || null,
        recurringEnd: form.recurringEnd || null,
      })

      // Upload file đính kèm nếu có
      const lineRoomID = res.data.data?.lineRoomIDs?.[0]
      if (lineRoomID && attachments.length > 0) {
        for (const att of attachments) {
          try { await attachmentService.upload(lineRoomID, att.file) } catch (_) {}
        }
      }

      toast.success(res.data.message || 'Đặt phòng thành công!')
      closeBookingModal()
      useUIStore.getState().triggerRefresh()
      resetForm()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt phòng thất bại')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      date: today, startTime: '08:00', endTime: '09:00',
      title: '', content: '', note: '',
      facultyID: user?.FacultyID || '', numberPerson: 1,
      recurringType: '', recurringEnd: '', attendees: [],
      hasServiceRequest: false, serviceRequest: '',
    })
    setAttachments([])
  }

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files)
    const newAtts = files.map(f => ({ file: f, name: f.name, size: f.size }))
    setAttachments(prev => [...prev, ...newAtts])
    e.target.value = ''
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="modal-overlay" onClick={closeBookingModal}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <span className="modal-title">
            <i className="fa fa-calendar-plus" style={{ color: 'var(--accent)' }} />
            &nbsp;Đặt phòng họp
          </span>
          <button className="modal-close" onClick={closeBookingModal}><i className="fa fa-times" /></button>
        </div>

        {/* Room info banner */}
        <div style={{
          flexShrink: 0, padding: '0.75rem 1.5rem',
          background: isVIP ? 'linear-gradient(135deg, #451a03 0%, #2c1108 100%)' : 'var(--bg-hover)',
          borderBottom: `1px solid ${isVIP ? '#92400e' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: isVIP ? '#92400e' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fa fa-door-open" style={{ color: isVIP ? '#fde68a' : 'var(--accent)', fontSize: '1rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              {room?.RoomName}
              {isVIP && <span style={{ fontSize: '0.68rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>VIP</span>}
            </div>
            <div style={{ fontSize: '0.8rem', color: isVIP ? '#fde68a' : 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
              <span><i className="fa fa-map-marker-alt" style={{ marginRight: 4 }} />{room?.AreaName || '—'}</span>
              <span><i className="fa fa-users" style={{ marginRight: 4 }} />Tối đa {room?.Seat} người</span>
            </div>
          </div>
          {isVIP && (
            <div style={{ fontSize: '0.75rem', color: '#fde68a', background: 'rgba(146,64,14,0.4)', borderRadius: 6, padding: '0.4rem 0.75rem', border: '1px solid #92400e', flexShrink: 0 }}>
              <i className="fa fa-info-circle" style={{ marginRight: 4 }} />Cần Admin duyệt
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ padding: '0 1.5rem 1rem' }}>

            {/* Section: Thời gian */}
            <SectionHeader icon="fa-clock" title="Thời gian đặt phòng" />
            <div className="form-group">
              <label className="form-label">Ngày họp <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="date" className="form-control"
                value={form.date}
                min={today}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div className="form-group">
                <label className="form-label">Giờ bắt đầu <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="time" className="form-control"
                  value={form.startTime}
                  min="07:00" max="20:30"
                  onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Giờ kết thúc <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="time" className="form-control"
                  value={form.endTime}
                  min={form.startTime || '07:30'} max="21:00"
                  onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>

            {/* Section: Thông tin cuộc họp */}
            <SectionHeader icon="fa-clipboard" title="Thông tin cuộc họp" />
            <div className="form-group">
              <label className="form-label">Tiêu đề <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="form-control" placeholder="Nhập tiêu đề cuộc họp..."
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div className="form-group">
                <label className="form-label">Khoa / Đơn vị</label>
                <select className="form-control" value={form.facultyID}
                  onChange={e => setForm({ ...form, facultyID: e.target.value })}>
                  <option value="">-- Chọn khoa --</option>
                  {faculties.map(f => <option key={f.FacultyID} value={f.FacultyID}>{f.FacultyName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Số người tham dự</label>
                <input type="number" className="form-control" min={1} max={room?.Seat || 100}
                  value={form.numberPerson}
                  onChange={e => setForm({ ...form, numberPerson: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nội dung / Chương trình họp</label>
              <textarea className="form-control" rows={2} placeholder="Mô tả nội dung, chương trình cuộc họp..."
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>

            {/* Section: Thành viên */}
            <SectionHeader icon="fa-users" title="Thành viên tham dự" />
            {form.attendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {form.attendees.map(uid => (
                  <span key={uid} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                    borderRadius: 20, padding: '4px 10px 4px 12px', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fa fa-user" style={{ fontSize: '0.72rem', color: 'var(--accent)' }} />
                    {getAttendeeName(uid)}
                    <button type="button" onClick={() => removeAttendee(uid)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1, marginLeft: 2 }}>
                      <i className="fa fa-times" style={{ fontSize: '0.72rem' }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <i className="fa fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem' }} />
                <input className="form-control" style={{ paddingLeft: 32 }}
                  placeholder="Tìm thành viên theo tên hoặc ID..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              {userSearch && filteredUsers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, border: '1px solid var(--border)', borderRadius: 8, marginTop: 2, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
                  {filteredUsers.map(u => (
                    <div key={u.UserID} onClick={() => addAttendee(u.UserID)}
                      style={{ padding: '0.5rem 0.875rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span><i className="fa fa-user" style={{ marginRight: 8, color: 'var(--text-muted)', fontSize: '0.78rem' }} />{u.FullName}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.FacultyName || u.UserID}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {form.attendees.length === 0 && !userSearch && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: -8, marginBottom: 8 }}>
                Tìm và thêm thành viên tham gia cuộc họp
              </div>
            )}

            {/* Section: Lặp lại */}
            <SectionHeader icon="fa-redo" title="Cài đặt lịch lặp lại" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div className="form-group" style={{ marginBottom: form.recurringType ? undefined : 0 }}>
                <label className="form-label">Lặp lại</label>
                <select className="form-control" value={form.recurringType}
                  onChange={e => setForm({ ...form, recurringType: e.target.value, recurringEnd: '' })}>
                  {RECURRING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.recurringType && (
                <div className="form-group">
                  <label className="form-label">Kết thúc lặp <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" className="form-control"
                    value={form.recurringEnd}
                    min={form.date || today}
                    onChange={e => setForm({ ...form, recurringEnd: e.target.value })} />
                </div>
              )}
            </div>

            {/* Ghi chú */}
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">Ghi chú thêm</label>
              <input className="form-control" placeholder="Ghi chú nội bộ..."
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>

            {/* Section: Yêu cầu dịch vụ */}
            <SectionHeader icon="fa-concierge-bell" title="Yêu cầu dịch vụ" />
            <div style={{ marginBottom: 12 }}>
              <label className="form-check" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.hasServiceRequest}
                  onChange={e => setForm({ ...form, hasServiceRequest: e.target.checked, serviceRequest: '' })} />
                {' '}Có yêu cầu dịch vụ hỗ trợ (nước uống, thiết bị thêm...)
              </label>
            </div>
            {form.hasServiceRequest && (
              <div className="form-group">
                <textarea className="form-control" rows={2}
                  placeholder="Mô tả yêu cầu: VD: Nhờ HCTH sắp xếp nước uống và đồ ăn nhẹ trong phòng họp..."
                  value={form.serviceRequest}
                  onChange={e => setForm({ ...form, serviceRequest: e.target.value })} />
              </div>
            )}

            {/* Section: Tài liệu đính kèm */}
            <SectionHeader icon="fa-paperclip" title="Tài liệu đính kèm" />
            <div>
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {attachments.map((att, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg-hover)', borderRadius: 8, padding: '0.4rem 0.75rem',
                      border: '1px solid var(--border)', fontSize: '0.82rem',
                    }}>
                      <i className="fa fa-file" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(att.size)}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                        <i className="fa fa-times" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileAdd}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg" />
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.82rem' }}>
                <i className="fa fa-upload" style={{ marginRight: 6 }} />Đính kèm file
              </button>
              <span style={{ marginLeft: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                PDF, Word, Excel, ảnh... tối đa 20MB/file
              </span>
            </div>
          </div>
        </form>

        {/* Footer — outside the scroll area */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={closeBookingModal}>Huỷ</button>
          <button className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
            {loading
              ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Đang xử lý...</>
              : <><i className="fa fa-check" style={{ marginRight: 6 }} />{isVIP ? 'Gửi yêu cầu duyệt' : 'Xác nhận đặt phòng'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingModal
