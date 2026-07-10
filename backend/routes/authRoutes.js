import express from 'express';
import {
  loginUser,
  getUserProfile,
  createUser,
  getUsers,
  updateUser,
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.route('/users')
  .post(protect, authorizeRoles('Super Admin', 'Hospital Admin'), createUser)
  .get(protect, getUsers);

router.route('/users/:id')
  .put(protect, authorizeRoles('Super Admin', 'Hospital Admin'), updateUser);

export default router;
