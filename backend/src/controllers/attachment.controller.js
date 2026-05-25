const path = require('path');
const fs = require('fs');
const { query, queryOne, execute } = require('../config/db');
const { success, error, notFound, badRequest } = require('../utils/response');

/** GET /api/linerooms/:id/attachments */
const getAttachments = async (req, res) => {
  try {
    const lineRoomID = parseInt(req.params.id);
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

module.exports = { getAttachments, addAttachment, deleteAttachment };
