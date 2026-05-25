const express = require('express');
const router = express.Router();
const { getListFaculty, getAllFaculty, getDetailFaculty, addFaculty, updateFaculty, deleteFaculty } = require('../controllers/faculty.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', getListFaculty);
router.get('/all', getAllFaculty);
router.get('/:id', getDetailFaculty);
router.post('/', authMiddleware, adminOnly, addFaculty);
router.put('/:id', authMiddleware, adminOnly, updateFaculty);
router.delete('/:id', authMiddleware, adminOnly, deleteFaculty);

module.exports = router;
