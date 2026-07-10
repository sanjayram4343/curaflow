import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('Super Admin', 'Hospital Admin'), getAuditLogs);

export default router;
