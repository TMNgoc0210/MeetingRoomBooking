const express = require('express');
const router = express.Router();
const { getAll, getByRoom, addEquipment, updateEquipment, deleteEquipment } = require('../controllers/equipment.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', authMiddleware, adminOnly, getAll);
router.get('/room/:roomId', getByRoom);
router.post('/', authMiddleware, adminOnly, addEquipment);
router.put('/:id', authMiddleware, adminOnly, updateEquipment);
router.delete('/:id', authMiddleware, adminOnly, deleteEquipment);

module.exports = router;
