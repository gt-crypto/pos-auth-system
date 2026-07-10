import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

export const getAuditLogs = async (query) => {
  const {
    page = 1,
    limit = 15,
    sort = 'timestamp',
    order = 'desc',
    search,
    action,
    performedByRole,
    branchId,
    performedBy,
    entityType,
    entityId,
    startDate,
    endDate,
    export: exportType
  } = query;

  const filter = {};

  // Direct filters
  if (action) filter.action = action;
  if (performedByRole) filter.performedByRole = performedByRole;
  if (branchId) filter.branchId = branchId;
  if (performedBy) filter.performedBy = performedBy;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;

  // Date filters
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = end;
    }
  }

  // Fuzzy Search across Action, User Role, Entity Type
  if (search) {
    filter.$or = [
      { action: { $regex: search, $options: 'i' } },
      { performedByRole: { $regex: search, $options: 'i' } },
      { entityType: { $regex: search, $options: 'i' } }
    ];

    // If search is a valid ObjectId, search by performedBy or entityId or branchId
    if (search.match(/^[0-9a-fA-F]{24}$/)) {
      filter.$or.push(
        { performedBy: search },
        { entityId: search },
        { branchId: search }
      );
    }
  }

  // Handle Export request (no pagination limit)
  if (exportType) {
    const logs = await AuditLog.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .populate('performedBy', 'username email')
      .populate('branchId', 'name')
      .lean();

    if (exportType === 'csv') {
      const headers = ['Timestamp', 'Performed By User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Branch', 'IP Address', 'User Agent', 'Metadata'];
      const rows = logs.map(log => [
        log.timestamp ? new Date(log.timestamp).toISOString() : '',
        log.performedBy?.username || 'SYSTEM',
        log.performedByRole || '',
        log.action || '',
        log.entityType || '',
        log.entityId ? log.entityId.toString() : '',
        log.branchId?.name || 'Global',
        log.ipAddress || '',
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return {
        exportType: 'csv',
        data: csvContent,
        filename: `audit_logs_${Date.now()}.csv`
      };
    }

    return {
      exportType: 'json',
      data: JSON.stringify(logs, null, 2),
      filename: `audit_logs_${Date.now()}.json`
    };
  }

  // Paginated List
  const skip = (page - 1) * limit;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'username name')
      .populate('branchId', 'name')
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getAuditLogById = async (id) => {
  const log = await AuditLog.findById(id)
    .populate('performedBy', 'username name email')
    .populate('branchId', 'name branchCode')
    .lean();

  if (!log) {
    const err = new Error('Audit log not found');
    err.status = 404;
    throw err;
  }

  return log;
};
