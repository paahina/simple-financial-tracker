const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  loginUser,
  logoutUser,
  getSession,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  registerValidation,
  loginValidation,
  updateUserValidation,
  mongoIdParamValidation,
} = require('../middleware/validationMiddleware');
const {
  loginLimiter,
  registerLimiter,
} = require('../middleware/rateLimiterMiddleware');

const router = express.Router();

router.post('/login', loginLimiter, loginValidation, loginUser);
router.post('/register', registerLimiter, registerValidation, createUser);
router.post('/logout', protect, logoutUser);
router.get('/session', protect, getSession);
router.get('/getAllUsers', protect, authorize('SYSTEM_ADMIN'), getUsers);
router.get('/get/:id', protect, mongoIdParamValidation, getUserById);
router.put(
  '/update/:id',
  protect,
  mongoIdParamValidation,
  updateUserValidation,
  updateUser,
);
router.delete(
  '/delete/:id',
  protect,
  authorize('SYSTEM_ADMIN'),
  mongoIdParamValidation,
  deleteUser,
);

module.exports = router;
