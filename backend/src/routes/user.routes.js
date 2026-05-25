const express = require('express');
const router = express.Router();
const {
  getAllUsers, getAllUsersAdmin, getUserById, getUsersByFaculty,
  addUser, updateUser, deleteUser, changePassword,
} = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', authMiddleware, adminOnly, getAllUsers);
router.get('/all', authMiddleware, adminOnly, getAllUsersAdmin);
router.get('/faculty/:facultyId', authMiddleware, getUsersByFaculty);
router.get('/:id', authMiddleware, getUserById);
router.post('/', authMiddleware, adminOnly, addUser);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, adminOnly, deleteUser);
router.post('/:id/change-password', authMiddleware, changePassword);

module.exports = router;
