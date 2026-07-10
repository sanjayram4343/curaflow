import express from 'express';
import {
  getDashboardSummary,
  getAnalyticsData,
  getReceptionSummary,
} from '../controllers/reportsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardSummary);
router.get('/analytics', protect, getAnalyticsData);
router.get('/reception', protect, getReceptionSummary);

export default router;
