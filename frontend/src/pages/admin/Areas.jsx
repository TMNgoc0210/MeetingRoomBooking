import { useState, useEffect } from 'react'
import { areaService, uploadService } from '../../services'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY = { areaName: '', avatar: '', desc: '', visible: true }

const AdminAreas = () => {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, isEdit: false, areaID: null })
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuthStore()

  const fetchAreas = () => {
    setLoading(true)
    areaService.getAll()
      .then(r => setAreas(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAreas() }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setModal({ open: true, isEdit: false, areaID: null })
  }

  const openEdit = (a) => {
    setForm({ areaName: a.AreaName, avatar: a.Avatar || '', desc: a.Desc || '', visible: a.Visible !== false })
    setModal({ open: true, isEdit: true, areaID: a.AreaID })
  }

  const handleDelete = async (areaID) => {
    if (!window.confirm('Xác nhận xoá khu vực này?')) return
    try {
      await areaService.delete(areaID)
      toast.success('Đã xoá khu vực')
      fetchAreas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xoá thất bại')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadService.uploadImage(file)
      setForm(f => ({ ...f, avatar: res.data.data.url }))
      toast.success('Upload ảnh thành công')
    } catch {
      toast.error('Upload thất bại')
    }
    setUploading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.areaName) { toast.error('Thiếu tên khu vực'); return }
    setSaving(true)
    try {
      const payload = { ...form, createBy: user.UserID }
      if (modal.isEdit) {
        await areaService.update(modal.areaID, payload)
        toast.success('Cập nhật thành công')
      } else {
        await areaService.add(payload)
        toast.success('Thêm khu vực thành công')
      }
      setModal({ open: false })
      fetchAreas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu thất bại')
    }
    setSaving(false)
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Quản lý khu vực</h1>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fa fa-plus" /> Thêm khu vực
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên khu vực</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : areas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Chưa có khu vực nào
                  </td>
                </tr>
              ) : areas.map(a => (
                <tr key={a.AreaID}>
                  <td>
                    <img
                      src={a.Avatar || '/uploads/images/nopic.png'}
                      alt=""
                      style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
                    />
                  </td>
                  <td><strong>{a.AreaName}</strong></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.Desc || '—'}</td>
                  <td>
                    <span className={`badge ${a.Visible ? 'badge-success' : 'badge-danger'}`}>
                      {a.Visible ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>
                        <i className="fa fa-edit" />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.AreaID)}>
                        <i className="fa fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="modal-overlay" onClick={() => setModal({ open: false })}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal.isEdit ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}
              </span>
              <button className="modal-close" onClick={() => setModal({ open: false })}>
                <i className="fa fa-times" />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên khu vực <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-control"
                    value={form.areaName}
                    onChange={e => setForm({ ...form, areaName: e.target.value })}
                    placeholder="Nhập tên khu vực..."
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-control"
                    value={form.desc}
                    onChange={e => setForm({ ...form, desc: e.target.value })}
                    placeholder="Mô tả khu vực..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-check">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={e => setForm({ ...form, visible: e.target.checked })}
                    />
                    &nbsp;Hiển thị
                  </label>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Ảnh khu vực</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    {form.avatar && (
                      <img
                        src={form.avatar}
                        alt=""
                        style={{ height: 70, borderRadius: 6, border: '1px solid var(--border)' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                    <label className="upload-zone" style={{ cursor: 'pointer', flex: 1 }}>
                      {uploading
                        ? 'Đang upload...'
                        : <><i className="fa fa-upload" style={{ marginRight: 6 }} />Chọn ảnh (tối đa 5MB)</>
                      }
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false })}>
                  Huỷ
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : <><i className="fa fa-save" /> Lưu</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAreas
