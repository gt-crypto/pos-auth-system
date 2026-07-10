import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

export const logAudit = async ({
  actor,
  performedByRole,
  action,
  entityType,
  entityId,
  branchId = null,
  metadata = {},
  req = null
}) => {
  try {
    let finalPerformedBy = actor;
    let finalRole = performedByRole || 'SYSTEM';
    let finalBranchId = branchId;
    let ipAddress = '';
    let userAgent = '';

    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      userAgent = req.headers['user-agent'] || '';
      
      if (req.user) {
        finalPerformedBy = req.user._id;
        finalRole = req.user.role;
        if (!finalBranchId && req.user.branchId) {
          finalBranchId = req.user.branchId;
        }
      }
    }

    // Fallback: If no role is supplied and we have a performedBy ID, look it up
    if (finalPerformedBy && finalRole === 'SYSTEM') {
      try {
        const u = await User.findById(finalPerformedBy).lean();
        if (u) {
          finalRole = u.role;
          if (!finalBranchId && u.branchId) {
            finalBranchId = u.branchId;
          }
        }
      } catch (userErr) {
        // Suppress lookup errors
      }
    }

    await AuditLog.create({
      performedBy: finalPerformedBy,
      actor: finalPerformedBy, // for backward compatibility
      performedByRole: finalRole,
      action,
      entityType,
      entityId,
      branchId: finalBranchId || null,
      metadata,
      ipAddress,
      userAgent
    });

    logger.info(`Audit logged: ${action} on ${entityType} (${entityId}) by user ${finalPerformedBy} (${finalRole})`);
  } catch (err) {
    logger.error(`Failed to write audit log: ${err.message}`);
  }
};
