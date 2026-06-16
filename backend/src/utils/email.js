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
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;border:1px solid #dadce0;overflow:hidden;">
        <tr>
          <td style="background:#1a73e8;padding:20px 32px;">
            <div style="font-size:12px;color:#e8f0fe;letter-spacing:0.5px;text-transform:uppercase;">Nhắc lịch họp</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">Còn ${minutesBefore} phút nữa</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#202124;font-size:14px;">Xin chào <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#5f6368;font-size:14px;">Cuộc họp của bạn sắp bắt đầu. Đây là thông tin chi tiết:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:16px;font-weight:700;color:#202124;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Phòng họp</div>
                  <div style="font-size:14px;color:#202124;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Bắt đầu</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeStart)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Kết thúc</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeEnd)}</div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9aa0a6;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp. Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #dadce0;">
            <span style="color:#9aa0a6;font-size:12px;">Smart Meeting Room Booking System</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildBookingConfirmHtml({ name, title, roomName, areaName, timeStart, timeEnd, status, totalSlots }) {
  const isPending   = status === 0;
  const headerColor = isPending ? '#f9ab00' : '#1e8e3e';
  const statusColor = isPending ? '#e37400' : '#1e8e3e';
  const statusLabel = isPending ? 'Chờ admin phê duyệt' : 'Đặt phòng thành công';

  const recurringNote = totalSlots > 1
    ? `<p style="margin:0 0 16px;color:#5f6368;font-size:13px;">Lịch định kỳ: <strong style="color:#202124;">${totalSlots} buổi</strong> (từ slot đầu tiên)</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;border:1px solid #dadce0;overflow:hidden;">
        <tr>
          <td style="background:${headerColor};padding:20px 32px;">
            <div style="font-size:12px;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;opacity:0.9;">Xác nhận đặt phòng</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">${statusLabel}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#202124;font-size:14px;">Xin chào <strong>${name}</strong>,</p>
            ${recurringNote}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:20px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:16px;font-weight:700;color:#202124;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Phòng họp</div>
                  <div style="font-size:14px;color:#202124;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Bắt đầu</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeStart)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Kết thúc</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeEnd)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Trạng thái</div>
                  <div style="font-size:14px;font-weight:700;color:${statusColor};">${statusLabel}</div>
                </td>
              </tr>
            </table>
            ${isPending ? `<p style="margin:0 0 16px;color:#5f6368;font-size:13px;text-align:center;">Bạn sẽ nhận được email thông báo khi admin phê duyệt hoặc từ chối.</p>` : ''}
            <p style="margin:0;color:#9aa0a6;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp. Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #dadce0;">
            <span style="color:#9aa0a6;font-size:12px;">Smart Meeting Room Booking System</span>
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
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;border:1px solid #dadce0;overflow:hidden;">
        <tr>
          <td style="background:#1a73e8;padding:20px 32px;">
            <div style="font-size:12px;color:#e8f0fe;letter-spacing:0.5px;text-transform:uppercase;">Lời mời tham dự</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">Bạn được mời họp</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#202124;font-size:14px;">Xin chào <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#5f6368;font-size:14px;">
              <strong style="color:#202124;">${organizer}</strong> đã mời bạn tham dự cuộc họp sau:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:20px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:16px;font-weight:700;color:#202124;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Phòng họp</div>
                  <div style="font-size:14px;color:#202124;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Bắt đầu</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeStart)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Kết thúc</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeEnd)}</div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9aa0a6;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp. Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #dadce0;">
            <span style="color:#9aa0a6;font-size:12px;">Smart Meeting Room Booking System</span>
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
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;border:1px solid #dadce0;overflow:hidden;">
        <tr>
          <td style="background:#1a73e8;padding:20px 32px;">
            <div style="font-size:12px;color:#e8f0fe;letter-spacing:0.5px;text-transform:uppercase;">Tài liệu mới</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">Tài liệu họp đã được đính kèm</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#202124;font-size:14px;">Xin chào <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#5f6368;font-size:14px;">
              <strong style="color:#202124;">${organizer}</strong> vừa đính kèm tài liệu mới cho cuộc họp:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:16px;">
              <tr>
                <td style="padding:14px 20px;">
                  <div style="font-size:14px;font-weight:700;color:#202124;">${fileName}</div>
                  ${fileSize ? `<div style="color:#5f6368;font-size:12px;margin-top:3px;">${formatFileSize(fileSize)}</div>` : ''}
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:20px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:15px;font-weight:700;color:#202124;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Phòng họp</div>
                  <div style="font-size:14px;color:#202124;">${roomName}${areaName ? ' — ' + areaName : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Thời gian</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeStart)} — ${formatDatetime(timeEnd)}</div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9aa0a6;font-size:12px;text-align:center;">
              Đăng nhập vào hệ thống để tải tài liệu về. Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #dadce0;">
            <span style="color:#9aa0a6;font-size:12px;">Smart Meeting Room Booking System</span>
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
  const headerColor = approved ? '#1e8e3e' : '#d93025';
  const label   = approved ? 'Lịch đặt đã được phê duyệt' : 'Lịch đặt bị từ chối';
  const subline = approved ? 'Cuộc họp của bạn đã được admin phê duyệt. Chuẩn bị tốt cho buổi họp nhé!'
                           : 'Rất tiếc, yêu cầu đặt phòng của bạn đã bị từ chối.';

  const rejectBlock = !approved && rejectReason
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fad2cf;border-radius:4px;background:#fef7f6;margin-bottom:20px;">
        <tr><td style="padding:14px 20px;">
          <div style="color:#c5221f;font-size:13px;font-weight:700;margin-bottom:6px;">Lý do từ chối</div>
          <div style="color:#202124;font-size:14px;">${rejectReason}</div>
        </td></tr>
       </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;border:1px solid #dadce0;overflow:hidden;">
        <tr>
          <td style="background:${headerColor};padding:20px 32px;">
            <div style="font-size:12px;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;opacity:0.9;">Kết quả phê duyệt</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">${label}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#202124;font-size:14px;">Xin chào <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;color:#5f6368;font-size:14px;">${subline}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dadce0;border-radius:4px;margin-bottom:20px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:16px;font-weight:700;color:#202124;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Phòng họp</div>
                  <div style="font-size:14px;color:#202124;font-weight:600;">${roomName}${areaName ? ' — ' + areaName : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #f1f3f4;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Bắt đầu</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeStart)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <div style="font-size:12px;color:#5f6368;margin-bottom:2px;">Kết thúc</div>
                  <div style="font-size:14px;color:#202124;">${formatDatetime(timeEnd)}</div>
                </td>
              </tr>
            </table>
            ${rejectBlock}
            <p style="margin:0;color:#9aa0a6;font-size:12px;text-align:center;">
              Email này được gửi tự động từ Hệ thống Đặt Phòng Họp. Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #dadce0;">
            <span style="color:#9aa0a6;font-size:12px;">Smart Meeting Room Booking System</span>
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
