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
  exportToCSV
} from '../services/reportService.js';
import { logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const handleErr = (res, err) => {
  if (err.status) return sendError(res, err.message, err.status);
  console.error(err);
  return sendError(res, 'Internal server error', 500);
};

export const getDashboardCtrl = async (req, res) => {
  try {
    const data = await getDashboardMetrics(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Dashboard metrics fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getSalesCtrl = async (req, res) => {
  try {
    const data = await getSalesReport(req.query, req.scope, req.user.role);
    if (req.query.export === 'csv') {
      const rows = data.trend.map(t => ({
        Date: `${t._id.year}-${String(t._id.month).padStart(2,'0')}-${String(t._id.day || 1).padStart(2,'0')}`,
        Orders: t.orders,
        Revenue: t.revenue,
        Discount: t.discount,
        Tax: t.tax,
        'Net Revenue': t.netRevenue
      }));
      const csv = exportToCSV(['Date','Orders','Revenue','Discount','Tax','Net Revenue'], rows);
      await logAudit({ actor: req.user._id, action: 'REPORT_EXPORTED', entityType: 'Report', entityId: req.user._id, branchId: req.scope?.branchId, metadata: { report: 'sales' } });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
      return res.send(csv);
    }
    return sendSuccess(res, 'Sales report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getPaymentCtrl = async (req, res) => {
  try {
    const data = await getPaymentReport(req.query, req.scope, req.user.role);
    if (req.query.export === 'csv') {
      const rows = data.breakdown.map(p => ({
        Method: p.method, Count: p.count, Revenue: p.revenue, 'Percentage %': p.percentage
      }));
      const csv = exportToCSV(['Method','Count','Revenue','Percentage %'], rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payment-report.csv"');
      return res.send(csv);
    }
    return sendSuccess(res, 'Payment report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getProductsCtrl = async (req, res) => {
  try {
    const data = await getProductReport(req.query, req.scope, req.user.role);
    if (req.query.export === 'csv') {
      const rows = data.topSelling.map(p => ({
        Product: p.name, 'Units Sold': p.unitsSold, Revenue: p.revenue, Orders: p.orderCount
      }));
      const csv = exportToCSV(['Product','Units Sold','Revenue','Orders'], rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="product-report.csv"');
      return res.send(csv);
    }
    return sendSuccess(res, 'Product report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getInventoryCtrl = async (req, res) => {
  try {
    const data = await getInventoryReport(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Inventory report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getCashiersCtrl = async (req, res) => {
  try {
    const data = await getCashierReport(req.query, req.scope, req.user.role);
    if (req.query.export === 'csv') {
      const rows = data.cashiers.map(c => ({
        Cashier: c.name, Orders: c.orders, Revenue: c.revenue, Discounts: c.discounts, 'Avg Order': c.avgOrderValue
      }));
      const csv = exportToCSV(['Cashier','Orders','Revenue','Discounts','Avg Order'], rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="cashier-report.csv"');
      return res.send(csv);
    }
    return sendSuccess(res, 'Cashier report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getBranchesCtrl = async (req, res) => {
  try {
    const data = await getBranchReport(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Branch report fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getCustomerAnalyticsCtrl = async (req, res) => {
  try {
    const data = await getCustomerAnalytics(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Customer analytics fetched.', data);
  } catch (err) { return handleErr(res, err); }
};

export const getLowStockCtrl = async (req, res) => {
  try {
    const data = await getLowStockReport(req.query, req.scope, req.user.role);
    if (req.query.export === 'csv') {
      const rows = data.map(p => ({
        Product: p.productName, SKU: p.sku, 'Current Stock': p.currentStock, 'Reorder Threshold': p.reorderThreshold, Branch: p.branchName
      }));
      const csv = exportToCSV(['Product','SKU','Current Stock','Reorder Threshold','Branch'], rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="low-stock-report.csv"');
      return res.send(csv);
    }
    return sendSuccess(res, 'Low stock report fetched.', { lowStock: data });
  } catch (err) { return handleErr(res, err); }
};
