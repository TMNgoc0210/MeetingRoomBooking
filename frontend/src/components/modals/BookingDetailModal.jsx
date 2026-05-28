import { useState, useEffect, useRef } from 'react'
import { lineRoomService, attachmentService } from '../../services'
import api from '../../services/api'
import dayjs from 'dayjs'
import useUIStore from '../../store/uiStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const BookingDetailModal = () => {
  const { detailModal, closeDetailModal, openEditBookingModal } = useUIStore()
  const { user, isAdmin } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (detailModal.open && detailModal.lineRoomID) {
      setLoading(true)
      lineRoomService.getDetail(detailModal.lineRoomID)
        .then(res => setData(res.data.data))
        .catch(() => toast.error('Không thể tải chi tiết'))
        .finally(() => setLoading(false))
      lineRoomService.getAttachments(detailModal.lineRoomID)
        .then(res => setAttachments(res.data.data || []))
        .catch(() => setAttachments([]))
    }
  }, [detailModal.lineRoomID, detailModal.open])

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0]
    if (!file || !detailModal.lineRoomID) return
    setUploading(true)
    try {
      await attachmentService.upload(detailModal.lineRoomID, file)
      const res = await lineRoomService.getAttachments(detailModal.lineRoomID)
      setAttachments(res.data.data || [])
      toast.success('Đã đính kèm file')
    } catch { toast.error('Upload thất bại') }
    setUploading(false)
    e.target.value = ''
  }

  const handleDownload = async (att) => {
    try {
      const res = await api.get(`/linerooms/attachments/${att.AttachmentID}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = att.FileName
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Không thể tải file. Vui lòng đăng nhập lại.') }
  }

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Xoá file đính kèm này?')) return
    try {
      await lineRoomService.deleteAttachment(id)
      setAttachments(prev => prev.filter(a => a.AttachmentID !== id))
      toast.success('Đã xoá file')
    } catch { toast.error('Xoá thất bại') }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleDelete = async () => {
    if (!window.confirm('Xác nhận xoá lịch đặt phòng này?')) return
    try {
      await lineRoomService.delete(detailModal.lineRoomID)
      toast.success('Đã xoá lịch đặt')
      closeDetailModal()
      useUIStore.getState().triggerRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xoá thất bại')
    }
  }

  if (!detailModal.open) return null

  const canEdit = data && (isAdmin() || user?.UserID === data.UserID)

  return (
    <div className="modal-overlay" onClick={closeDetailModal}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><i className="fa fa-calendar-check" /> &nbsp;Chi tiết lịch đặt</span>
          <button className="modal-close" onClick={closeDetailModal}><i className="fa fa-times" /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Info label="Phòng" value={data.RoomName} icon="door-open" />
                <Info label="Khu vực" value={data.AreaName} icon="map-marker-alt" />
                <Info label="Người đặt" value={data.UserName} icon="user" />
                <Info label="Khoa" value={data.FacultyName} icon="university" />
                <Info label="Bắt đầu" value={dayjs(data.TimeStart).format('HH:mm - DD/MM/YYYY')} icon="clock" />
                <Info label="Kết thúc" value={dayjs(data.TimeEnd).format('HH:mm - DD/MM/YYYY')} icon="clock" />
                <Info label="Số người" value={`${data.NumberPerson} người`} icon="users" />
                <Info label="Tiêu đề" value={data.Title} icon="tag" />
              </div>
              {data.Content && <Info label="Nội dung" value={data.Content} icon="file-alt" />}
              {data.Note && <Info label="Ghi chú" value={data.Note} icon="sticky-note" />}

              {/* Yêu cầu dịch vụ */}
              {data.ServiceRequest && (
                <div style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <i className="fa fa-concierge-bell" style={{ color: 'var(--accent)', marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent)', marginBottom: 2 }}>Yêu cầu dịch vụ</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{data.ServiceRequest}</div>
                  </div>
                </div>
              )}

              {data.Status === 2 && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: 8, padding: '0.75rem 1rem',
                  display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
                }}>
                  <i className="fa fa-times-circle" style={{ color: '#dc2626', marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.85rem', marginBottom: 2 }}>
                      Lý do từ chối
                    </div>
                    <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>
                      {data.RejectReason || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Tài liệu đính kèm */}
          {!loading && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-paperclip" style={{ color: 'var(--accent)' }} />Tài liệu đính kèm
                  {attachments.length > 0 && (
                    <span style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {attachments.length}
                    </span>
                  )}
                </span>
                {canEdit && (
                  <>
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadAttachment}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg" />
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}
                      onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <i className="fa fa-upload" style={{ marginRight: 4 }} />{uploading ? 'Đang upload...' : 'Thêm file'}
                    </button>
                  </>
                )}
              </div>

              {attachments.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chưa có tài liệu đính kèm</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attachments.map(att => (
                    <div key={att.AttachmentID} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg-hover)', borderRadius: 8, padding: '0.4rem 0.75rem',
                      border: '1px solid var(--border)', fontSize: '0.82rem',
                    }}>
                      <i className={`fa ${getFileIcon(att.FileName)}`} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span
                        onClick={() => handleDownload(att)}
                        style={{ flex: 1, color: 'var(--text-primary)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                        {att.FileName}
                      </span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(att.FileSize)}</span>
                      {canEdit && (
                        <button onClick={() => handleDeleteAttachment(att.AttachmentID)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, flexShrink: 0 }}>
                          <i className="fa fa-times" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {canEdit && (
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <i className="fa fa-trash" /> Xoá
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { closeDetailModal(); openEditBookingModal(detailModal.lineRoomID) }}>
              <i className="fa fa-edit" /> Chỉnh sửa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const Info = ({ label, value, icon }) => (
  <div>
    <div className="form-label" style={{ marginBottom: '0.25rem' }}>
      <i className={`fa fa-${icon}`} style={{ marginRight: '0.4rem', color: 'var(--accent)' }} />
      {label}
    </div>
    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{value || '—'}</div>
  </div>
)

const getFileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'fa-file-pdf'
  if (['doc', 'docx'].includes(ext)) return 'fa-file-word'
  if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel'
  if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint'
  if (['zip', 'rar'].includes(ext)) return 'fa-file-archive'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fa-file-image'
  return 'fa-file-alt'
}

export default BookingDetailModal
