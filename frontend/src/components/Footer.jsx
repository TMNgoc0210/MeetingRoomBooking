import { useState } from 'react'

const POLICIES = [
  {
    title: 'Quy định sử dụng phòng họp',
    icon: 'fa-clipboard-list',
    sections: [
      {
        heading: 'Đặt phòng',
        items: [
          'Đặt phòng trước ít nhất 30 phút so với giờ họp.',
          'Mỗi user chỉ được đặt tối đa 3 phòng cùng lúc.',
          'Số người tham dự không được vượt quá sức chứa của phòng.',
        ],
      },
      {
        heading: 'Trong khi sử dụng',
        items: [
          'Giữ gìn vệ sinh, không ăn uống trong phòng họp.',
          'Không tự ý di chuyển hoặc thay đổi thiết bị phòng.',
          'Chịu trách nhiệm đối với các thiết bị hư hỏng do sử dụng sai cách.',
        ],
      },
      {
        heading: 'Kết thúc buổi họp',
        items: [
          'Tắt điều hòa, đèn, máy chiếu trước khi ra về.',
          'Dọn dẹp bàn ghế, vứt rác vào thùng.',
          'Trả phòng đúng giờ để không ảnh hưởng lịch của người khác.',
        ],
      },
    ],
  },
  {
    title: 'Chính sách huỷ & đổi lịch',
    icon: 'fa-calendar-times',
    sections: [
      {
        heading: 'Huỷ lịch',
        items: [
          'Có thể huỷ bất kỳ lúc nào khi cuộc họp chưa bắt đầu.',
          'Huỷ quá 5 lần trong 1 tháng có thể bị hạn chế tính năng đặt phòng.',
          'Lịch VIP đã được duyệt cần thông báo admin trước ít nhất 2 giờ.',
        ],
      },
      {
        heading: 'Đổi lịch',
        items: [
          'Chỉnh sửa lịch đặt khi trạng thái chưa bắt đầu.',
          'Phòng VIP sau khi sửa sẽ tự động chuyển về trạng thái chờ duyệt.',
          'Không thể đổi sang khung giờ đã có người đặt trùng.',
        ],
      },
    ],
  },
  {
    title: 'Phòng VIP & yêu cầu phê duyệt',
    icon: 'fa-star',
    sections: [
      {
        heading: 'Phòng VIP là gì?',
        items: [
          'Phòng hội nghị cao cấp, đầy đủ thiết bị âm thanh & hình ảnh.',
          'Dành cho các cuộc họp quan trọng, hội thảo, tiếp đón đối tác.',
          'Yêu cầu admin phê duyệt trước khi xác nhận đặt phòng.',
        ],
      },
      {
        heading: 'Quy trình phê duyệt',
        items: [
          'Gửi yêu cầu → Admin nhận thông báo → Duyệt hoặc từ chối.',
          'Thời gian phê duyệt thông thường trong vòng 2 giờ làm việc.',
          'Nếu bị từ chối, lý do sẽ được ghi rõ trong chi tiết lịch đặt.',
        ],
      },
      {
        heading: 'Yêu cầu dịch vụ kèm theo',
        items: [
          'Có thể đính kèm yêu cầu: nước uống, thiết bị bổ sung, bố trí bàn ghế.',
          'Ghi rõ yêu cầu trong ô "Dịch vụ kèm theo" khi đặt phòng.',
        ],
      },
    ],
  },
  {
    title: 'Hỗ trợ kỹ thuật',
    icon: 'fa-headset',
    sections: [
      {
        heading: 'Liên hệ hỗ trợ',
        items: [
          'Email: bookingroom457@gmail.com',
          'Hotline: (84+) 386918374',
          'Thời gian hỗ trợ: Thứ 2 – Thứ 6, 07:30 – 17:00.',
        ],
      },
      {
        heading: 'Báo lỗi hệ thống',
        items: [
          'Gửi email mô tả lỗi kèm ảnh chụp màn hình để được hỗ trợ nhanh nhất.',
          'Ghi rõ trình duyệt, thiết bị đang dùng và thời điểm xảy ra lỗi.',
          'Phản hồi trong vòng 4 giờ làm việc.',
        ],
      },
    ],
  },
]

const PolicyModal = ({ policy, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, maxWidth: 560, width: '100%',
        maxHeight: '80vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(201,169,110,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className={`fa ${policy.icon}`} style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {policy.title}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, padding: 4,
            borderRadius: 6, lineHeight: 1,
          }}
        >
          <i className="fa fa-times" />
        </button>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {policy.sections.map(sec => (
          <div key={sec.heading}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10,
            }}>
              {sec.heading}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sec.items.map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <i className="fa fa-check-circle" style={{ color: 'var(--accent)', fontSize: 13, marginTop: 3, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const Footer = () => {
  const year = new Date().getFullYear()
  const [activePolicy, setActivePolicy] = useState(null)

  return (
    <>
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '48px 0 0',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          paddingBottom: '40px',
        }}>

          {/* Col 1 — Branding */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="fa fa-building" style={{ color: '#1a1612', fontSize: 16 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  Smart Meeting Room
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Booking System
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.6, margin: 0 }}>
              Hệ thống đặt phòng họp thông minh dành cho các đơn vị, khoa và cán bộ trong trường. Nhanh chóng, minh bạch và tiện lợi.
            </p>
          </div>

          {/* Col 2 — Liên hệ */}
          <div>
            <h4 style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>
              Liên hệ hỗ trợ
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'fa-user', text: 'Tran Minh Ngoc' },
                { icon: 'fa-phone-alt', text: '(84+) 386918374' },
                { icon: 'fa-envelope', text: 'bookingroom457@gmail.com' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <i className={`fa ${icon}`} style={{ color: 'var(--accent)', fontSize: 13, marginTop: 3, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 3 — Hướng dẫn */}
          <div>
            <h4 style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>
              Hướng dẫn sử dụng
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: 'fa-search', text: 'Tìm kiếm & xem phòng' },
                { icon: 'fa-calendar-check', text: 'Đặt phòng & lịch họp' },
                { icon: 'fa-users', text: 'Mời thành viên tham dự' },
                { icon: 'fa-paperclip', text: 'Đính kèm tài liệu họp' },
                { icon: 'fa-bell', text: 'Nhận nhắc lịch qua email' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <i className={`fa ${icon}`} style={{ color: 'var(--accent)', fontSize: 12, width: 16, textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 4 — Chính sách */}
          <div>
            <h4 style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>
              Thông tin cần biết
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {POLICIES.map(policy => (
                <button
                  key={policy.title}
                  onClick={() => setActivePolicy(policy)}
                  style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 0', textAlign: 'left',
                  }}
                >
                  <i className={`fa ${policy.icon}`} style={{ color: 'var(--accent)', fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                  >
                    {policy.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Status badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(201, 169, 110, 0.1)', border: '1px solid var(--border-accent)',
              borderRadius: 20, padding: '5px 12px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: '0 0 6px #16a34a' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Hệ thống đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '18px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            © {year} Smart Meeting Room Booking System.
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {['Trang chủ', 'Lịch phòng'].map((label, i) => {
              const paths = ['/', '/calendar']
              return (
                <a key={label} href={paths[i]} style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >
                  {label}
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>

    {activePolicy && <PolicyModal policy={activePolicy} onClose={() => setActivePolicy(null)} />}
    </>
  )
}

export default Footer
