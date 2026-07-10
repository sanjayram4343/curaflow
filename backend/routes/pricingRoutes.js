import express from 'express';
import {
  getPricingConfig,
  updatePricingItem
} from '../controllers/pricingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getPricingConfig);

router.route('/:key')
  .put(protect, updatePricingItem);

export default router;
