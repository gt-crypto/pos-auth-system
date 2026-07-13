import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Branch from '../models/Branch.js';
import { logAudit } from '../utils/auditLogger.js';

// ---------- Helpers ----------

const buildBranchFilter = (scope, role) => {
  if (role === 'SUPER_ADMIN') return {};
  return { branchId: scope.branchId };
};

const generateOrderNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rnd}`;
};

// ---------- Customer CRUD ----------

export const createCustomer = async (body, actor, scope) => {
  let branchId = scope?.branchId || body.branchId;
  if (!branchId) {
    // Super admin fallback: associate with the first active branch
    const defaultBranch = await Branch.findOne({ status: 'ACTIVE' });
    if (!defaultBranch) throw { status: 400, message: 'No active branches found to associate customer.' };
    branchId = defaultBranch._id;
  }

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) throw { status: 404, message: 'Branch not found.' };

  // Duplicate phone check within branch
  const phoneVal = body.phone || body.phoneNumber;
  const existing = await Customer.findOne({ branchId, phoneNumber: phoneVal, isDeleted: false });
  if (existing) {
    throw { status: 409, message: `A customer with phone number "${phoneVal}" already exists in this branch.` };
  }

  const customer = await Customer.create({
    name: body.name,
    phoneNumber: phoneVal,
    phone: phoneVal,
    email: body.email || '',
    branchId,
    notes: body.notes || '',
    createdBy: actor._id,
    updatedBy: actor._id
  });

  await logAudit({
    actor: actor._id,
    action: 'CREATE_CUSTOMER',
    entityType: 'Customer',
    entityId: customer._id,
    branchId,
    metadata: { name: customer.name, phone: customer.phoneNumber }
  });

  return customer;
};

export const getCustomers = async (query, scope, role) => {
  const {
    search = '',
    branchId: queryBranch,
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const filter = { ...buildBranchFilter(scope, role), isDeleted: false };
  if (role === 'SUPER_ADMIN' && queryBranch) filter.branchId = queryBranch;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('branchId', 'name')
      .populate('createdBy', 'username'),
    Customer.countDocuments(filter)
  ]);

  // For each customer, aggregate order stats
  const customerIds = customers.map(c => c._id);
  const stats = await Order.aggregate([
    { $match: { customerId: { $in: customerIds }, status: 'COMPLETED' } },
    {
      $group: {
        _id: '$customerId',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        lastPurchase: { $max: '$orderDate' }
      }
    }
  ]);

  const statsMap = {};
  stats.forEach(s => { statsMap[s._id.toString()] = s; });

  const enriched = customers.map(c => {
    const s = statsMap[c._id.toString()] || {};
    return {
      ...c.toObject(),
      totalOrders: s.totalOrders || 0,
      totalSpent: s.totalSpent || 0,
      lastPurchase: s.lastPurchase || null
    };
  });

  return {
    customers: enriched,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

export const getCustomerById = async (id, scope, role) => {
  const filter = { _id: id, ...buildBranchFilter(scope, role), isDeleted: false };
  const customer = await Customer.findOne(filter)
    .populate('branchId', 'name')
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username');
  if (!customer) throw { status: 404, message: 'Customer not found.' };

  // Stats
  const [stats] = await Order.aggregate([
    { $match: { customerId: customer._id, status: 'COMPLETED' } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        totalDiscount: { $sum: '$totalDiscount' },
        avgOrderValue: { $avg: '$totalAmount' },
        lastPurchase: { $max: '$orderDate' }
      }
    }
  ]);

  // Most purchased products
  const topProducts = await Order.aggregate([
    { $match: { customerId: customer._id, status: 'COMPLETED' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        totalQty: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.totalPrice' }
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 5 }
  ]);

  return {
    ...customer.toObject(),
    totalOrders: stats?.totalOrders || 0,
    totalSpent: stats?.totalSpent || 0,
    avgOrderValue: stats?.avgOrderValue || 0,
    lastPurchase: stats?.lastPurchase || null,
    topProducts
  };
};

export const updateCustomer = async (id, body, actor, scope, role) => {
  const filter = { _id: id, ...buildBranchFilter(scope, role), isDeleted: false };
  const customer = await Customer.findOne(filter);
  if (!customer) throw { status: 404, message: 'Customer not found.' };

  // Duplicate phone check (exclude self)
  const phoneVal = body.phone || body.phoneNumber;
  if (phoneVal && phoneVal !== customer.phoneNumber) {
    const dup = await Customer.findOne({ branchId: customer.branchId, phoneNumber: phoneVal, _id: { $ne: id }, isDeleted: false });
    if (dup) throw { status: 409, message: `Phone number "${phoneVal}" is already in use in this branch.` };
  }

  const updates = { ...body };
  if (phoneVal) {
    updates.phoneNumber = phoneVal;
    updates.phone = phoneVal;
  }
  Object.assign(customer, { ...updates, updatedBy: actor._id });
  await customer.save();

  await logAudit({
    actor: actor._id,
    action: 'UPDATE_CUSTOMER',
    entityType: 'Customer',
    entityId: customer._id,
    branchId: customer.branchId,
    metadata: { updated: Object.keys(body) }
  });

  return customer;
};

export const archiveCustomer = async (id, actor, scope, role) => {
  const filter = { _id: id, ...buildBranchFilter(scope, role), isDeleted: false };
  const customer = await Customer.findOne(filter);
  if (!customer) throw { status: 404, message: 'Customer not found.' };

  customer.status = 'INACTIVE';
  customer.isDeleted = true;
  customer.updatedBy = actor._id;
  await customer.save();

  await logAudit({
    actor: actor._id,
    action: 'ARCHIVE_CUSTOMER',
    entityType: 'Customer',
    entityId: customer._id,
    branchId: customer.branchId,
    metadata: {}
  });

  return customer;
};

export const restoreCustomer = async (id, actor, scope, role) => {
  const filter = { _id: id, ...buildBranchFilter(scope, role), isDeleted: true };
  const customer = await Customer.findOne(filter);
  if (!customer) throw { status: 404, message: 'Customer not found.' };

  customer.status = 'ACTIVE';
  customer.isDeleted = false;
  customer.updatedBy = actor._id;
  await customer.save();

  await logAudit({
    actor: actor._id,
    action: 'RESTORE_CUSTOMER',
    entityType: 'Customer',
    entityId: customer._id,
    branchId: customer.branchId,
    metadata: {}
  });

  return customer;
};

// ---------- Search (POS autocomplete) ----------

export const searchCustomers = async (q, scope, role) => {
  const branchFilter = buildBranchFilter(scope, role);
  const filter = {
    ...branchFilter,
    status: 'ACTIVE',
    isDeleted: false,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { phoneNumber: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  };
  return Customer.find(filter).select('name phoneNumber phone email branchId').limit(10).lean();
};

// ---------- Customer Purchase History ----------

export const getCustomerHistory = async (customerId, query, scope, role) => {
  const { page = 1, limit = 20, search = '', startDate, endDate } = query;

  const customerFilter = { _id: customerId, ...buildBranchFilter(scope, role), isDeleted: false };
  const customer = await Customer.findOne(customerFilter);
  if (!customer) throw { status: 404, message: 'Customer not found.' };

  const orderFilter = { customerId: customer._id };
  if (startDate || endDate) {
    orderFilter.orderDate = {};
    if (startDate) orderFilter.orderDate.$gte = new Date(startDate);
    if (endDate) orderFilter.orderDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }
  if (search) orderFilter.orderNumber = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(orderFilter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('cashierId', 'username name')
      .populate('branchId', 'name'),
    Order.countDocuments(orderFilter)
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

// ---------- Customer Dashboard Metrics ----------

export const getCustomerMetrics = async (scope, role) => {
  const branchFilter = buildBranchFilter(scope, role);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, todayNew, returning, topSpenders] = await Promise.all([
    Customer.countDocuments({ ...branchFilter, status: 'ACTIVE', isDeleted: false }),
    Customer.countDocuments({ ...branchFilter, createdAt: { $gte: todayStart }, isDeleted: false }),
    Order.aggregate([
      { $match: { ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}), status: 'COMPLETED' } },
      { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
      { $match: { _id: { $ne: null }, orderCount: { $gt: 1 } } },
      { $count: 'count' }
    ]),
    Order.aggregate([
      { $match: { ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}), status: 'COMPLETED', customerId: { $ne: null } } },
      { $group: { _id: '$customerId', totalSpent: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$customer.name',
          phone: '$customer.phoneNumber',
          totalSpent: 1,
          totalOrders: 1
        }
      }
    ])
  ]);

  return {
    totalCustomers: total,
    newToday: todayNew,
    returning: returning[0]?.count || 0,
    topSpenders
  };
};

// ---------- Orders ----------

export const createOrder = async (body, actor, scope) => {
  const branchId = scope?.branchId || body.branchId;
  if (!branchId) throw { status: 400, message: 'Branch reference is required.' };

  const orderNumber = generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customerId: body.customerId || null,
    customerName: body.customerName || 'Walk-in Customer',
    customerPhone: body.customerPhone || '',
    branchId,
    cashierId: actor._id,
    items: body.items,
    subtotal: body.subtotal,
    totalDiscount: body.totalDiscount || 0,
    totalTax: body.totalTax || 0,
    totalAmount: body.totalAmount,
    paymentMethod: body.paymentMethod,
    paymentMethods: [{ method: body.paymentMethod, amount: body.totalAmount }],
    notes: body.notes || '',
    orderDate: new Date()
  });

  await logAudit({
    actor: actor._id,
    action: 'CREATE_ORDER',
    entityType: 'Order',
    entityId: order._id,
    branchId,
    metadata: { orderNumber, totalAmount: body.totalAmount, paymentMethod: body.paymentMethod }
  });

  return order;
};

export const getOrders = async (query, scope, role) => {
  const { page = 1, limit = 20, paymentMethod, status, startDate, endDate, customerId } = query;
  const branchFilter = buildBranchFilter(scope, role);
  const filter = { ...branchFilter };

  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (startDate || endDate) {
    filter.orderDate = {};
    if (startDate) filter.orderDate.$gte = new Date(startDate);
    if (endDate) filter.orderDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('customerId', 'name phoneNumber')
      .populate('cashierId', 'username')
      .populate('branchId', 'name'),
    Order.countDocuments(filter)
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};
