const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, loginUser, logoutUser } = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.post('/login', loginUser);
router.post('/logout', authenticateToken, logoutUser);
router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.post('/', authenticateToken, requireRole(['ADMIN']), createUser);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateUser);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteUser);

module.exports = router;
