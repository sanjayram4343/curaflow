import express from 'express';
import {
  getReservations,
  createReservation,
  cancelReservation,
} from '../controllers/reservationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getReservations)
  .post(protect, createReservation);

router.put('/:id/cancel', protect, cancelReservation);

export default router;
