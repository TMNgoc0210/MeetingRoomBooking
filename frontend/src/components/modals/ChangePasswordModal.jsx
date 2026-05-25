import { useState } from 'react'
import { userService } from '../../services'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import toast from 'react-hot-toast'

const ChangePasswordModal = () => {
  const { changePassModal, closeChangePassModal } = useUIStore()
  const { user } = useAuthStore()
  const [form, setForm] = useState({ password: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  if (!changePassModal) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.password || !form.newPassword) { toast.error('Vui lòng nhập đầy đủ thông tin'); return }
    if (form.newPassword !== form.confirmPassword) { toast.error('Mật khẩu mới không khớp'); return }
    if (form.newPassword.length < 6) { toast.error('Mật khẩu mới phải ít nhất 6 ký tự'); return }

    setLoading(true)
    try {
      await userService.changePassword(user.UserID, {
        password: form.password,
        newPassword: form.newPassword,
        createBy: user.UserID,
      })
      toast.success('Đổi mật khẩu thành công')
      closeChangePassModal()
      setForm({ password: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeChangePassModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><i className="fa fa-key" /> &nbsp;Đổi mật khẩu</span>
          <button className="modal-close" onClick={closeChangePassModal}><i className="fa fa-times" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {[
              { label: 'Mật khẩu hiện tại', key: 'password' },
              { label: 'Mật khẩu mới', key: 'newPassword' },
              { label: 'Xác nhận mật khẩu mới', key: 'confirmPassword' },
            ].map(({ label, key }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  type="password"
                  className="form-control"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={`Nhập ${label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeChangePassModal}>Huỷ</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal
