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

module.exports = { sendReminderEmail };
