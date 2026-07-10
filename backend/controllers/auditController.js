import * as auditService from '../services/auditService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);

    if (result.exportType) {
      if (result.exportType === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      return res.status(200).send(result.data);
    }

    return sendSuccess(res, 'Audit logs retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await auditService.getAuditLogById(req.params.id);
    return sendSuccess(res, 'Audit log details retrieved successfully', { log });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};
