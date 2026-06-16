import useUIStore from '../../store/uiStore'

const Section = ({ title }) => (
  <div style={{
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
    color: 'var(--accent)', marginTop: '1.5rem', marginBottom: '0.625rem',
    textTransform: 'uppercase',
  }}>
    {title}
  </div>
)

const PolicyItem = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.625rem' }}>
    <i className="fa fa-check-circle" style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: 2, flexShrink: 0 }} />
    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{text}</span>
  </div>
)

const PolicyModal = () => {
  const { policyModal, closePolicyModal } = useUIStore()
  if (!policyModal) return null

  return (
    <div className="modal-overlay" onClick={closePolicyModal}
      style={{ zIndex: 1100 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <span className="modal-title">
            <i className="fa fa-calendar-times" style={{ color: 'var(--accent)' }} />
            &nbsp;Chính sách huỷ &amp; đổi lịch
          </span>
          <button className="modal-close" onClick={closePolicyModal}>
            <i className="fa fa-times" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>

          <Section title="Huỷ lịch" />
          <PolicyItem text="Chỉ có thể huỷ trước ít nhất 1 ngày trước giờ họp." />
          <PolicyItem text="Huỷ quá 5 lần trong 1 tháng có thể bị hạn chế tính năng đặt phòng." />
          <PolicyItem text="Lịch VIP đã được duyệt cần thông báo admin trước ít nhất 2 giờ." />

          <Section title="Đổi lịch" />
          <PolicyItem text="Chỉnh sửa lịch đặt khi trạng thái chưa bắt đầu." />
          <PolicyItem text="Phòng VIP sau khi sửa sẽ tự động chuyển về trạng thái chờ duyệt." />
          <PolicyItem text="Không thể đổi sang khung giờ đã có người đặt trùng." />

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={closePolicyModal}>
            <i className="fa fa-check" style={{ marginRight: 6 }} />Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}

export default PolicyModal
