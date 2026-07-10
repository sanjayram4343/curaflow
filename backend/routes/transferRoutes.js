import express from 'express';
import {
  getTransfers,
  getTransferSuggestions,
  createTransfer,
  updateTransferStatus,
} from '../controllers/transferController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getTransfers)
  .post(protect, createTransfer);

router.get('/suggestions', protect, getTransferSuggestions);
router.put('/:id/status', protect, updateTransferStatus);

export default router;
