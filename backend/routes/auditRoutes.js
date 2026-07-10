import express from 'express';
import * as auditController from '../controllers/auditController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getAuditLogsSchema } from '../validators/auditValidator.js';

const router = express.Router();

const enforceSuperAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Super Admin role required' });
};

const validateAuditQuery = (req, res, next) => {
  const parsed = getAuditLogsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, message: parsed.error.errors[0].message });
  }
  req.query = parsed.data;
  next();
};

router.use(protect);
router.use(enforceSuperAdminOnly);

router.get('/', validateAuditQuery, auditController.getAuditLogs);
router.get('/:id', auditController.getAuditLogById);

export default router;
