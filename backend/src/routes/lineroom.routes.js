/**
 * routes/lineroom.routes.js — Routes truy vấn lịch đặt
 * ───────────────────────────────────────────────────────
 * QUAN TRỌNG — Thứ tự khai báo route:
 *   /all, /area/:id, /room/:id, /my  phải đứng TRƯỚC  /:id
 *   Nếu /:id đứng trước, Express sẽ hiểu "all" là một ID cụ thể → sai.
 *
 * Tóm tắt endpoints:
 *   GET  /api/linerooms/all              — toàn bộ lịch (CalendarView tất cả)
 *   GET  /api/linerooms/area/:areaId     — lịch theo khu vực
 *   GET  /api/linerooms/room/:roomId     — lịch theo phòng
 *   GET  /api/linerooms/my              — lịch cá nhân [login]
 *   GET  /api/linerooms/:id              — chi tiết 1 slot
 *   DELETE /api/linerooms/:id            — xoá [login, chủ booking]
 *   POST /api/linerooms/:id/attendees    — thêm người tham dự [login]
 *   POST /api/linerooms/:id/attachments  — upload tài liệu [login]
 *   GET  /api/linerooms/:id/attachments/:aid/download — tải file [login]
 */
const express = require('express');
const router = express.Router();
const {
  getByRoom, getByArea, getAllBookings,
  getMyBookings, getDetail, getForEdit,
  deleteBooking, addAttendees, removeAttendee,
} = require('../controllers/lineroom.controller');
const { getAttachments, addAttachment, deleteAttachment, downloadAttachment } = require('../controllers/attachment.controller');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const uploadDocs = require('../middleware/uploadDocs');

router.get('/all', getAllBookings);
router.get('/area/:areaId', getByArea);
router.get('/room/:roomId', getByRoom);
router.get('/my', authMiddleware, getMyBookings);
router.get('/:id/edit', authMiddleware, getForEdit);
router.get('/:id', getDetail);
router.delete('/:id', authMiddleware, deleteBooking);
router.post('/:id/attendees', authMiddleware, addAttendees);
router.delete('/:id/attendees/:userID', authMiddleware, removeAttendee);

// Attachments
router.get('/:id/attachments', optionalAuth, getAttachments);
router.post('/:id/attachments', authMiddleware, uploadDocs.single('file'), addAttachment);
router.get('/attachments/:id/download', authMiddleware, downloadAttachment);
router.delete('/attachments/:id', authMiddleware, deleteAttachment);

module.exports = router;
