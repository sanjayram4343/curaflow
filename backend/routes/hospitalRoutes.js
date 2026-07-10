import express from 'express';
import {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
} from '../controllers/hospitalController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getHospitals)
  .post(protect, authorizeRoles('Super Admin'), createHospital);

router.route('/:id')
  .get(protect, getHospitalById)
  .put(protect, authorizeRoles('Super Admin'), updateHospital)
  .delete(protect, authorizeRoles('Super Admin'), deleteHospital);

export default router;
