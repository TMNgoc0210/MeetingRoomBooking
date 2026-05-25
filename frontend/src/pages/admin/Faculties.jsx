import { useState, useEffect } from 'react'
import { facultyService, uploadService } from '../../services'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY = { facultyName: '', avatar: '', desc: '', visible: true }

const AdminFaculties = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, isEdit: false, id: null })
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuthStore()

  const fetchData = () => {
    setLoading(true)
    facultyService.getAll().then(r => setItems(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetchData() }, [])

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, isEdit: false, id: null }) }
  const openEdit = (f) => {
    setForm({ facultyName: f.FacultyName, avatar: f.Avatar || '', desc: f.Desc || '', visible: f.Visible !== false })
    setModal({ open: true, isEdit: true, id: f.FacultyID })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xoá khoa này?')) return
    try { await facultyService.delete(id); toast.success('Đã xoá'); fetchData() }
    catch (err) { toast.error(err.response?.data?.message || 'Xoá thất bại') }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try { const res = await uploadService.uploadImage(file); setForm(f => ({ ...f, avatar: res.data.data.url })); toast.success('Upload thành công') }
    catch { toast.error('Upload thất bại') }
    setUploading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.facultyName) { toast.error('Thiếu tên khoa'); return }
    setSaving(true)
    try {
      const payload = { ...form, createBy: user.UserID }
      if (modal.isEdit) { await facultyService.update(modal.id, payload); toast.success('Cập nhật thành công') }
      else { await facultyService.add(payload); toast.success('Thêm khoa thành công') }
      setModal({ open: false }); fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Lưu thất bại') }
    setSaving(false)
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Quản lý khoa / đơn vị</h1>
          <button className="btn btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Thêm khoa</button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Ảnh</th><th>Tên khoa</th><th>Mô tả</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chưa có khoa nào</td></tr>
              ) : items.map(f => (
                <tr key={f.FacultyID}>
                  <td>
                    <img src={f.Avatar || '/uploads/images/nopic.png'} alt=""
                      style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }} />
                  </td>
                  <td><strong>{f.FacultyName}</strong></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{f.Desc || '—'}</td>
                  <td><span className={`badge ${f.Visible ? 'badge-success' : 'badge-danger'}`}>{f.Visible ? 'Hoạt động' : 'Ẩn'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}><i className="fa fa-edit" /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.FacultyID)}><i className="fa fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="modal-overlay" onClick={() => setModal({ open: false })}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.isEdit ? 'Chỉnh sửa khoa' : 'Thêm khoa mới'}</span>
              <button className="modal-close" onClick={() => setModal({ open: false })}><i className="fa fa-times" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên khoa / đơn vị *</label>
                  <input className="form-control" value={form.facultyName} onChange={e => setForm({ ...form, facultyName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-control" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-check"><input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} /> Hiển thị</label>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Ảnh</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    {form.avatar && <img src={form.avatar} alt="" style={{ height: 70, borderRadius: 6, border: '1px solid var(--border)' }} onError={e => { e.target.style.display = 'none' }} />}
                    <label className="upload-zone" style={{ cursor: 'pointer', flex: 1 }}>
                      {uploading ? 'Đang upload...' : <><i className="fa fa-upload" style={{ marginRight: 6 }} />Chọn ảnh</>}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false })}>Huỷ</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : <><i className="fa fa-save" /> Lưu</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminFaculties
