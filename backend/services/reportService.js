import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { logAudit } from '../utils/auditLogger.js';

// ---------- Date Helpers ----------

const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'yesterday': {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      start = new Date(yesterday.setHours(0, 0, 0, 0));
      end = new Date(yesterday.setHours(23, 59, 59, 999));
      break;
    }
    case 'this_week': {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      start = new Date(weekStart.setHours(0, 0, 0, 0));
      end = new Date();
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      break;
    }
    case 'custom':
      if (!startDate || !endDate) throw { status: 400, message: 'Custom range requires startDate and endDate.' };
      start = new Date(startDate);
      end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      break;
    default:
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
  }

  return { start, end };
};

const buildBranchMatch = (scope, role, queryBranch) => {
  if (role === 'SUPER_ADMIN') {
    return queryBranch ? { branchId: { $eq: mongoose_id(queryBranch) } } : {};
  }
  return { branchId: scope.branchId };
};

import mongoose from 'mongoose';
const mongoose_id = (id) => new mongoose.Types.ObjectId(id);

// ---------- Dashboard Overview ----------

export const getDashboardMetrics = async (query, scope, role) => {
  const { period = 'today', startDate, endDate, branchId: queryBranch } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orderMatch = { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  const [summary, customerStats, lowStockCount] = await Promise.all([
    Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$totalDiscount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]),
    Promise.all([
      Customer.countDocuments({ ...(branchMatch.branchId ? { branchId: branchMatch.branchId } : {}), status: 'ACTIVE' }),
      Customer.countDocuments({ ...(branchMatch.branchId ? { branchId: branchMatch.branchId } : {}), createdAt: { $gte: todayStart } })
    ]),
    Inventory.countDocuments({
      ...(branchMatch.branchId ? { branchId: branchMatch.branchId } : {}),
      $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$threshold'] }] }
    })
  ]);

  // Top selling product
  const topProduct = await Order.aggregate([
    { $match: orderMatch },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', name: { $first: '$items.name' }, totalQty: { $sum: '$items.quantity' } } },
    { $sort: { totalQty: -1 } },
    { $limit: 1 }
  ]);

  const s = summary[0] || {};
  return {
    period: { start, end },
    totalOrders: s.totalOrders || 0,
    totalRevenue: s.totalRevenue || 0,
    avgOrderValue: s.avgOrderValue || 0,
    totalDiscount: s.totalDiscount || 0,
    totalCustomers: customerStats[0],
    newCustomersToday: customerStats[1],
    lowStockItems: lowStockCount,
    topProduct: topProduct[0] || null
  };
};

// ---------- Sales Report ----------

export const getSalesReport = async (query, scope, role) => {
  const { period = 'today', startDate, endDate, branchId: queryBranch, groupBy = 'day' } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);

  const match = { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  let dateGroupFormat;
  if (groupBy === 'month') dateGroupFormat = { year: { $year: '$orderDate' }, month: { $month: '$orderDate' } };
  else if (groupBy === 'week') dateGroupFormat = { year: { $year: '$orderDate' }, week: { $week: '$orderDate' } };
  else dateGroupFormat = { year: { $year: '$orderDate' }, month: { $month: '$orderDate' }, day: { $dayOfMonth: '$orderDate' } };

  const [trend, summary] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupFormat,
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          discount: { $sum: '$totalDiscount' },
          tax: { $sum: '$totalTax' },
          netRevenue: { $sum: { $subtract: ['$totalAmount', '$totalDiscount'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalTax: { $sum: '$totalTax' },
          netRevenue: { $sum: { $subtract: ['$totalAmount', '$totalDiscount'] } },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ])
  ]);

  return { period: { start, end }, summary: summary[0] || {}, trend };
};

// ---------- Payment Report ----------

export const getPaymentReport = async (query, scope, role) => {
  const { period = 'today', startDate, endDate, branchId: queryBranch } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);

  const match = { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  const [breakdown, totals] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCount: { $sum: 1 } } }
    ])
  ]);

  const total = totals[0]?.totalRevenue || 0;
  const enriched = breakdown.map(p => ({
    method: p._id,
    count: p.count,
    revenue: p.revenue,
    percentage: total > 0 ? +((p.revenue / total) * 100).toFixed(1) : 0
  }));

  return { period: { start, end }, total, breakdown: enriched };
};

// ---------- Product Report ----------

export const getProductReport = async (query, scope, role) => {
  const { period = 'today', startDate, endDate, branchId: queryBranch, limit = 10 } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);

  const match = { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  const [topSelling, leastSelling] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: parseInt(limit) }
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { unitsSold: 1 } },
      { $limit: parseInt(limit) }
    ])
  ]);

  return { period: { start, end }, topSelling, leastSelling };
};

