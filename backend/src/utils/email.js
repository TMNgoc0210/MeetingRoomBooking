const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

function formatDatetime(str) {
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildReminderHtml({ name, title, roomName, areaName, timeStart, timeEnd, minutesBefore }) {
  const accent = '#c9a96e';
  const bg = '#1a1612';
  const card = '#252118';
  const border = '#3a3020';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${card};border-radius:12px;border:1px solid ${border};overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <div style="font-size:13px;color:#1a1612;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Nhắc lịch họp</div>
            <div style="font-size:28px;font-weight:700;color:#1a1612;margin-top:4px;">⏰ Còn ${minutesBefore} phút nữa</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#b0a090;font-size:14px;">Xin chào <strong style="color:#e8d5b0;">${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#b0a090;font-size:14px;">Cuộc họp của bạn sắp bắt đầu. Đây là thông tin chi tiết:</p>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid ${border};margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:18px;font-weight:700;color:#e8d5b0;margin-bottom:16px;">${title}</div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;width:32px;vertical-align:top;">
                        <span style="font-size:16px;">📍</span>
                      </td>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:13px;">Phòng họp</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="font-size:16px;">🕐</span>
                      </td>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:13px;">Bắt đầu</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeStart)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="font-size:16px;">🏁</span>
                      </td>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:13px;">Kết thúc</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeEnd)}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#7a6a55;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp.<br>Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#161310;padding:16px 32px;text-align:center;border-top:1px solid ${border};">
            <span style="color:#5a4a35;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildBookingConfirmHtml({ name, title, roomName, areaName, timeStart, timeEnd, status, totalSlots }) {
  const accent  = '#c9a96e';
  const bg      = '#1a1612';
  const card    = '#252118';
  const border  = '#3a3020';
  const isPending  = status === 0;
  const statusColor = isPending ? '#d97706' : '#16a34a';
  const statusLabel = isPending ? '⏳ Chờ admin phê duyệt' : '✅ Đặt phòng thành công';

  const recurringNote = totalSlots > 1
    ? `<p style="margin:0 0 16px;color:#b0a090;font-size:13px;">📅 Lịch định kỳ: <strong style="color:#e8d5b0;">${totalSlots} buổi</strong> (từ slot đầu tiên)</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${card};border-radius:12px;border:1px solid ${border};overflow:hidden;">
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <div style="font-size:13px;color:#1a1612;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Xác nhận đặt phòng</div>
            <div style="font-size:22px;font-weight:700;color:#1a1612;margin-top:4px;">${statusLabel}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#b0a090;font-size:14px;">Xin chào <strong style="color:#e8d5b0;">${name}</strong>,</p>
            ${recurringNote}
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid ${border};margin-bottom:20px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:18px;font-weight:700;color:#e8d5b0;margin-bottom:16px;">${title}</div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;width:28px;vertical-align:top;font-size:15px;">📍</td>
                      <td style="padding:5px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:12px;">Phòng họp</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;vertical-align:top;font-size:15px;">🕐</td>
                      <td style="padding:5px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:12px;">Bắt đầu</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeStart)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;vertical-align:top;font-size:15px;">🏁</td>
                      <td style="padding:5px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:12px;">Kết thúc</span><br>
                        <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeEnd)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;vertical-align:top;font-size:15px;">📋</td>
                      <td style="padding:5px 0;vertical-align:top;">
                        <span style="color:#b0a090;font-size:12px;">Trạng thái</span><br>
                        <span style="color:${statusColor};font-size:14px;font-weight:700;">${statusLabel}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            ${isPending ? `<p style="margin:0 0 16px;color:#d97706;font-size:13px;text-align:center;">Bạn sẽ nhận được email thông báo khi admin phê duyệt hoặc từ chối.</p>` : ''}
            <p style="margin:0;color:#7a6a55;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp.<br>Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#161310;padding:16px 32px;text-align:center;border-top:1px solid ${border};">
            <span style="color:#5a4a35;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBookingConfirmEmail(opts) {
  const t = getTransporter();
  if (!t) return;
  const { to, name, title, status } = opts;
  if (!to || !to.includes('@')) return;

  const from        = process.env.SMTP_FROM || `"Hệ thống Đặt Phòng Họp" <${process.env.SMTP_USER}>`;
  const statusLabel = status === 0 ? 'Chờ phê duyệt' : 'Đặt phòng thành công';

  await t.sendMail({
    from,
    to,
    subject: `[${statusLabel}] ${title}`,
    html: buildBookingConfirmHtml(opts),
  });
}

/**
 * Gửi email nhắc lịch họp
 * @param {object} opts
 * @param {string} opts.to       - địa chỉ email người nhận
 * @param {string} opts.name     - tên người nhận
 * @param {string} opts.title    - tiêu đề cuộc họp
 * @param {string} opts.roomName - tên phòng
 * @param {string} opts.areaName - tên khu vực
 * @param {string} opts.timeStart - thời gian bắt đầu (string)
 * @param {string} opts.timeEnd   - thời gian kết thúc (string)
 * @param {number} opts.minutesBefore - còn bao nhiêu phút
 */
async function sendReminderEmail(opts) {
  const t = getTransporter();
  if (!t) return; // SMTP chưa cấu hình — bỏ qua

  const { to, name, title, minutesBefore } = opts;
  if (!to || !to.includes('@')) return;

  const from = process.env.SMTP_FROM || `"Hệ thống Đặt Phòng Họp" <${process.env.SMTP_USER}>`;

  await t.sendMail({
    from,
    to,
    subject: `[Nhắc lịch] ${title} — còn ${minutesBefore} phút nữa`,
    html: buildReminderHtml(opts),
  });
}

// ─── Invite email gửi cho attendee khi được mời vào booking ─────────────────

function buildAttendeeInviteHtml({ name, organizer, title, roomName, areaName, timeStart, timeEnd }) {
  const accent = '#c9a96e', bg = '#1a1612', card = '#252118', border = '#3a3020';
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${card};border-radius:12px;border:1px solid ${border};overflow:hidden;">
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <div style="font-size:13px;color:#1a1612;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Lời mời tham dự</div>
            <div style="font-size:24px;font-weight:700;color:#1a1612;margin-top:4px;">📩 Bạn được mời họp</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#b0a090;font-size:14px;">Xin chào <strong style="color:#e8d5b0;">${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#b0a090;font-size:14px;">
              <strong style="color:#e8d5b0;">${organizer}</strong> đã mời bạn tham dự cuộc họp sau:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid ${border};margin-bottom:20px;">
              <tr><td style="padding:20px 24px;">
                <div style="font-size:18px;font-weight:700;color:#e8d5b0;margin-bottom:16px;">${title}</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px 0;width:28px;font-size:15px;">📍</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Phòng họp</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:15px;">🕐</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Bắt đầu</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeStart)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:15px;">🏁</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Kết thúc</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeEnd)}</span></td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0;color:#7a6a55;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp.<br>Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#161310;padding:16px 32px;text-align:center;border-top:1px solid ${border};">
            <span style="color:#5a4a35;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendAttendeeInviteEmail(opts) {
  const t = getTransporter();
  if (!t) return;
  const { to, title } = opts;
  if (!to || !to.includes('@')) return;
  const from = process.env.SMTP_FROM || `"Hệ thống Đặt Phòng Họp" <${process.env.SMTP_USER}>`;
  await t.sendMail({ from, to, subject: `[Lời mời họp] ${title}`, html: buildAttendeeInviteHtml(opts) });
}

// ─── Notification khi có tài liệu mới đính kèm ───────────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildNewAttachmentHtml({ name, organizer, title, roomName, areaName, timeStart, timeEnd, fileName, fileSize }) {
  const accent = '#c9a96e', bg = '#1a1612', card = '#252118', border = '#3a3020';
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${card};border-radius:12px;border:1px solid ${border};overflow:hidden;">
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <div style="font-size:13px;color:#1a1612;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Tài liệu mới</div>
            <div style="font-size:22px;font-weight:700;color:#1a1612;margin-top:4px;">📎 Tài liệu họp đã được đính kèm</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#b0a090;font-size:14px;">Xin chào <strong style="color:#e8d5b0;">${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#b0a090;font-size:14px;">
              <strong style="color:#e8d5b0;">${organizer}</strong> vừa đính kèm tài liệu mới cho cuộc họp:
            </p>
            <!-- File box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid #c9a96e44;margin-bottom:16px;">
              <tr><td style="padding:16px 20px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-size:28px;">📄</span>
                  <div>
                    <div style="color:#e8d5b0;font-size:14px;font-weight:700;">${fileName}</div>
                    ${fileSize ? `<div style="color:#7a6a55;font-size:12px;margin-top:2px;">${formatFileSize(fileSize)}</div>` : ''}
                  </div>
                </div>
              </td></tr>
            </table>
            <!-- Booking info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid ${border};margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <div style="font-size:15px;font-weight:700;color:#e8d5b0;margin-bottom:10px;">${title}</div>
                <div style="color:#b0a090;font-size:13px;">📍 ${roomName}${areaName ? ' — ' + areaName : ''}</div>
                <div style="color:#b0a090;font-size:13px;margin-top:4px;">🕐 ${formatDatetime(timeStart)} → ${formatDatetime(timeEnd)}</div>
              </td></tr>
            </table>
            <p style="margin:0;color:#7a6a55;font-size:12px;text-align:center;">
              Đăng nhập vào hệ thống để tải tài liệu về.<br>Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#161310;padding:16px 32px;text-align:center;border-top:1px solid ${border};">
            <span style="color:#5a4a35;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendNewAttachmentEmail(opts) {
  const t = getTransporter();
  if (!t) return;
  const { to, title, fileName } = opts;
  if (!to || !to.includes('@')) return;
  const from = process.env.SMTP_FROM || `"Hệ thống Đặt Phòng Họp" <${process.env.SMTP_USER}>`;
  await t.sendMail({ from, to, subject: `[Tài liệu mới] ${fileName} — ${title}`, html: buildNewAttachmentHtml(opts) });
}

// ─── Thông báo kết quả duyệt (approved / rejected) ───────────────────────────

function buildBookingStatusHtml({ name, title, roomName, areaName, timeStart, timeEnd, approved, rejectReason }) {
  const accent = approved ? '#16a34a' : '#dc2626';
  const bg = '#1a1612', card = '#252118', border = '#3a3020';
  const icon    = approved ? '✅' : '❌';
  const label   = approved ? 'Lịch đặt đã được PHÊ DUYỆT' : 'Lịch đặt bị TỪ CHỐI';
  const subline = approved ? 'Cuộc họp của bạn đã được admin phê duyệt. Chuẩn bị tốt cho buổi họp nhé!'
                           : 'Rất tiếc, yêu cầu đặt phòng của bạn đã bị từ chối.';

  const rejectBlock = !approved && rejectReason
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#2a1010;border-radius:8px;border:1px solid #7f1d1d;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;">
          <div style="color:#fca5a5;font-size:13px;font-weight:700;margin-bottom:6px;">Lý do từ chối:</div>
          <div style="color:#fecaca;font-size:14px;">${rejectReason}</div>
        </td></tr>
       </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${card};border-radius:12px;border:1px solid ${border};overflow:hidden;">
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <div style="font-size:13px;color:#fff;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">Kết quả phê duyệt</div>
            <div style="font-size:22px;font-weight:700;color:#fff;margin-top:4px;">${icon} ${label}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#b0a090;font-size:14px;">Xin chào <strong style="color:#e8d5b0;">${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#b0a090;font-size:14px;">${subline}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1a14;border-radius:8px;border:1px solid ${border};margin-bottom:20px;">
              <tr><td style="padding:20px 24px;">
                <div style="font-size:18px;font-weight:700;color:#e8d5b0;margin-bottom:16px;">${title}</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px 0;width:28px;font-size:15px;">📍</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Phòng họp</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:15px;">🕐</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Bắt đầu</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeStart)}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:15px;">🏁</td>
                    <td style="padding:5px 0;"><span style="color:#b0a090;font-size:12px;">Kết thúc</span><br>
                      <span style="color:#e8d5b0;font-size:14px;font-weight:600;">${formatDatetime(timeEnd)}</span></td>
                  </tr>
                </table>
              </td></tr>
            </table>
            ${rejectBlock}
            <p style="margin:0;color:#7a6a55;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp.<br>Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#161310;padding:16px 32px;text-align:center;border-top:1px solid ${border};">
            <span style="color:#5a4a35;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendBookingStatusEmail(opts) {
  const t = getTransporter();
  if (!t) return;
  const { to, title, approved } = opts;
  if (!to || !to.includes('@')) return;
  const from    = process.env.SMTP_FROM || `"Hệ thống Đặt Phòng Họp" <${process.env.SMTP_USER}>`;
  const subject = approved ? `[Đã duyệt] ${title}` : `[Từ chối] ${title}`;
  await t.sendMail({ from, to, subject, html: buildBookingStatusHtml(opts) });
}

module.exports = { sendReminderEmail, sendBookingConfirmEmail, sendAttendeeInviteEmail, sendNewAttachmentEmail, sendBookingStatusEmail };
