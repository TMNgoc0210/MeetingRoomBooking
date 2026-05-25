import { useState, useEffect } from 'react'
import { equipmentAdminService, roomService } from '../../services'
import toast from 'react-hot-toast'

const ICON_OPTIONS = [
  { value: 'fa-tv',              label: 'Màn hình' },
  { value: 'fa-video',           label: 'Camera' },
  { value: 'fa-microphone',      label: 'Micro' },
  { value: 'fa-wifi',            label: 'WiFi' },
  { value: 'fa-snowflake',       label: 'Điều hòa' },
  { value: 'fa-chalkboard',      label: 'Bảng trắng' },
  { value: 'fa-print',           label: 'Máy in' },
  { value: 'fa-phone',           label: 'Điện thoại' },
  { value: 'fa-desktop',         label: 'Máy tính' },
  { value: 'fa-plug',            label: 'Ổ cắm điện' },
  { value: 'fa-lightbulb',       label: 'Đèn chiếu' },
  { value: 'fa-volume-up',       label: 'Loa' },
]

const EMPTY = { name: '', icon: 'fa-tv', quantity: 1, note: '' }

const EquipmentModal = ({ item, rooms, onClose, onSaved }) => {
  const [form, setForm] = useState(item
    ? { name: item.Name, icon: item.Icon || 'fa-tv', quantity: item.Quantity ?? 1, roomID: item.RoomID, note: item.Note || '' }
    : { ...EMPTY, roomID: rooms[0]?.RoomID || '' }
  )
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên thiết bị')
    if (!form.roomID) return toast.error('Vui lòng chọn phòng')
    setSaving(true)
    try {
      const payload = { name: form.name, icon: form.icon, quantity: Number(form.quantity), roomID: form.roomID }
      if (item) await equipmentAdminService.update(item.EquipmentID, payload)
      else await equipmentAdminService.add(payload)
      toast.success(item ? 'Đã cập nhật thiết bị' : 'Đã thêm thiết bị')
      onSaved()
      onClose()
    } catch {
      toast.error('Thao tác thất bại')
    }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.75rem',
        width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
            {item ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            <i className="fa fa-times" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Phòng *</label>
            <select className="form-control" value={form.roomID} onChange={e => set('roomID', e.target.value)}>
              {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Tên thiết bị *</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Mán hình 4K Samsung" />
          </div>

          <div>
            <label className="form-label">Biểu tượng</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICON_OPTIONS.map(o => (
                <button key={o.value} type="button"
                  onClick={() => set('icon', o.value)}
                  title={o.label}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                    border: '2px solid',
                    borderColor: form.icon === o.value ? 'var(--accent)' : 'var(--border)',
                    background: form.icon === o.value ? 'rgba(201,169,110,0.12)' : 'var(--bg-hover)',
                    color: form.icon === o.value ? 'var(--accent)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem',
                  }}>
                  <i className={`fa ${o.value}`} />
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Số lượng</label>
            <input type="number" className="form-control" min={1} style={{ width: 120 }}
              value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Đang lưu...' : <><i className="fa fa-save" style={{ marginRight: 6 }} />{item ? 'Cập nhật' : 'Thêm'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminEquipment = () => {
  const [list, setList] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | item
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (filterRoom) params.roomID = filterRoom
      const res = await equipmentAdminService.getAll(params)
      const data = res.data.data || []
      setList(data)
      // Extract unique rooms from data for filter dropdown
      const roomMap = {}
      data.forEach(e => { if (e.RoomID) roomMap[e.RoomID] = { RoomID: e.RoomID, RoomName: e.RoomName } })
      // Merge with any existing rooms
      setRooms(prev => {
        const merged = { ...Object.fromEntries(prev.map(r => [r.RoomID, r])), ...roomMap }
        return Object.values(merged).sort((a, b) => a.RoomName?.localeCompare(b.RoomName))
      })
    } catch {
      toast.error('Không thể tải danh sách thiết bị')
    }
    setLoading(false)
  }

  const loadRooms = async () => {
    try {
      const res = await roomService.getAll()
      setRooms((res.data.data || []).map(r => ({ RoomID: r.RoomID, RoomName: r.RoomName })))
    } catch {}
  }

  useEffect(() => { loadRooms() }, [])
  useEffect(() => { load() }, [search, filterRoom])

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await equipmentAdminService.delete(id)
      toast.success('Đã xóa thiết bị')
      load()
    } catch {
      toast.error('Xóa thất bại')
    }
    setDeleting(null)
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 960 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <i className="fa fa-tools" style={{ marginRight: 10, color: 'var(--accent)' }} />Quản lý thiết bị
          </h1>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <i className="fa fa-plus" style={{ marginRight: 6 }} />Thêm thiết bị
          </button>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ position: 'relative' }}>
              <i className="fa fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 32 }}
                placeholder="Tìm kiếm thiết bị..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <select className="form-control" style={{ width: 220 }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
            <option value="">Tất cả phòng</option>
            {rooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              Đang tải...
            </div>
          ) : list.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa fa-tools" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', opacity: 0.3 }} />
              Không có thiết bị nào
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                  {['Thiết bị', 'Phòng', 'Khu vực', 'Số lượng', ''].map((h, i) => (
                    <th key={i} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(eq => (
                  <tr key={eq.EquipmentID} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: 'rgba(201,169,110,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <i className={`fa ${eq.Icon || 'fa-tools'}`} style={{ color: 'var(--accent)', fontSize: '0.9rem' }} />
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{eq.Name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {eq.RoomName || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {eq.AreaName || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        background: 'rgba(201,169,110,0.1)', color: 'var(--accent)',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        x{eq.Quantity ?? 1}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          title="Chỉnh sửa"
                          onClick={() => setModal(eq)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0.5rem', borderRadius: 6, color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <i className="fa fa-edit" />
                        </button>
                        <button
                          title="Xóa"
                          disabled={deleting === eq.EquipmentID}
                          onClick={() => {
                            if (window.confirm(`Xóa thiết bị "${eq.Name}"?`)) handleDelete(eq.EquipmentID)
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0.5rem', borderRadius: 6, color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <i className={deleting === eq.EquipmentID ? 'fa fa-spinner fa-spin' : 'fa fa-trash'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {list.length} thiết bị
        </div>
      </div>

      {modal && (
        <EquipmentModal
          item={modal === 'add' ? null : modal}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

export default AdminEquipment
