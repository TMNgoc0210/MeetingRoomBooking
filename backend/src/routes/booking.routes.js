/**
 * routes/booking.routes.js — Routes đặt phòng & phê duyệt
 * ──────────────────────────────────────────────────────────
 * Tóm tắt endpoints:
 *   POST /api/bookings                   — đặt phòng mới [login]
 *   PUT  /api/bookings/:id               — sửa booking [login]
 *   PUT  /api/bookings/:id/approve       — duyệt [admin]
 *   PUT  /api/bookings/:id/reject        — từ chối (kèm lý do) [admin]
 *   PUT  /api/bookings/:id/cancel        — huỷ [login]
 *   GET  /api/bookings/pending           — danh sách chờ duyệt [admin]
 */
const express = require('express');
const router = express.Router();
const {
  bookRoom, updateBooking,
  approveBooking, rejectBooking, cancelBooking,
  getPendingBookings,
} = require('../controllers/booking.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/pending', authMiddleware, adminOnly, getPendingBookings);
router.post('/', authMiddleware, bookRoom);
router.put('/:id', authMiddleware, updateBooking);
router.put('/:id/approve', authMiddleware, adminOnly, approveBooking);
router.put('/:id/reject', authMiddleware, adminOnly, rejectBooking);
router.put('/:id/cancel', authMiddleware, cancelBooking);

module.exports = router;
