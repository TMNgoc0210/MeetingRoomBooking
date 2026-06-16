const path = require('path');
const fs = require('fs');
const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');
const { sendNewAttachmentEmail } = require('../utils/email');

/** GET /api/linerooms/:id/attachments
 *  Chỉ cho phép: chủ booking | attendee | admin
 *  Người ngoài nhận danh sách rỗng (không lộ tên file)
 */
const getAttachments = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);

    // Nếu chưa đăng nhập → trả rỗng
    if (!req.user) return success(res, []);

    const requestorID = req.user.userID;
    const isAdmin     = req.user.roles === 1;

    if (!isAdmin) {
      const booking = await queryOne(
        `SELECT UserID FROM LineRoom WHERE LineRoomID = @lineRoomID`,
        { lineRoomID }
      );
      const isOwner = booking?.UserID === requestorID;
      if (!isOwner) {
        const isAttendee = await queryOne(
          `SELECT 1 AS ok FROM BookingAttendee WHERE LineRoomID = @lineRoomID AND UserID = @userID`,
          { lineRoomID, userID: requestorID }
        );
        if (!isAttendee) return success(res, []); // trả rỗng, không báo lỗi
      }
    }

    const items = await query(
      `SELECT AttachmentID, FileName, FilePath, FileSize, MimeType, UploadedAt, UploadedBy
       FROM BookingAttachment WHERE LineRoomID = @lineRoomID ORDER BY UploadedAt DESC`,
      { lineRoomID }
    );
    return success(res, items);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/** POST /api/linerooms/:id/attachments */
const addAttachment = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
    if (!req.file) return badRequest(res, 'Không có file được tải lên');

    const booking = await queryOne(
      `SELECT UserID FROM LineRoom WHERE LineRoomID = @lineRoomID`,
      { lineRoomID }
    );
    if (!booking) return notFound(res, 'Không tìm thấy lịch đặt');
    if (!req.user.roles && req.user.userID !== booking.UserID)
      return error(res, 'Không có quyền', 403);

    const filePath = `/uploads/docs/${req.file.filename}`;
    const result = await execute(
      `INSERT INTO BookingAttachment (LineRoomID, FileName, FilePath, FileSize, MimeType, UploadedBy)
       VALUES (@lineRoomID, @fileName, @filePath, @fileSize, @mimeType, @uploadedBy)`,
      {
        lineRoomID,
        fileName: req.file.originalname,
        filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.userID,
      }
    );
    // Gửi email thông báo tài liệu mới cho attendees + organizer (non-blocking)
    ;(async () => {
      try {
        const info = await queryOne(
          `SELECT lr."Title", lr."TimeStart", lr."TimeEnd", lr."UserID",
                  u."FullName" AS OrganizerName, r."RoomName", a."AreaName"
           FROM LineRoom lr
           JOIN "User" u ON lr."UserID" = u."UserID"
           JOIN Room r ON lr."RoomID" = r."RoomID"
           LEFT JOIN Area a ON r."AreaID" = a."AreaID"
           WHERE lr."LineRoomID" = @lineRoomID`,
          { lineRoomID }
        );
        if (!info) return;

        // Lấy danh sách attendees
        const attendees = await query(
          `SELECT u."Email", u."FullName" FROM BookingAttendee ba
           JOIN "User" u ON ba."UserID" = u."UserID"
           WHERE ba."LineRoomID" = @lineRoomID AND u."Email" IS NOT NULL AND u."Email" != ''`,
          { lineRoomID }
        );

        // Thêm organizer nếu không phải người upload
        const recipients = [...attendees];
        if (req.user.userID !== info.UserID) {
          const organizer = await queryOne(
            `SELECT "Email", "FullName" FROM "User" WHERE "UserID" = @uid`,
            { uid: info.UserID }
          );
          if (organizer?.Email) recipients.push(organizer);
        }

        for (const r of recipients) {
          if (!r.Email) continue;
          await sendNewAttachmentEmail({
            to:        r.Email,
            name:      r.FullName,
            organizer: info.OrganizerName,
            title:     info.Title,
            roomName:  info.RoomName,
            areaName:  info.AreaName,
            timeStart: info.TimeStart,
            timeEnd:   info.TimeEnd,
            fileName:  req.file.originalname,
            fileSize:  req.file.size,
          });
        }
      } catch (e) { console.error('[AttachmentMail]', e.message); }
    })();

    return success(res, {
      attachmentID: result.lastInsertRowid,
      fileName: req.file.originalname,
      filePath,
      fileSize: req.file.size,
    }, 'Đã đính kèm file', 201);
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/** DELETE /api/attachments/:id */
const deleteAttachment = async (req, res) => {
  try {
    const attachmentID = parseInt(req.params.id);
    const item = await queryOne(
      `SELECT a.FilePath, lr.UserID
       FROM BookingAttachment a JOIN LineRoom lr ON a.LineRoomID = lr.LineRoomID
       WHERE a.AttachmentID = @attachmentID`,
      { attachmentID }
    );
    if (!item) return notFound(res, 'Không tìm thấy file đính kèm');
    if (!req.user.roles && req.user.userID !== item.UserID)
      return error(res, 'Không có quyền xoá file này', 403);

    // Xoá file vật lý
    const physPath = path.join(__dirname, '../../', item.FilePath.replace(/^\//, ''));
    if (fs.existsSync(physPath)) fs.unlinkSync(physPath);

    await execute(`DELETE FROM BookingAttachment WHERE AttachmentID = @attachmentID`, { attachmentID });
    return success(res, null, 'Đã xoá file đính kèm');
  } catch (err) {
    return error(res, 'Lỗi hệ thống', 500, err.message);
  }
};

/** GET /api/attachments/:id/download
 *  Chỉ cho phép: chủ booking | attendee được mời | admin
 */
const downloadAttachment = async (req, res) => {
  try {
    const attachmentID = parseInt(req.params.id);
    const item = await queryOne(
      `SELECT a.FileName, a.FilePath, a.MimeType, lr.UserID AS OwnerID, a.LineRoomID
       FROM BookingAttachment a
       JOIN LineRoom lr ON a.LineRoomID = lr.LineRoomID
       WHERE a.AttachmentID = @attachmentID`,
      { attachmentID }
    );
    if (!item) return notFound(res, 'Không tìm thấy file');

    const requestorID = req.user.userID;
    const isAdmin     = req.user.roles === 1;
    const isOwner     = requestorID === item.OwnerID;

    if (!isAdmin && !isOwner) {
      const isAttendee = await queryOne(
        `SELECT 1 AS ok FROM BookingAttendee
         WHERE LineRoomID = @lineRoomID AND UserID = @userID`,
        { lineRoomID: item.LineRoomID, userID: requestorID }
      );
      if (!isAttendee) return error(res, 'Bạn không có quyền truy cập tài liệu này', 403);
    }

    const physPath = path.join(__dirname, '../../', item.FilePath.replace(/^\//, ''));
    if (!fs.existsSync(physPath)) return notFound(res, 'File không còn tồn tại trên server');

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(item.FileName)}`);
    res.setHeader('Content-Type', item.MimeType || 'application/octet-stream');
    res.sendFile(physPath);
  } catch (err) {
    return error(res, 'Lỗi tải file', 500, err.message);
  }
};

module.exports = { getAttachments, addAttachment, deleteAttachment, downloadAttachment };
