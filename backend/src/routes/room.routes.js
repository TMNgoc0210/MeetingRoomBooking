const express = require('express');
const router = express.Router();
const {
  getListRoom, getAllRoom, getDetailRoom, getRoomsByArea,
  searchRoom, searchAllRoom, addRoom, updateRoom, deleteRoom,
} = require('../controllers/room.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', getListRoom);
router.get('/all', getAllRoom);
router.get('/search', searchRoom);
router.get('/search-all', authMiddleware, adminOnly, searchAllRoom);
router.get('/area/:areaId', getRoomsByArea);
router.get('/:id', getDetailRoom);
router.post('/', authMiddleware, adminOnly, addRoom);
router.put('/:id', authMiddleware, adminOnly, updateRoom);
router.delete('/:id', authMiddleware, adminOnly, deleteRoom);

module.exports = router;
