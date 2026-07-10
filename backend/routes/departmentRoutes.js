import express from 'express';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getDepartments)
  .post(protect, authorizeRoles('Super Admin', 'Hospital Admin'), createDepartment);

router.route('/:id')
  .put(protect, authorizeRoles('Super Admin', 'Hospital Admin'), updateDepartment)
  .delete(protect, authorizeRoles('Super Admin', 'Hospital Admin'), deleteDepartment);

export default router;
