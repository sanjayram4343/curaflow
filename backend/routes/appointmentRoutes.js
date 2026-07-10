import express from 'express';
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/:id/status')
  .put(protect, updateAppointmentStatus);

export default router;