// ---------- Inventory Report ----------

export const getInventoryReport = async (query, scope, role) => {
  const { period, startDate, endDate, branchId: queryBranch } = query;
  const branchMatch = buildBranchMatch(scope, role, queryBranch);
  const branchFilter = branchMatch.branchId ? { branchId: branchMatch.branchId } : {};

  const recentRestockFilter = { ...branchFilter };
  if (period) {
    const { start, end } = getDateRange(period, startDate, endDate);
    recentRestockFilter.updatedAt = { $gte: start, $lte: end };
  }

  const [total, outOfStock, lowStock, recentRestock] = await Promise.all([
    Inventory.countDocuments(branchFilter),
    Inventory.countDocuments({ ...branchFilter, quantity: 0 }),
    Inventory.countDocuments({
      ...branchFilter,
      $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$threshold'] }] }
    }),
    Inventory.find(recentRestockFilter)
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('productId', 'name sku')
      .populate('branchId', 'name')
      .lean()
  ]);

  // Inventory value
  const valuePipeline = await Inventory.aggregate([
    { $match: branchFilter },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$product.price', 0] }] } }
      }
    }
  ]);

  return {
    totalItems: total,
    outOfStock,
    lowStock,
    inStock: total - lowStock - outOfStock,
    totalInventoryValue: valuePipeline[0]?.totalValue || 0,
    recentRestock
  };
};

// ---------- Cashier Report ----------

export const getCashierReport = async (query, scope, role) => {
  const { period = 'today', startDate, endDate, branchId: queryBranch } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);

  const match = { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  const cashierStats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$cashierId',
        orders: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
        discounts: { $sum: '$totalDiscount' },
        avgOrderValue: { $avg: '$totalAmount' }
      }
    },
    { $sort: { revenue: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'cashier'
      }
    },
    { $unwind: { path: '$cashier', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        cashierId: '$_id',
        name: '$cashier.username',
        orders: 1,
        revenue: 1,
        discounts: 1,
        avgOrderValue: 1
      }
    }
  ]);

  return { period: { start, end }, cashiers: cashierStats };
};

// ---------- Branch Report (SUPER_ADMIN only) ----------

export const getBranchReport = async (query, scope, role) => {
  if (role !== 'SUPER_ADMIN') throw { status: 403, message: 'Only SUPER_ADMIN can access branch reports.' };
  const { period = 'today', startDate, endDate } = query;
  const { start, end } = getDateRange(period, startDate, endDate);

  const match = { orderDate: { $gte: start, $lte: end }, status: 'COMPLETED' };

  const [branchStats, branches] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'branchId',
          as: 'customers'
        }
      },
      {
        $project: {
          branchName: '$branch.name',
          totalOrders: 1,
          totalRevenue: 1,
          avgOrderValue: 1,
          totalCustomers: { $size: '$customers' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]),
    Branch.find({}).select('name status').lean()
  ]);

  return { period: { start, end }, branches: branchStats, allBranches: branches };
};

// ---------- Customer Analytics ----------

