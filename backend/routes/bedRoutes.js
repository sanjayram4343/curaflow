import express from 'express';
import {
  getBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed,
} from '../controllers/bedController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBeds)
  .post(protect, authorizeRoles('Super Admin', 'Hospital Admin'), createBed);

router.route('/:id')
  .get(protect, getBedById)
  .put(protect, authorizeRoles('Super Admin', 'Hospital Admin'), updateBed)
  .delete(protect, authorizeRoles('Super Admin', 'Hospital Admin'), deleteBed);

export default router;
