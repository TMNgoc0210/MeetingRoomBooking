import { useState, useEffect } from 'react'
import { roomService, areaService, uploadService, equipmentService } from '../../services'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  roomName: '', areaID: '', seat: 10,
  phoneCall: false, videoCall: false,
  isVIP: false, vipCondition: 0, vipMinutes: 60,
  visible: true, desc: '', avatar: '',
}

const ICON_OPTIONS = [
  { value: 'fa-desktop',     label: 'Màn hình / Máy chiếu' },
  { value: 'fa-tv',          label: 'TV / LED' },
  { value: 'fa-microphone',  label: 'Micro' },
  { value: 'fa-volume-up',   label: 'Loa' },
  { value: 'fa-video',       label: 'Camera' },
  { value: 'fa-wind',        label: 'Điều hòa' },
  { value: 'fa-chalkboard',  label: 'Bảng' },
  { value: 'fa-wifi',        label: 'Wifi' },
  { value: 'fa-plug',        label: 'Hub / Ổ cắm' },
  { value: 'fa-tablet-alt',  label: 'Máy tính bảng' },
  { value: 'fa-chair',       label: 'Bàn ghế' },
  { value: 'fa-cube',        label: 'Khác' },
]

const AdminRooms = () => {
  const [rooms, setRooms] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState({ roomName: '', areaID: '' })
  const [modal, setModal] = useState({ open: false, isEdit: false, roomID: null })
  const [activeTab, setActiveTab] = useState('general')
  const [form, setForm] = useState(EMPTY_FORM)
  const [equipment, setEquipment] = useState([]) // [{name, icon, quantity, note, _id?}]
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuthStore()

  const fetchRooms = (params = {}) => {
    setLoading(true)
    roomService.searchAll(params)
      .then(r => setRooms(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRooms()
    areaService.getAll().then(r => setAreas(r.data.data || []))
  }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEquipment([])
    setActiveTab('general')
    setModal({ open: true, isEdit: false, roomID: null })
  }

  const openEdit = async (room) => {
    setForm({
      roomName: room.RoomName, areaID: room.AreaID, seat: room.Seat,
      phoneCall: !!room.PhoneCall, videoCall: !!room.VideoCall,
      isVIP: !!room.IsVIP, vipCondition: room.VIPCondition ?? 0, vipMinutes: room.VIPMinutes ?? 60,
      visible: room.Visible !== false, desc: room.Desc || '', avatar: room.Avatar || '',
    })
    // Load equipment hiện tại
    try {
      const res = await equipmentService.getByRoom(room.RoomID)
      setEquipment((res.data.data || []).map(e => ({
        _id: e.EquipmentID, name: e.Name, icon: e.Icon, quantity: e.Quantity, note: e.Note || '',
      })))
    } catch { setEquipment([]) }
    setActiveTab('general')
    setModal({ open: true, isEdit: true, roomID: room.RoomID })
  }

  const handleDelete = async (roomID) => {
    if (!window.confirm('Xác nhận xoá phòng này?')) return
    try {
      await roomService.delete(roomID)
      toast.success('Đã xoá phòng')
      fetchRooms(search)
    } catch (err) { toast.error(err.response?.data?.message || 'Xoá thất bại') }
  }

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

  // Equipment helpers
  const addEquipmentRow = () =>
    setEquipment(prev => [...prev, { name: '', icon: 'fa-cube', quantity: 1, note: '' }])

  const updateEquipmentRow = (i, field, value) =>
    setEquipment(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))

  const removeEquipmentRow = (i) =>
    setEquipment(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.roomName || !form.areaID) { toast.error('Thiếu tên phòng hoặc khu vực'); return }
    setSaving(true)
    try {
      const payload = { ...form, createBy: user.UserID }
      let roomID = modal.roomID

      if (modal.isEdit) {
        await roomService.update(roomID, payload)
      } else {
        const res = await roomService.add(payload)
        roomID = res.data.data.roomID
      }

      // Sync equipment: xoá cũ có _id nhưng không còn trong list, thêm/update còn lại
      const existingIDs = equipment.filter(e => e._id).map(e => e._id)
      // Xoá các thiết bị đã bị remove
      if (modal.isEdit) {
        try {
          const oldRes = await equipmentService.getByRoom(modal.roomID)
          const oldIDs = (oldRes.data.data || []).map(e => e.EquipmentID)
          for (const oid of oldIDs) {
            if (!existingIDs.includes(oid)) {
              await equipmentService.delete(oid).catch(() => {})
            }
          }
        } catch {}
      }

      for (const eq of equipment) {
        if (!eq.name.trim()) continue
        const eqPayload = { roomID, name: eq.name, icon: eq.icon, quantity: parseInt(eq.quantity) || 1, note: eq.note || '' }
        if (eq._id) {
          await equipmentService.update(eq._id, eqPayload).catch(() => {})
        } else {
          await equipmentService.add(eqPayload).catch(() => {})
        }
      }

      toast.success(modal.isEdit ? 'Cập nhật thành công' : 'Thêm phòng thành công')
      setModal({ open: false, isEdit: false, roomID: null })
      fetchRooms(search)
    } catch (err) { toast.error(err.response?.data?.message || 'Lưu thất bại') }
    setSaving(false)
  }

  const handleSearch = (e) => { e.preventDefault(); fetchRooms(search) }

  const tabStyle = (tab) => ({
    padding: '0.6rem 1.25rem', cursor: 'pointer', border: 'none', background: 'none',
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    fontSize: '0.875rem', transition: 'all 0.15s',
  })

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Quản lý phòng họp</h1>
          <button className="btn btn-primary" onClick={openAdd}><i className="fa fa-plus" /> Thêm phòng</button>
        </div>

        <form onSubmit={handleSearch} className="search-bar">
          <div className="search-input-wrap">
            <i className="fa fa-search" />
            <input className="form-control" placeholder="Tìm theo tên phòng..."
              value={search.roomName} onChange={e => setSearch({ ...search, roomName: e.target.value })} />
          </div>
          <select className="form-control" style={{ maxWidth: 200 }} value={search.areaID}
            onChange={e => setSearch({ ...search, areaID: e.target.value })}>
            <option value="">Tất cả khu vực</option>
            {areas.map(a => <option key={a.AreaID} value={a.AreaID}>{a.AreaName}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary"><i className="fa fa-search" /> Tìm</button>
        </form>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Ảnh</th><th>Tên phòng</th><th>Khu vực</th><th>Sức chứa</th>
                <th>Tiện ích</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Không có phòng nào</td></tr>
              ) : rooms.map(room => (
                <tr key={room.RoomID}>
                  <td>
                    <img src={room.Avatar || '/uploads/images/nopic.png'} alt=""
                      style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300/2e2a24/c9a96e?text=No+Image' }} />
                  </td>
                  <td><strong>{room.RoomName}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{room.AreaName}</td>
                  <td>{room.Seat} người</td>
                  <td>
                    {room.IsVIP === 1 && (
                      <span style={{ marginRight: 4, fontSize: '0.72rem', background: '#92400e', color: '#fde68a', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                        VIP {room.VIPCondition === 1 ? `>${room.VIPMinutes}p` : ''}
                      </span>
                    )}
                    {room.PhoneCall === 1 && <span className="badge badge-accent" style={{ marginRight: 4 }}><i className="fa fa-phone" /> Điện thoại</span>}
                    {room.VideoCall === 1 && <span className="badge badge-accent"><i className="fa fa-video" /> Camera</span>}
                  </td>
                  <td>
                    <span className={`badge ${room.Visible ? 'badge-success' : 'badge-danger'}`}>
                      {room.Visible ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(room)}><i className="fa fa-edit" /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room.RoomID)}><i className="fa fa-trash" /></button>
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
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

            {/* Header */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <span className="modal-title">{modal.isEdit ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</span>
              <button className="modal-close" onClick={() => setModal({ open: false })}><i className="fa fa-times" /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
              <button style={tabStyle('general')} onClick={() => setActiveTab('general')}>
                <i className="fa fa-info-circle" style={{ marginRight: 6 }} />Thông tin chung
              </button>
              <button style={tabStyle('other')} onClick={() => setActiveTab('other')}>
                <i className="fa fa-cog" style={{ marginRight: 6 }} />Thông tin khác
              </button>
            </div>

            <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div className="modal-body">

                {/* ── Tab: Thông tin chung ── */}
                {activeTab === 'general' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Tên phòng *</label>
                        <input className="form-control" value={form.roomName}
                          onChange={e => setForm({ ...form, roomName: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Khu vực *</label>
                        <select className="form-control" value={form.areaID}
                          onChange={e => setForm({ ...form, areaID: e.target.value })}>
                          <option value="">-- Chọn khu vực --</option>
                          {areas.map(a => <option key={a.AreaID} value={a.AreaID}>{a.AreaName}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sức chứa (người)</label>
                        <input type="number" className="form-control" min={1} value={form.seat}
                          onChange={e => setForm({ ...form, seat: parseInt(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tùy chọn</label>
                        <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
                          <label className="form-check"><input type="checkbox" checked={form.phoneCall}
                            onChange={e => setForm({ ...form, phoneCall: e.target.checked })} /> Điện thoại</label>
                          <label className="form-check"><input type="checkbox" checked={form.videoCall}
                            onChange={e => setForm({ ...form, videoCall: e.target.checked })} /> Camera</label>
                          <label className="form-check"><input type="checkbox" checked={form.visible}
                            onChange={e => setForm({ ...form, visible: e.target.checked })} /> Hiển thị</label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mô tả</label>
                      <textarea className="form-control" rows={2} value={form.desc}
                        onChange={e => setForm({ ...form, desc: e.target.value })} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ảnh phòng</label>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        {form.avatar && (
                          <img src={form.avatar} alt="" style={{ height: 80, borderRadius: 6, border: '1px solid var(--border)' }} />
                        )}
                        <label className="upload-zone" style={{ cursor: 'pointer', flex: 1 }}>
                          {uploading ? 'Đang upload...' : <><i className="fa fa-upload" style={{ marginRight: 6 }} />Chọn ảnh (tối đa 5MB)</>}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                        </label>
                      </div>
                    </div>

                    {/* Equipment */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                          <i className="fa fa-tools" style={{ marginRight: 6, color: 'var(--accent)' }} />Thiết bị phòng
                        </label>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addEquipmentRow}>
                          <i className="fa fa-plus" /> Thêm thiết bị
                        </button>
                      </div>

                      {equipment.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                          Chưa có thiết bị nào. Nhấn "Thêm thiết bị" để bắt đầu.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {equipment.map((eq, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 70px auto', gap: 8, alignItems: 'center' }}>
                              <input className="form-control" placeholder="Tên thiết bị..."
                                value={eq.name} onChange={e => updateEquipmentRow(i, 'name', e.target.value)} />
                              <select className="form-control" value={eq.icon}
                                onChange={e => updateEquipmentRow(i, 'icon', e.target.value)}>
                                {ICON_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                              <input type="number" className="form-control" min={1} placeholder="SL"
                                value={eq.quantity} onChange={e => updateEquipmentRow(i, 'quantity', e.target.value)} />
                              <button type="button"
                                onClick={() => removeEquipmentRow(i)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0 4px' }}>
                                <i className="fa fa-trash" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Tab: Thông tin khác ── */}
                {activeTab === 'other' && (
                  <>
                    {/* Yêu cầu phê duyệt */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Yêu cầu phê duyệt</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Bật để yêu cầu admin duyệt trước khi lịch có hiệu lực
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                          <input type="checkbox" checked={form.isVIP}
                            onChange={e => setForm({ ...form, isVIP: e.target.checked })}
                            style={{ opacity: 0, width: 0, height: 0 }} />
                          <span style={{
                            position: 'absolute', inset: 0, borderRadius: 12,
                            background: form.isVIP ? 'var(--accent)' : 'var(--border)',
                            transition: '0.2s',
                          }} />
                          <span style={{
                            position: 'absolute', top: 3, left: form.isVIP ? 23 : 3,
                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                            transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }} />
                        </label>
                      </div>

                      {form.isVIP && (
                        <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '1rem', border: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Áp dụng với
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                            <input type="radio" name="vipCondition" checked={form.vipCondition === 0}
                              onChange={() => setForm({ ...form, vipCondition: 0 })} />
                            <span style={{ fontSize: '0.875rem' }}>Mọi lịch họp tại phòng này</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="radio" name="vipCondition" checked={form.vipCondition === 1}
                              onChange={() => setForm({ ...form, vipCondition: 1 })} />
                            <span style={{ fontSize: '0.875rem' }}>Những cuộc họp vượt quá</span>
                            <input type="number" className="form-control" min={15} max={480}
                              value={form.vipMinutes}
                              disabled={form.vipCondition !== 1}
                              onChange={e => setForm({ ...form, vipMinutes: parseInt(e.target.value) || 60 })}
                              style={{ width: 80, display: 'inline-block' }} />
                            <span style={{ fontSize: '0.875rem' }}>phút</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <i className="fa fa-info-circle" style={{ color: 'var(--accent)' }} />
                        <span>Người phê duyệt hiện tại là tất cả <strong>Admin</strong> của hệ thống.</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false })}>Huỷ</button>
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

export default AdminRooms
