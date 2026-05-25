const express = require('express');
const router = express.Router();
const { getAll, getDetail, addRole, updateRole, deleteRole } = require('../controllers/role.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/',     authMiddleware, adminOnly, getAll);
router.get('/:id',  authMiddleware, adminOnly, getDetail);
router.post('/',    authMiddleware, adminOnly, addRole);
router.put('/:id',  authMiddleware, adminOnly, updateRole);
router.delete('/:id', authMiddleware, adminOnly, deleteRole);

module.exports = router;