export const getCustomerAnalytics = async (query, scope, role) => {
  const { period = 'this_month', startDate, endDate, branchId: queryBranch } = query;
  const { start, end } = getDateRange(period, startDate, endDate);
  const branchMatch = buildBranchMatch(scope, role, queryBranch);
  const branchFilter = branchMatch.branchId ? { branchId: branchMatch.branchId } : {};

  const [newCustomers, topSpenders, mostFrequent] = await Promise.all([
    Customer.countDocuments({ ...branchFilter, createdAt: { $gte: start, $lte: end } }),
    Order.aggregate([
      { $match: { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED', customerId: { $ne: null } } },
      { $group: { _id: '$customerId', totalSpent: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$customer.name', phone: '$customer.phoneNumber', totalSpent: 1, totalOrders: 1 } }
    ]),
    Order.aggregate([
      { $match: { ...branchMatch, orderDate: { $gte: start, $lte: end }, status: 'COMPLETED', customerId: { $ne: null } } },
      { $group: { _id: '$customerId', visits: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
      { $sort: { visits: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$customer.name', phone: '$customer.phoneNumber', visits: 1, totalSpent: 1 } }
    ])
  ]);

  // Returning customers
  const returning = await Order.aggregate([
    { $match: { ...(branchMatch.branchId ? { branchId: branchMatch.branchId } : {}), status: 'COMPLETED', customerId: { $ne: null } } },
    { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
    { $match: { orderCount: { $gt: 1 } } },
    { $count: 'count' }
  ]);

  return {
    period: { start, end },
    newCustomers,
    returningCustomers: returning[0]?.count || 0,
    topSpenders,
    mostFrequent
  };
};

// ---------- Low Stock Products Report ----------

export const getLowStockReport = async (query, scope, role) => {
  const { branchId: queryBranch } = query;
  const branchMatch = buildBranchMatch(scope, role, queryBranch);
  const branchFilter = branchMatch.branchId ? { branchId: branchMatch.branchId } : {};

  const lowStockProducts = await Inventory.find({
    ...branchFilter,
    $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$threshold'] }] }
  })
    .populate('productId', 'name sku price')
    .populate('branchId', 'name')
    .lean();

  return lowStockProducts.map(inv => ({
    productId: inv.productId?._id || inv.productId,
    productName: inv.productId?.name || 'Unknown Product',
    sku: inv.productId?.sku || 'N/A',
    currentStock: inv.quantity,
    reorderThreshold: inv.threshold,
    branchName: inv.branchId?.name || 'N/A'
  }));
};

// ---------- Export Helper ----------

export const exportToCSV = (headers, rows) => {
  const csvHeaders = headers.join(',');
  const csvRows = rows.map(row =>
    headers.map(h => {
      const val = row[h] !== undefined ? row[h] : '';
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

// ---------- CSV Row Formatters (keep data-shaping out of controllers) ----------

export const formatSalesCSV = (trend) => {
  const headers = ['Date', 'Orders', 'Revenue', 'Discount', 'Tax', 'Net Revenue'];
  const rows = trend.map(t => ({
    Date: `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day ?? 1).padStart(2, '0')}`,
    Orders: t.orders,
    Revenue: t.revenue,
    Discount: t.discount,
    Tax: t.tax,
    'Net Revenue': t.netRevenue
  }));
  return exportToCSV(headers, rows);
};

export const formatPaymentCSV = (breakdown) => {
  const headers = ['Method', 'Count', 'Revenue', 'Percentage %'];
  const rows = breakdown.map(p => ({
    Method: p.method,
    Count: p.count,
    Revenue: p.revenue,
    'Percentage %': p.percentage
  }));
  return exportToCSV(headers, rows);
};

export const formatProductCSV = (topSelling) => {
  const headers = ['Product', 'Units Sold', 'Revenue', 'Orders'];
  const rows = topSelling.map(p => ({
    Product: p.name,
    'Units Sold': p.unitsSold,
    Revenue: p.revenue,
    Orders: p.orderCount
  }));
  return exportToCSV(headers, rows);
};

export const formatCashierCSV = (cashiers) => {
  const headers = ['Cashier', 'Orders', 'Revenue', 'Discounts', 'Avg Order'];
  const rows = cashiers.map(c => ({
    Cashier: c.name,
    Orders: c.orders,
    Revenue: c.revenue,
    Discounts: c.discounts,
    'Avg Order': c.avgOrderValue
  }));
  return exportToCSV(headers, rows);
};

export const formatLowStockCSV = (data) => {
  const headers = ['Product', 'SKU', 'Current Stock', 'Reorder Threshold', 'Branch'];
  const rows = data.map(p => ({
    Product: p.productName,
    SKU: p.sku,
    'Current Stock': p.currentStock,
    'Reorder Threshold': p.reorderThreshold,
    Branch: p.branchName
  }));
  return exportToCSV(headers, rows);
};

export const formatBranchCSV = (branches) => {
  const headers = ['Branch', 'Total Orders', 'Revenue', 'Avg Order', 'Customers'];
  const rows = branches.map(b => ({
    Branch: b.branchName || 'Unknown Branch',
    'Total Orders': b.totalOrders,
    Revenue: b.totalRevenue,
    'Avg Order': b.avgOrderValue,
    Customers: b.totalCustomers
  }));
  return exportToCSV(headers, rows);
};

export const formatInventoryCSV = (recentRestock) => {
  const headers = ['Product', 'SKU', 'Current Stock', 'Branch'];
  const rows = recentRestock.map(item => ({
    Product: item.productId?.name || 'Unknown Product',
    SKU: item.productId?.sku || 'N/A',
    'Current Stock': item.quantity,
    Branch: item.branchId?.name || 'N/A'
  }));
  return exportToCSV(headers, rows);
};

export const formatCustomerCSV = (topSpenders) => {
  const headers = ['Customer', 'Phone', 'Total Spent', 'Total Orders'];
  const rows = topSpenders.map(c => ({
    Customer: c.name || 'Unknown',
    Phone: c.phone || 'N/A',
    'Total Spent': c.totalSpent,
    'Total Orders': c.totalOrders
  }));
  return exportToCSV(headers, rows);
};


