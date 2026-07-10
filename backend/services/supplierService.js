import Supplier from '../models/Supplier.js';
import Inventory from '../models/Inventory.js';
import InventoryHistory from '../models/InventoryHistory.js';
import { logAudit } from '../utils/auditLogger.js';

const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

export const createSupplier = async (supplierData, scope, actorId, req) => {
  // Check unique companyName
  const existing = await Supplier.findOne({ 
    companyName: { $regex: new RegExp(`^${supplierData.companyName.trim()}$`, 'i') } 
  });
  if (existing) {
    throwError(`A supplier with company name "${supplierData.companyName}" already exists`, 409);
  }

  const supplier = await Supplier.create({
    ...supplierData,
    createdBy: actorId,
    updatedBy: actorId
  });

  await logAudit({
    actor: actorId,
    action: 'CREATE_SUPPLIER',
    entityType: 'Supplier',
    entityId: supplier._id,
    branchId: scope.branchId || null,
    metadata: { companyName: supplier.companyName },
    req
  });

  return supplier;
};

export const getSuppliers = async (scope, query = {}) => {
  const { 
    search, 
    status = 'ACTIVE', 
    page = 1, 
    limit = 10, 
    sortBy = 'companyName' 
  } = query;

  const filter = {};

  if (status !== 'ALL') {
    filter.status = status;
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { companyName: searchRegex },
      { contactPerson: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = {};

  if (sortBy === 'oldest') {
    sortOptions.createdAt = 1;
  } else if (sortBy === 'newest') {
    sortOptions.createdAt = -1;
  } else if (sortBy === 'status') {
    sortOptions.status = 1;
  } else if (sortBy === 'companyName_desc') {
    sortOptions.companyName = -1;
  } else {
    sortOptions.companyName = 1; // default A-Z
  }

  const totalRecords = await Supplier.countDocuments(filter);
  const suppliers = await Supplier.find(filter)
    .sort(sortOptions)
    .skip(skipIndex)
    .limit(parseInt(limit))
    .lean();

  const totalPages = Math.ceil(totalRecords / limit);

  // For each supplier, dynamically calculate count of supplied active products
  const populatedSuppliers = await Promise.all(suppliers.map(async (sup) => {
    const productsCount = await Inventory.countDocuments({ supplierId: sup._id });
    return {
      ...sup,
      productsSuppliedCount: productsCount
    };
  }));

  return {
    suppliers: populatedSuppliers,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
};

export const getActiveSuppliers = async () => {
  return await Supplier.find({ status: 'ACTIVE' }).select('companyName contactPerson email').sort({ companyName: 1 }).lean();
};

export const getSupplierById = async (id, scope) => {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) {
    throwError('Supplier not found', 404);
  }

  // Calculate dynamic stats
  const inventories = await Inventory.find({ supplierId: id })
    .populate('productId', 'name sku price')
    .populate('branchId', 'name')
    .lean();

  // Aggregate recent restock logs
  const inventoryIds = inventories.map(inv => inv._id);
  const recentRestocks = await InventoryHistory.find({
    inventoryId: { $in: inventoryIds },
    action: 'RESTOCK'
  })
    .populate('productId', 'name sku price')
    .populate('branchId', 'name')
    .populate('userId', 'username')
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  // Dynamic Calculation: Cumulative purchased inventory value from restock history logs
  // Sum of (history.quantity * product.price)
  const allRestocks = await InventoryHistory.find({
    inventoryId: { $in: inventoryIds },
    action: 'RESTOCK'
  }).populate('productId', 'price').lean();

  const totalValuePurchased = allRestocks.reduce((sum, log) => {
    const price = log.productId?.price || 0;
    return sum + (log.quantity * price);
  }, 0);

  // Dynamic unique branches served
  const branchesServed = [...new Set(inventories.map(inv => inv.branchId?.name).filter(Boolean))];

  return {
    supplier,
    productsSupplied: inventories.map(inv => ({
      productId: inv.productId?._id,
      name: inv.productId?.name,
      sku: inv.productId?.sku,
      branchName: inv.branchId?.name,
      quantity: inv.quantity,
      unit: inv.unit
    })),
    recentRestocks,
    branchesServed,
    totalValuePurchased
  };
};

export const updateSupplier = async (id, updateData, scope, actorId, req) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throwError('Supplier not found', 404);
  }

  if (updateData.companyName && updateData.companyName.trim().toLowerCase() !== supplier.companyName.toLowerCase()) {
    const existing = await Supplier.findOne({ 
      companyName: { $regex: new RegExp(`^${updateData.companyName.trim()}$`, 'i') },
      _id: { $ne: id }
    });
    if (existing) {
      throwError(`A supplier with company name "${updateData.companyName}" already exists`, 409);
    }
  }

  const oldValues = {
    companyName: supplier.companyName,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address
  };

  Object.keys(updateData).forEach(key => {
    supplier[key] = updateData[key];
  });
  supplier.updatedBy = actorId;
  await supplier.save();

  await logAudit({
    actor: actorId,
    action: 'UPDATE_SUPPLIER',
    entityType: 'Supplier',
    entityId: supplier._id,
    branchId: scope.branchId || null,
    metadata: { oldValues, newValues: updateData },
    req
  });

  return supplier;
};

export const deleteSupplier = async (id, scope, actorId, req) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throwError('Supplier not found', 404);
  }

  if (supplier.status === 'INACTIVE') {
    throwError('Supplier is already archived', 400);
  }

  supplier.status = 'INACTIVE';
  supplier.updatedBy = actorId;
  await supplier.save();

  await logAudit({
    actor: actorId,
    action: 'ARCHIVE_SUPPLIER',
    entityType: 'Supplier',
    entityId: supplier._id,
    branchId: scope.branchId || null,
    metadata: { companyName: supplier.companyName },
    req
  });

  return supplier;
};

export const restoreSupplier = async (id, scope, actorId, req) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throwError('Supplier not found', 404);
  }

  if (supplier.status === 'ACTIVE') {
    throwError('Supplier is already active', 400);
  }

  supplier.status = 'ACTIVE';
  supplier.updatedBy = actorId;
  await supplier.save();

  await logAudit({
    actor: actorId,
    action: 'RESTORE_SUPPLIER',
    entityType: 'Supplier',
    entityId: supplier._id,
    branchId: scope.branchId || null,
    metadata: { companyName: supplier.companyName },
    req
  });

  return supplier;
};
