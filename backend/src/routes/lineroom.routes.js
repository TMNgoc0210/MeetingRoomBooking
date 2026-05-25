const express = require('express');
const router = express.Router();
const {
  getByRoom, getByArea, getAllBookings,
  getMyBookings, getDetail, getForEdit,
  deleteBooking, addAttendees, removeAttendee,
} = require('../controllers/lineroom.controller');
const { getAttachments, addAttachment, deleteAttachment } = require('../controllers/attachment.controller');
const { authMiddleware } = require('../middleware/auth');
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
router.get('/:id/attachments', getAttachments);
router.post('/:id/attachments', authMiddleware, uploadDocs.single('file'), addAttachment);
router.delete('/attachments/:id', authMiddleware, deleteAttachment);

module.exports = router;
