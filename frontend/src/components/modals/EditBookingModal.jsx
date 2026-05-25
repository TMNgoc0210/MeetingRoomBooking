import { useState, useEffect } from 'react'
import { bookingService, facultyService, lineRoomService } from '../../services'
import useUIStore from '../../store/uiStore'
import useAuthStore from '../../store/authStore'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const EditBookingModal = () => {
  const { editBookingModal, closeEditBookingModal } = useUIStore()
  const { user } = useAuthStore()
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [form, setForm] = useState({
    facultyID: '', roomID: '', timeStart: '', timeEnd: '',
    title: '', content: '', note: '', numberPerson: 1,
  })

  useEffect(() => {
    facultyService.getList().then(r => setFaculties(r.data.data || []))
  }, [])

  useEffect(() => {
    if (editBookingModal.open && editBookingModal.lineRoomID) {
      setFetching(true)
      lineRoomService.getForEdit(editBookingModal.lineRoomID)
        .then(r => {
          const d = r.data.data
          setForm({
            facultyID: d.FacultyID || '',
            roomID: d.RoomID,
            timeStart: dayjs(d.TimeStart).format('YYYY-MM-DDTHH:mm'),
            timeEnd: dayjs(d.TimeEnd).format('YYYY-MM-DDTHH:mm'),
            title: d.Title || '',
            content: d.Content || '',
            note: d.Note || '',
            numberPerson: d.NumberPerson || 1,
          })
        })
        .catch(() => toast.error('Không thể tải thông tin đặt phòng'))
        .finally(() => setFetching(false))
    }
  }, [editBookingModal.lineRoomID, editBookingModal.open])

  if (!editBookingModal.open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.timeStart || !form.timeEnd) { toast.error('Vui lòng chọn thời gian'); return }
    if (!form.title) { toast.error('Vui lòng nhập tiêu đề'); return }
    if (form.timeStart >= form.timeEnd) { toast.error('Thời gian kết thúc phải sau bắt đầu'); return }

    setLoading(true)
    try {
      await bookingService.update(editBookingModal.lineRoomID, {
        userID: user.UserID,
        facultyID: form.facultyID,
        roomID: form.roomID,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
        title: form.title,
        content: form.content,
        note: form.note,
        numberPerson: form.numberPerson,
      })
      toast.success('Cập nhật lịch đặt thành công!')
      closeEditBookingModal()
      useUIStore.getState().triggerRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeEditBookingModal}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><i className="fa fa-edit" /> &nbsp;Chỉnh sửa lịch đặt phòng</span>
          <button className="modal-close" onClick={closeEditBookingModal}><i className="fa fa-times" /></button>
        </div>
        {fetching ? (
          <div className="loading-center" style={{ padding: '2rem' }}><div className="spinner" /></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label className="form-label">Thời gian bắt đầu <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="datetime-local" className="form-control"
                    value={form.timeStart} onChange={e => setForm({ ...form, timeStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Thời gian kết thúc <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="datetime-local" className="form-control"
                    value={form.timeEnd} onChange={e => setForm({ ...form, timeEnd: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tiêu đề <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-control" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
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
                  <label className="form-label">Số người</label>
                  <input type="number" className="form-control" min={1}
                    value={form.numberPerson} onChange={e => setForm({ ...form, numberPerson: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung</label>
                <textarea className="form-control" value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Ghi chú</label>
                <input className="form-control" value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeEditBookingModal}>Huỷ</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : <><i className="fa fa-save" /> Lưu thay đổi</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditBookingModal
