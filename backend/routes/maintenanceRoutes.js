import express from 'express';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
} from '../controllers/maintenanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getMaintenanceRequests)
  .post(protect, createMaintenanceRequest);

router.put('/:id/status', protect, updateMaintenanceStatus);

export default router;
