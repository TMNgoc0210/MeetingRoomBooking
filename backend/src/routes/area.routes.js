const express = require('express');
const router = express.Router();
const { getListArea, getAllArea, getDetailArea, addArea, updateArea, deleteArea } = require('../controllers/area.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', getListArea);
router.get('/all', getAllArea);
router.get('/:id', getDetailArea);
router.post('/', authMiddleware, adminOnly, addArea);
router.put('/:id', authMiddleware, adminOnly, updateArea);
router.delete('/:id', authMiddleware, adminOnly, deleteArea);

module.exports = router;
