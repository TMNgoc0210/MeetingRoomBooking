import { useState, useEffect } from 'react'
import useSettingsStore from '../../store/settingsStore'
import useUIStore from '../../store/uiStore'
import toast from 'react-hot-toast'

const SLOT_OPTIONS = [
  { value: '5',  label: '5 phút' },
  { value: '10', label: '10 phút' },
  { value: '15', label: '15 phút' },
  { value: '30', label: '30 phút' },
]

const DURATION_OPTIONS = [
  { value: '30',  label: '30 phút' },
  { value: '60',  label: '1 giờ' },
  { value: '90',  label: '1 giờ 30 phút' },
  { value: '120', label: '2 giờ' },
]

const MAX_OPTIONS = [
  { value: '0',   label: 'Không áp dụng' },
  { value: '30',  label: '30 phút' },
  { value: '60',  label: '1 giờ' },
  { value: '90',  label: '1 giờ 30 phút' },
  { value: '120', label: '2 giờ' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: '(UTC+07:00) Hà Nội, TP. Hồ Chí Minh' },
  { value: 'Asia/Bangkok',     label: '(UTC+07:00) Bangkok' },
  { value: 'Asia/Singapore',   label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Tokyo',       label: '(UTC+09:00) Tokyo' },
  { value: 'UTC',              label: '(UTC+00:00) UTC' },
]

const SectionTitle = ({ icon, title, desc }) => (
  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={`fa ${icon}`} style={{ color: 'var(--accent)' }} />
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
    </div>
    {desc && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>}
  </div>
)

const RadioGroup = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem' }}>
    {options.map(o => (
      <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
        <input type="radio" name={Math.random()} checked={value === o.value} onChange={() => onChange(o.value)} />
        {o.label}
      </label>
    ))}
  </div>
)

const SettingRow = ({ label, desc, children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '260px 1fr',
    gap: '1rem', alignItems: 'start',
    padding: '1rem 0', borderBottom: '1px solid var(--border)',
  }}>
    <div>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
      {desc && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{desc}</div>}
    </div>
    <div>{children}</div>
  </div>
)

const AdminSettings = () => {
  const { settings, save, fetch } = useSettingsStore()
  const { theme, toggleTheme } = useUIStore()
  const [form, setForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm({ ...settings }) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await save(form)
      // Đồng bộ theme với uiStore nếu thay đổi
      if (form.theme !== theme) toggleTheme()
      toast.success('Đã lưu thiết lập chung')
      fetch()
    } catch {
      toast.error('Lưu thất bại')
    }
    setSaving(false)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <h1 className="page-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <i className="fa fa-cog" style={{ marginRight: 10, color: 'var(--accent)' }} />Thiết lập chung
          </h1>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang lưu...</>
              : <><i className="fa fa-save" style={{ marginRight: 6 }} />Lưu thay đổi</>}
          </button>
        </div>

        {/* ── Giao diện ── */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <SectionTitle icon="fa-palette" title="Giao diện" />

          <SettingRow label="Giao diện (Theme)"
            desc="Chọn theme sáng hoặc tối cho toàn hệ thống">
            <div style={{ display: 'flex', gap: 12 }}>
              {['dark', 'light'].map(t => (
                <label key={t} onClick={() => set('theme', t)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '0.6rem 1.25rem', borderRadius: 10, border: '2px solid',
                  borderColor: form.theme === t ? 'var(--accent)' : 'var(--border)',
                  background: form.theme === t ? 'rgba(201,169,110,0.08)' : 'var(--bg-hover)',
                  transition: 'all 0.15s',
                }}>
                  <i className={`fa ${t === 'dark' ? 'fa-moon' : 'fa-sun'}`}
                    style={{ color: form.theme === t ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.1rem' }} />
                  <span style={{ fontWeight: form.theme === t ? 600 : 400, fontSize: '0.9rem' }}>
                    {t === 'dark' ? 'Tối (Dark)' : 'Sáng (Light)'}
                  </span>
                </label>
              ))}
            </div>
          </SettingRow>
        </div>

        {/* ── Thời gian ── */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <SectionTitle icon="fa-clock" title="Thiết lập thời gian" />

          <SettingRow label="Định dạng thời gian"
            desc="Cách hiển thị giờ trên lịch và form đặt phòng">
            <RadioGroup
              options={[{ value: 'AM/PM', label: 'AM/PM' }, { value: '24h', label: '24 giờ' }]}
              value={form.timeFormat}
              onChange={v => set('timeFormat', v)}
            />
          </SettingRow>

          <SettingRow label="Khoảng thời gian chia nhỏ nhất"
            desc="Khoảng thời gian giữa các khung giờ được gợi ý khi đặt phòng và hiển thị trên lịch">
            <RadioGroup options={SLOT_OPTIONS} value={form.slotMinutes} onChange={v => set('slotMinutes', v)} />
          </SettingRow>

          <SettingRow label="Thời lượng cuộc họp mặc định"
            desc="Thời lượng mặc định khi đặt một cuộc họp bất kỳ">
            <RadioGroup options={DURATION_OPTIONS} value={form.defaultDuration} onChange={v => set('defaultDuration', v)} />
          </SettingRow>

          <SettingRow label="Thời lượng cuộc họp tối đa"
            desc="Những cuộc họp vượt quá khoảng thời gian này sẽ cần phải phê duyệt">
            <RadioGroup options={MAX_OPTIONS} value={form.maxDuration} onChange={v => set('maxDuration', v)} />
          </SettingRow>

          <SettingRow label="Giờ làm việc" desc="Khung giờ phục vụ đặt phòng">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="time" className="form-control" style={{ width: 130 }}
                value={form.workdayStart} onChange={e => set('workdayStart', e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input type="time" className="form-control" style={{ width: 130 }}
                value={form.workdayEnd} onChange={e => set('workdayEnd', e.target.value)} />
            </div>
          </SettingRow>

          <div style={{ paddingTop: '1rem' }}>
            <SettingRow label="Múi giờ (Timezone)" desc="">
              <select className="form-control" style={{ maxWidth: 360 }}
                value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                {TIMEZONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </SettingRow>
          </div>
        </div>

        {/* Save button bottom */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Đang lưu...' : <><i className="fa fa-save" style={{ marginRight: 6 }} />Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
