import {
  getDashboardMetrics,
  getSalesReport,
  getPaymentReport,
  getProductReport,
  getInventoryReport,
  getCashierReport,
  getBranchReport,
  getCustomerAnalytics,
  getLowStockReport,
  formatSalesCSV,
  formatPaymentCSV,
  formatProductCSV,
  formatCashierCSV,
  formatLowStockCSV,
  formatBranchCSV,
  formatInventoryCSV,
  formatCustomerCSV
} from '../services/reportService.js';
import { logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { ROLE_PERMISSIONS } from '../config/rolePermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';

// Helper: send a CSV file response
const sendCSV = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
};

/**
 * Guard: called before any CSV branch.
 * Returns true and sends 403 if the user lacks EXPORT_REPORTS permission.
 * Use like: if (denyExport(req, res)) return;
 */
const denyExport = (req, res) => {
  const userPermissions = ROLE_PERMISSIONS[req.user.role] ?? [];
  if (!userPermissions.includes(PERMISSIONS.EXPORT_REPORTS)) {
    logger.warn(
      `[403] Export denied: user ${req.user.username} (Role: ${req.user.role}) lacks EXPORT_REPORTS permission`
    );
    sendError(res, 'Access denied: you do not have permission to export reports.', 403);
    return true;
  }
  return false;
};

export const getDashboardCtrl = asyncHandler(async (req, res) => {
  const data = await getDashboardMetrics(req.query, req.scope, req.user.role);
  return sendSuccess(res, 'Dashboard metrics fetched.', data);
});

export const getSalesCtrl = asyncHandler(async (req, res) => {
  const data = await getSalesReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'sales' }
    });
    logger.info(`Sales report exported as CSV by user: ${req.user.username}`);
    return sendCSV(res, 'sales-report.csv', formatSalesCSV(data.trend));
  }

  return sendSuccess(res, 'Sales report fetched.', data);
});

export const getPaymentCtrl = asyncHandler(async (req, res) => {
  const data = await getPaymentReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'payment-method' }
    });
    return sendCSV(res, 'payment-report.csv', formatPaymentCSV(data.breakdown));
  }

  return sendSuccess(res, 'Payment report fetched.', data);
});

export const getProductsCtrl = asyncHandler(async (req, res) => {
  const data = await getProductReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'top-products' }
    });
    return sendCSV(res, 'product-report.csv', formatProductCSV(data.topSelling));
  }

  return sendSuccess(res, 'Product report fetched.', data);
});

export const getInventoryCtrl = asyncHandler(async (req, res) => {
  const data = await getInventoryReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'inventory' }
    });
    return sendCSV(res, 'inventory-report.csv', formatInventoryCSV(data.recentRestock));
  }

  return sendSuccess(res, 'Inventory report fetched.', data);
});

export const getCashiersCtrl = asyncHandler(async (req, res) => {
  const data = await getCashierReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'cashiers' }
    });
    return sendCSV(res, 'cashier-report.csv', formatCashierCSV(data.cashiers));
  }

  return sendSuccess(res, 'Cashier report fetched.', data);
});

export const getBranchesCtrl = asyncHandler(async (req, res) => {
  const data = await getBranchReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'branches' }
    });
    return sendCSV(res, 'branch-report.csv', formatBranchCSV(data.branches));
  }

  return sendSuccess(res, 'Branch report fetched.', data);
});

export const getCustomerAnalyticsCtrl = asyncHandler(async (req, res) => {
  const data = await getCustomerAnalytics(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'customers' }
    });
    return sendCSV(res, 'customer-report.csv', formatCustomerCSV(data.topSpenders));
  }

  return sendSuccess(res, 'Customer analytics fetched.', data);
});


export const getLowStockCtrl = asyncHandler(async (req, res) => {
  const data = await getLowStockReport(req.query, req.scope, req.user.role);

  if (req.query.export === 'csv') {
    if (denyExport(req, res)) return;

    await logAudit({
      actor: req.user._id,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: req.user._id,
      branchId: req.scope?.branchId,
      metadata: { report: 'low-stock' }
    });
    return sendCSV(res, 'low-stock-report.csv', formatLowStockCSV(data));
  }

  return sendSuccess(res, 'Low stock report fetched.', { lowStock: data });
});
