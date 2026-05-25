import { useState, useEffect } from 'react'
import { userService, uploadService } from '../../services'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import toast from 'react-hot-toast'

const UserModal = () => {
  const { userModal, closeUserModal } = useUIStore()
  const { user: me, setAuth } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ fullName: '', mobi: '', email: '', avatar: '' })

  useEffect(() => {
    if (userModal.open && userModal.userID) {
      setLoading(true)
      setEditing(false)
      userService.getDetail(userModal.userID)
        .then(res => {
          const d = res.data.data
          setData(d)
          setForm({ 
            fullName: d.FullName || '', 
            mobi: d.Mobi || '', 
            email: d.Email || '', 
            avatar: d.Avatar || '',
            facultyID: d.FacultyID,
            roles: d.Roles,
            visible: d.Visible !== false
          })
        })
        .catch(() => toast.error('Không thể tải thông tin người dùng'))
        .finally(() => setLoading(false))
    }
  }, [userModal.userID, userModal.open])

  if (!userModal.open) return null

  const isMe = me?.UserID === userModal.userID
  const canEdit = isMe || me?.Roles

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadService.uploadImage(file)
      setForm(f => ({ ...f, avatar: res.data.data.url }))
      toast.success('Upload ảnh thành công')
    } catch { toast.error('Upload thất bại') }
    setUploading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName) { toast.error('Vui lòng nhập họ tên'); return }
    setSaving(true)
    try {
      await userService.update(userModal.userID, { ...form, createBy: me.UserID })
      toast.success('Cập nhật thành công')
      setEditing(false)
      // Nếu đang sửa chính mình thì update auth store
      if (isMe) {
        setAuth({ ...me, FullName: form.fullName, Mobi: form.mobi, Email: form.email, Avatar: form.avatar }, useAuthStore.getState().accessToken)
      }
      setData(d => ({ ...d, FullName: form.fullName, Mobi: form.mobi, Email: form.email, Avatar: form.avatar }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeUserModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><i className="fa fa-user-circle" /> &nbsp;Thông tin cá nhân</span>
          <button className="modal-close" onClick={closeUserModal}><i className="fa fa-times" /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : data ? (
            editing ? (
              <form onSubmit={handleSave}>
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <img
                    src={form.avatar || '/uploads/images/nopic.png'}
                    alt=""
                    className="avatar avatar-lg"
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
                  />
                  <label className="upload-zone" style={{ cursor: 'pointer', flex: 1, padding: '0.75rem' }}>
                    {uploading ? 'Đang upload...' : <><i className="fa fa-upload" style={{ marginRight: 6 }} />Đổi ảnh đại diện</>}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-control" value={form.mobi} onChange={e => setForm({ ...form, mobi: e.target.value })} />
                </div>

                <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem', border: 'none' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Huỷ</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : <><i className="fa fa-save" /> Lưu</>}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {/* Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img
                    src={data.Avatar || '/uploads/images/nopic.png'}
                    alt=""
                    className="avatar avatar-lg"
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{data.FullName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <span className={`badge ${data.Roles ? 'badge-warning' : 'badge-accent'}`}>
                        {data.Roles ? <><i className="fa fa-crown" /> Admin</> : 'User'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <InfoRow icon="id-card" label="Mã NV" value={data.UserID} />
                  <InfoRow icon="envelope" label="Email" value={data.Email} />
                  <InfoRow icon="phone" label="SĐT" value={data.Mobi} />
                  <InfoRow icon="university" label="Khoa" value={data.FacultyName} />
                </div>

                {canEdit && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '1.5rem', width: '100%' }}
                    onClick={() => setEditing(true)}
                  >
                    <i className="fa fa-edit" /> Chỉnh sửa thông tin
                  </button>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
    <i className={`fa fa-${icon}`} style={{ width: 16, color: 'var(--accent)', flexShrink: 0 }} />
    <span style={{ color: 'var(--text-muted)', minWidth: 60 }}>{label}:</span>
    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
)

export default UserModal
