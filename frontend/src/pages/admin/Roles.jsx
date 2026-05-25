import { useState, useEffect } from 'react'
import { roleService } from '../../services'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', description: '' }

const RoleModal = ({ role, onClose, onSaved }) => {
  const [form, setForm] = useState(role ? { name: role.Name, description: role.Description || '' } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Tên vai trò không được để trống')
    setSaving(true)
    try {
      if (role) await roleService.update(role.RoleID, form)
      else await roleService.add(form)
      toast.success(role ? 'Đã cập nhật vai trò' : 'Đã thêm vai trò')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Thao tác thất bại')
    }
    setSaving(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.75rem', width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
            <i className={`fa ${role ? 'fa-edit' : 'fa-plus-circle'}`} style={{ marginRight: 8, color: 'var(--accent)' }} />
            {role ? 'Chỉnh sửa vai trò' : 'Thêm vai trò'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            <i className="fa fa-times" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Tên vai trò <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="VD: Người quản lý đặt phòng"
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả quyền hạn của vai trò này..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Đang lưu...' : <><i className="fa fa-save" style={{ marginRight: 6 }} />{role ? 'Cập nhật' : 'Thêm vai trò'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminRoles = () => {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | role-object
  const [deleting, setDeleting] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await roleService.getAll()
      setRoles(res.data.data || [])
    } catch {
      toast.error('Không thể tải danh sách vai trò')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (role) => {
    if (!window.confirm(`Xóa vai trò "${role.Name}"?`)) return
    setDeleting(role.RoleID)
    try {
      await roleService.delete(role.RoleID)
      toast.success('Đã xóa vai trò')
      if (selected?.RoleID === role.RoleID) setSelected(null)
      load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xóa thất bại')
    }
    setDeleting(null)
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <i className="fa fa-user-tag" style={{ marginRight: 10, color: 'var(--accent)' }} />Vai trò
          </h1>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <i className="fa fa-plus" style={{ marginRight: 6 }} />Thêm vai trò
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Main table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />Đang tải...
              </div>
            ) : roles.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa fa-user-tag" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem', opacity: 0.3 }} />
                Chưa có vai trò nào
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                    <th style={thStyle}>Tên vai trò</th>
                    <th style={thStyle}>Mô tả</th>
                    <th style={{ ...thStyle, width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => {
                    const isSelected = selected?.RoleID === role.RoleID
                    return (
                      <tr
                        key={role.RoleID}
                        onClick={() => setSelected(isSelected ? null : role)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(201,169,110,0.08)' : '',
                          borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                      >
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: isSelected ? 'rgba(201,169,110,0.2)' : 'var(--bg-hover)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <i className="fa fa-user-shield" style={{ fontSize: '0.8rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                            </div>
                            <span style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.9rem', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {role.Name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {role.Description || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Chưa có mô tả</span>}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              title="Chỉnh sửa"
                              onClick={() => setModal(role)}
                              style={iconBtn}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <i className="fa fa-edit" />
                            </button>
                            <button
                              title="Xóa"
                              disabled={deleting === role.RoleID}
                              onClick={() => handleDelete(role)}
                              style={iconBtn}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <i className={deleting === role.RoleID ? 'fa fa-spinner fa-spin' : 'fa fa-trash'} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(201,169,110,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="fa fa-user-shield" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selected.Name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {selected.RoleID}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
                >
                  <i className="fa fa-times" />
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>Mô tả</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                {selected.Description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có mô tả</span>}
              </div>

              {selected.CreatedAt && (
                <>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>Ngày tạo</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(selected.CreatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => setModal(selected)}>
                  <i className="fa fa-edit" style={{ marginRight: 6 }} />Chỉnh sửa
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleDelete(selected)}
                >
                  <i className="fa fa-trash" style={{ marginRight: 6 }} />Xóa
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {roles.length} vai trò
        </div>
      </div>

      {modal && (
        <RoleModal
          role={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { load(); if (modal !== 'add') setSelected(s => s?.RoleID === modal.RoleID ? null : s) }}
        />
      )}
    </div>
  )
}

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '0.3rem 0.5rem', borderRadius: 6, color: 'var(--text-muted)',
  transition: 'color 0.15s',
}

export default AdminRoles
