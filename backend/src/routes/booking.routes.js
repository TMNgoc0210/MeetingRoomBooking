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
