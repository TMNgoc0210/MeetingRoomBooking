import { useState, useEffect } from 'react'
import { userService, facultyService, uploadService, roleService } from '../../services'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY = { userID: '', fullName: '', facultyID: '', mobi: '', email: '', visible: true, roles: false, password: '', avatar: '', roleIDs: [] }

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [faculties, setFaculties] = useState([])
  const [allRoles, setAllRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState({ fullName: '', facultyID: '' })
  const [modal, setModal] = useState({ open: false, isEdit: false })
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user: me } = useAuthStore()

  const fetchUsers = (params = {}) => {
    setLoading(true)
    userService.getAllAdmin(params)
      .then(r => setUsers(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
    facultyService.getAll().then(r => setFaculties(r.data.data || []))
    roleService.getAll().then(r => setAllRoles(r.data.data || []))
  }, [])

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, isEdit: false }) }
  const openEdit = (u) => {
    setForm({
      userID: u.UserID,
      fullName: u.FullName,
      facultyID: u.FacultyID || '',
      mobi: u.Mobi || '',
      email: u.Email || '',
      visible: u.Visible !== false,
      roles: !!u.Roles,
      password: '',
      avatar: u.Avatar || '',
      roleIDs: (u.assignedRoles || []).map(r => r.RoleID),
    })
    setModal({ open: true, isEdit: true })
  }

  const handleDelete = async (userID) => {
    if (userID === me?.UserID) { toast.error('Không thể xoá tài khoản đang đăng nhập'); return }
    if (!window.confirm('Xác nhận xoá người dùng này?')) return
    try {
      await userService.delete(userID)
      toast.success('Đã xoá người dùng')
      fetchUsers(search)
    } catch (err) { toast.error(err.response?.data?.message || 'Xoá thất bại') }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const res = await uploadService.uploadImage(file)
      setForm(f => ({ ...f, avatar: res.data.data.url }))
      toast.success('Upload ảnh thành công')
    } catch { toast.error('Upload thất bại') }
    setUploading(false)
  }

  const toggleRole = (roleID) => {
    setForm(f => ({
      ...f,
      roleIDs: f.roleIDs.includes(roleID)
        ? f.roleIDs.filter(id => id !== roleID)
        : [...f.roleIDs, roleID],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName) { toast.error('Thiếu họ tên'); return }
    if (!modal.isEdit && !form.password) { toast.error('Thiếu mật khẩu'); return }
    if (!modal.isEdit && !form.userID) { toast.error('Thiếu mã người dùng'); return }
    setSaving(true)
    try {
      const payload = { ...form, createBy: me.UserID }
      if (modal.isEdit) {
        await userService.update(form.userID, payload)
        toast.success('Cập nhật thành công')
      } else {
        await userService.add(payload)
        toast.success('Thêm người dùng thành công')
      }
      setModal({ open: false })
      fetchUsers(search)
    } catch (err) { toast.error(err.response?.data?.message || 'Lưu thất bại') }
    setSaving(false)
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Quản lý người dùng</h1>
          <button className="btn btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Thêm người dùng</button>
        </div>

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); fetchUsers(search) }} className="search-bar">
          <div className="search-input-wrap">
            <i className="fa fa-search" />
            <input className="form-control" placeholder="Tìm theo họ tên..."
              value={search.fullName} onChange={e => setSearch({ ...search, fullName: e.target.value })} />
          </div>
          <select className="form-control" style={{ maxWidth: 200 }} value={search.facultyID}
            onChange={e => setSearch({ ...search, facultyID: e.target.value })}>
            <option value="">Tất cả khoa</option>
            {faculties.map(f => <option key={f.FacultyID} value={f.FacultyID}>{f.FacultyName}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary"><i className="fa fa-search" /> Tìm</button>
        </form>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Ảnh</th><th>Mã / Họ tên</th><th>Khoa</th><th>Email</th><th>SĐT</th><th>Quyền / Vai trò</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Không có người dùng nào</td></tr>
              ) : users.map(u => (
                <tr key={u.UserID}>
                  <td>
                    <img src={u.Avatar || '/uploads/images/nopic.png'} alt="" className="avatar avatar-sm"
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.FullName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.UserID}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.FacultyName || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{u.Email || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{u.Mobi || '—'}</td>
                  <td>
                    <span className={`badge ${u.Roles ? 'badge-warning' : 'badge-accent'}`}>
                      {u.Roles ? <><i className="fa fa-crown" /> Admin</> : 'User'}
                    </span>
                    {u.assignedRoles?.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {u.assignedRoles.map(r => (
                          <span key={r.RoleID} style={{
                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10,
                            background: 'var(--accent-muted, rgba(201,169,110,0.15))',
                            color: 'var(--accent)', border: '1px solid var(--accent)',
                          }}>{r.Name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.Visible ? 'badge-success' : 'badge-danger'}`}>
                      {u.Visible ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}><i className="fa fa-edit" /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.UserID)} disabled={u.UserID === me?.UserID}><i className="fa fa-trash" /></button>
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
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</span>
              <button className="modal-close" onClick={() => setModal({ open: false })}><i className="fa fa-times" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mã người dùng *</label>
                    <input className="form-control" value={form.userID} disabled={modal.isEdit}
                      onChange={e => setForm({ ...form, userID: e.target.value })} placeholder="VD: NV001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Họ và tên *</label>
                    <input className="form-control" value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Khoa / Đơn vị</label>
                    <select className="form-control" value={form.facultyID}
                      onChange={e => setForm({ ...form, facultyID: e.target.value })}>
                      <option value="">-- Chọn khoa --</option>
                      {faculties.map(f => <option key={f.FacultyID} value={f.FacultyID}>{f.FacultyName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{modal.isEdit ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}</label>
                    <input type="password" className="form-control" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-control" value={form.mobi}
                      onChange={e => setForm({ ...form, mobi: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <label className="form-check"><input type="checkbox" checked={form.roles} onChange={e => setForm({ ...form, roles: e.target.checked })} /> Quyền Admin</label>
                  <label className="form-check"><input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} /> Hiển thị</label>
                </div>

                {allRoles.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Vai trò</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {allRoles.map(r => {
                        const checked = form.roleIDs.includes(r.RoleID)
                        return (
                          <label key={r.RoleID} style={{
                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                            padding: '5px 12px', borderRadius: 8, fontSize: '0.85rem',
                            border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                            background: checked ? 'rgba(201,169,110,0.12)' : 'var(--bg-secondary)',
                            color: checked ? 'var(--accent)' : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                          }}>
                            <input type="checkbox" style={{ display: 'none' }} checked={checked} onChange={() => toggleRole(r.RoleID)} />
                            <i className={`fa ${checked ? 'fa-check-square' : 'fa-square'}`} />
                            {r.Name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="form-group mb-0">
                  <label className="form-label">Ảnh đại diện</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img src={form.avatar || '/uploads/images/nopic.png'} alt="" className="avatar avatar-md"
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }} />
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

export default AdminUsers
