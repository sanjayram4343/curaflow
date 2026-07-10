import express from 'express';
import {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from '../controllers/equipmentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getEquipment)
  .post(protect, authorizeRoles('Super Admin', 'Hospital Admin'), createEquipment);

router.route('/:id')
  .get(protect, getEquipmentById)
  .put(protect, authorizeRoles('Super Admin', 'Hospital Admin'), updateEquipment)
  .delete(protect, authorizeRoles('Super Admin', 'Hospital Admin'), deleteEquipment);

export default router;
