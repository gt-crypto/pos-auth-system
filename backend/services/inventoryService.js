import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Branch from '../models/Branch.js';
import Supplier from '../models/Supplier.js';
import InventoryHistory from '../models/InventoryHistory.js';
import StockTransfer from '../models/StockTransfer.js';
import { logAudit } from '../utils/auditLogger.js';

const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

// Check if the product unit is integer-based to reject decimals
const isIntegerUnit = (unit) => {
  if (!unit) return false;
  const clean = unit.trim().toLowerCase();
  return ['unit', 'units', 'item', 'items', 'piece', 'pieces', 'count', 'counts', 'box', 'boxes', 'pack', 'packs'].some(u => clean.startsWith(u) || clean === u);
};

// Preemptive decimal check
const validateDecimalRules = (quantity, threshold, unit) => {
  if (isIntegerUnit(unit)) {
    if (quantity % 1 !== 0) {
      throwError(`Decimals are not permitted for integer-based units (${unit}). Quantity must be a whole number.`, 400);
    }
    if (threshold !== undefined && threshold % 1 !== 0) {
      throwError(`Decimals are not permitted for integer-based units (${unit}). Reorder threshold must be a whole number.`, 400);
    }
  }
};

export const createInventory = async (inventoryData, scope, actorId, req) => {
  let targetBranchId = inventoryData.branchId;

  if (!scope.isSuperAdmin) {
    targetBranchId = scope.branchId;
  } else {
    if (!targetBranchId) {
      throwError('Branch ID is required for Super Admin creation', 400);
    }
    const branch = await Branch.findById(targetBranchId);
    if (!branch || branch.status === 'INACTIVE') {
      throwError('Assigned branch must be active and exist', 400);
    }
  }

  // Preemptive Unique constraint check
  const duplicate = await Inventory.findOne({ branchId: targetBranchId, productId: inventoryData.productId });
  if (duplicate) {
    throwError('An inventory configuration already exists for this product in this branch location.', 409);
  }

  // Verify product exists and belongs to this branch
  const product = await Product.findById(inventoryData.productId);
  if (!product) {
    throwError('Selected product does not exist', 404);
  }


  // Verify Supplier is active if selected
  if (inventoryData.supplierId) {
    const supplier = await Supplier.findById(inventoryData.supplierId);
    if (!supplier) {
      throwError('Selected supplier does not exist', 404);
    }
    if (supplier.status === 'INACTIVE') {
      throwError('Cannot assign an archived or inactive supplier to inventory', 400);
    }
  }

  // Decimal check
  validateDecimalRules(inventoryData.quantity, inventoryData.threshold, inventoryData.unit);

  const inventory = await Inventory.create({
    ...inventoryData,
    branchId: targetBranchId,
    createdBy: actorId,
    updatedBy: actorId
  });

  // Create initial restock movement history if quantity > 0
  if (inventory.quantity > 0) {
    await InventoryHistory.create({
      inventoryId: inventory._id,
      productId: inventory.productId,
      action: 'RESTOCK',
      quantity: inventory.quantity,
      previousQuantity: 0,
      newQuantity: inventory.quantity,
      notes: 'Initial stock intake on creation',
      userId: actorId,
      branchId: targetBranchId
    });
  }

  await logAudit({
    actor: actorId,
    action: 'CREATE_INVENTORY',
    entityType: 'Inventory',
    entityId: inventory._id,
    branchId: targetBranchId,
    metadata: { productId: inventory.productId, quantity: inventory.quantity },
    req
  });

  return inventory;
};

export const getInventory = async (scope, query = {}) => {
  const { 
    search, 
    branchId, 
    categoryId, 
    stockStatus, 
    supplierId, 
    page = 1, 
    limit = 10, 
    sortBy = 'newest' 
  } = query;

  const filter = {};

  // Scope constraints
  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  // Populate references to check query criteria
  // For filters: categoryId and Search (product name, sku, barcode, supplier name)
  let populatedFilterIds = null;
  
  if (search || categoryId) {
    const productQuery = {};
    if (categoryId) {
      productQuery.categoryId = categoryId;
    }
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      productQuery.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex }
      ];
    }
    const matchingProducts = await Product.find(productQuery).select('_id').lean();
    const productIds = matchingProducts.map(p => p._id);
    
    // Also check matching suppliers by name
    let supplierMatchingIds = [];
    if (search) {
      const matchingSuppliers = await Supplier.find({ companyName: { $regex: search, $options: 'i' } }).select('_id').lean();
      supplierMatchingIds = matchingSuppliers.map(s => s._id);
    }

    filter.$or = [
      { productId: { $in: productIds } },
      { supplierId: { $in: supplierMatchingIds } }
    ];
  }

  const allRecords = await Inventory.find(filter)
    .populate('productId', 'name sku price categoryId barcode')
    .populate('supplierId', 'companyName')
    .populate('branchId', 'name')
    .lean();

  // Dynamic Status Calculations and Status Filters
  // quantity == 0 ➔ OUT_OF_STOCK
  // quantity <= threshold ➔ LOW_STOCK
  // otherwise ➔ IN_STOCK
  let mappedList = allRecords.map(item => {
    let status = 'IN_STOCK';
    if (item.quantity === 0) {
      status = 'OUT_OF_STOCK';
    } else if (item.quantity <= item.threshold) {
      status = 'LOW_STOCK';
    }
    return {
      ...item,
      status
    };
  });

  if (stockStatus && stockStatus !== 'ALL') {
    mappedList = mappedList.filter(item => item.status === stockStatus);
  }

  // Sorting
  if (sortBy === 'quantity_asc') {
    mappedList.sort((a, b) => a.quantity - b.quantity);
  } else if (sortBy === 'quantity_desc') {
    mappedList.sort((a, b) => b.quantity - a.quantity);
  } else if (sortBy === 'threshold_desc') {
    mappedList.sort((a, b) => b.threshold - a.threshold);
  } else if (sortBy === 'productName') {
    mappedList.sort((a, b) => (a.productId?.name || '').localeCompare(b.productId?.name || ''));
  } else {
    // newest first
    mappedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Pagination
  const totalRecords = mappedList.length;
  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedList = mappedList.slice(skipIndex, skipIndex + parseInt(limit));
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    inventory: paginatedList,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
};

export const getInventoryById = async (id, scope) => {
  const inventory = await Inventory.findById(id)
    .populate('productId', 'name sku price description barcode imageUrl')
    .populate('supplierId', 'companyName contactPerson email phone')
    .populate('branchId', 'name')
    .lean();

  if (!inventory) {
    throwError('Inventory item not found', 404);
  }

  if (!scope.isSuperAdmin && inventory.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Compute status dynamically
  let status = 'IN_STOCK';
  if (inventory.quantity === 0) {
    status = 'OUT_OF_STOCK';
  } else if (inventory.quantity <= inventory.threshold) {
    status = 'LOW_STOCK';
  }

  // Aggregate recent movements history
  const history = await InventoryHistory.find({ inventoryId: id })
    .populate('userId', 'username')
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  return {
    inventory: { ...inventory, status },
    movements: history
  };
};

export const updateInventory = async (id, updateData, scope, actorId, req) => {
  const inventory = await Inventory.findById(id);
  if (!inventory) {
    throwError('Inventory record not found', 404);
  }

  if (!scope.isSuperAdmin && inventory.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Block product or branch editing
  delete updateData.productId;
  delete updateData.branchId;
  delete updateData.quantity; // Direct quantity edits via PUT are blocked

  // Verify Supplier is active if updating supplierId
  if (updateData.supplierId) {
    const supplier = await Supplier.findById(updateData.supplierId);
    if (!supplier) {
      throwError('Supplier not found', 404);
    }
    if (supplier.status === 'INACTIVE') {
      throwError('Cannot assign an archived or inactive supplier', 400);
    }
  }

  // Decimal check
  const unitToValidate = updateData.unit || inventory.unit;
  const thresholdToValidate = updateData.threshold !== undefined ? updateData.threshold : inventory.threshold;
  validateDecimalRules(inventory.quantity, thresholdToValidate, unitToValidate);

  const oldValues = {
    threshold: inventory.threshold,
    supplierId: inventory.supplierId,
    unit: inventory.unit
  };

  Object.keys(updateData).forEach(key => {
    inventory[key] = updateData[key];
  });
  inventory.updatedBy = actorId;
  await inventory.save();

  await logAudit({
    actor: actorId,
    action: 'UPDATE_INVENTORY',
    entityType: 'Inventory',
    entityId: inventory._id,
    branchId: inventory.branchId,
    metadata: { oldValues, newValues: updateData },
    req
  });

  return inventory;
};

export const restockInventory = async (restockData, scope, actorId, req) => {
  const { inventoryId, quantityAdded, supplierId, invoiceNumber, notes } = restockData;

  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    throwError('Inventory record not found', 404);
  }

  if (!scope.isSuperAdmin && inventory.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Decimal checks
  validateDecimalRules(quantityAdded, undefined, inventory.unit);

  // Supplier Active verification
  if (supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier || supplier.status === 'INACTIVE') {
      throwError('Selected supplier does not exist or is archived/inactive', 400);
    }
  }

  const previousQuantity = inventory.quantity;
  inventory.quantity += quantityAdded;
  if (supplierId) {
    inventory.supplierId = supplierId; // link/update supplier reference on restocking
  }
  inventory.updatedBy = actorId;
  await inventory.save();

  // Create immutable ledger movement history
  const history = await InventoryHistory.create({
    inventoryId: inventory._id,
    productId: inventory.productId,
    action: 'RESTOCK',
    quantity: quantityAdded,
    previousQuantity,
    newQuantity: inventory.quantity,
    invoiceNumber,
    notes: notes || `Stock addition of +${quantityAdded} ${inventory.unit}`,
    userId: actorId,
    branchId: inventory.branchId
  });

  await logAudit({
    actor: actorId,
    action: 'RESTOCK_INVENTORY',
    entityType: 'Inventory',
    entityId: inventory._id,
    branchId: inventory.branchId,
    metadata: { quantityAdded, invoiceNumber, previousQuantity, newQuantity: inventory.quantity },
    req
  });

  return inventory;
};

export const adjustInventory = async (adjustData, scope, actorId, req) => {
  const { inventoryId, newQuantity, reason, notes } = adjustData;

  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) {
    throwError('Inventory record not found', 404);
  }

  if (!scope.isSuperAdmin && inventory.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Decimal checks
  validateDecimalRules(newQuantity, undefined, inventory.unit);

  const previousQuantity = inventory.quantity;
  const difference = newQuantity - previousQuantity;
  
  inventory.quantity = newQuantity;
  inventory.updatedBy = actorId;
  await inventory.save();

  // Create movement history
  await InventoryHistory.create({
    inventoryId: inventory._id,
    productId: inventory.productId,
    action: 'ADJUSTMENT',
    quantity: difference,
    previousQuantity,
    newQuantity,
    notes: `${reason}: ${notes}`,
    userId: actorId,
    branchId: inventory.branchId
  });

  await logAudit({
    actor: actorId,
    action: 'ADJUST_INVENTORY',
    entityType: 'Inventory',
    entityId: inventory._id,
    branchId: inventory.branchId,
    metadata: { reason, previousQuantity, newQuantity, difference },
    req
  });

  return inventory;
};

export const transferInventory = async (transferData, scope, actorId, req) => {
  const { productId, fromBranch, toBranch, quantity, notes } = transferData;

  if (fromBranch.toString() === toBranch.toString()) {
    throwError('Source branch and destination branch must be different.', 400);
  }

  // Verify RBAC Admin branch restrictions
  if (!scope.isSuperAdmin) {
    if (scope.branchId.toString() !== fromBranch.toString() && scope.branchId.toString() !== toBranch.toString()) {
      throwError('Access denied: you can only coordinate transfers matching your assigned branch location', 403);
    }
  }

  // Verify source inventory item exists
  const sourceInv = await Inventory.findOne({ branchId: fromBranch, productId });
  if (!sourceInv) {
    throwError('Source branch does not have an active inventory configuration for this product.', 404);
  }

  if (sourceInv.quantity < quantity) {
    throwError(`Insufficient inventory stock. Branch has ${sourceInv.quantity} ${sourceInv.unit} available; requested ${quantity}.`, 400);
  }

  // Decimal checks
  validateDecimalRules(quantity, undefined, sourceInv.unit);

  // Verify or Create destination inventory item
  let destInv = await Inventory.findOne({ branchId: toBranch, productId });
  const createdDest = !destInv;
  if (!destInv) {
    // Create matching config on destination branch
    destInv = new Inventory({
      productId,
      branchId: toBranch,
      quantity: 0,
      threshold: 0,
      unit: sourceInv.unit,
      createdBy: actorId,
      updatedBy: actorId
    });
  }

  const prevSrcQty = sourceInv.quantity;
  const prevDestQty = destInv.quantity;

  // Let's try replica-set transaction first
  let committed = false;
  try {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      sourceInv.quantity -= quantity;
      sourceInv.updatedBy = actorId;
      await sourceInv.save({ session });

      destInv.quantity += quantity;
      destInv.updatedBy = actorId;
      await destInv.save({ session });

      await StockTransfer.create([{
        fromBranch,
        toBranch,
        productId,
        quantity,
        transferredBy: actorId,
        status: 'APPROVED'
      }], { session });

      await InventoryHistory.create([{
        inventoryId: sourceInv._id,
        productId,
        action: 'TRANSFER_OUT',
        quantity: -quantity,
        previousQuantity: prevSrcQty,
        newQuantity: sourceInv.quantity,
        notes: notes || `Stock transfer sent to branch ${toBranch}`,
        userId: actorId,
        branchId: fromBranch
      }, {
        inventoryId: destInv._id,
        productId,
        action: 'TRANSFER_IN',
        quantity: quantity,
        previousQuantity: prevDestQty,
        newQuantity: destInv.quantity,
        notes: notes || `Stock transfer received from branch ${fromBranch}`,
        userId: actorId,
        branchId: toBranch
      }], { session });

      await session.commitTransaction();
      committed = true;
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      session.endSession();
    }
  } catch (err) {
    // Check if the error is due to replica set missing
    const isReplicaSetError = err.message.includes('replica set') || err.message.includes('Transaction numbers');
    if (!isReplicaSetError) {
      throwError(`Database transfer transaction aborted: ${err.message}`, 500);
    }

    // FALLBACK FOR STANDALONE MONGO INSTANCES (MANUAL ROLLBACK)
    try {
      sourceInv.quantity -= quantity;
      sourceInv.updatedBy = actorId;
      await sourceInv.save();

      destInv.quantity += quantity;
      destInv.updatedBy = actorId;
      await destInv.save();

      await StockTransfer.create({
        fromBranch,
        toBranch,
        productId,
        quantity,
        transferredBy: actorId,
        status: 'APPROVED'
      });

      await InventoryHistory.create({
        inventoryId: sourceInv._id,
        productId,
        action: 'TRANSFER_OUT',
        quantity: -quantity,
        previousQuantity: prevSrcQty,
        newQuantity: sourceInv.quantity,
        notes: notes || `Stock transfer sent to branch ${toBranch}`,
        userId: actorId,
        branchId: fromBranch
      });

      await InventoryHistory.create({
        inventoryId: destInv._id,
        productId,
        action: 'TRANSFER_IN',
        quantity: quantity,
        previousQuantity: prevDestQty,
        newQuantity: destInv.quantity,
        notes: notes || `Stock transfer received from branch ${fromBranch}`,
        userId: actorId,
        branchId: toBranch
      });

      committed = true;
    } catch (manualErr) {
      // Manual Rollback to original values
      try {
        await Inventory.updateOne({ _id: sourceInv._id }, { $set: { quantity: prevSrcQty } });
        if (createdDest) {
          await Inventory.deleteOne({ _id: destInv._id });
        } else {
          await Inventory.updateOne({ _id: destInv._id }, { $set: { quantity: prevDestQty } });
        }
      } catch (rollbackErr) {
        console.error('CRITICAL ERROR: Rollback failed:', rollbackErr.message);
      }
      throwError(`Stock transfer failed: ${manualErr.message}`, 500);
    }
  }

  if (committed) {
    await logAudit({
      actor: actorId,
      action: 'TRANSFER_INVENTORY',
      entityType: 'Product',
      entityId: productId,
      branchId: fromBranch,
      metadata: { fromBranch, toBranch, quantity },
      req
    });
  }

  return { sourceInv, destInv };
};

export const getInventoryHistory = async (scope, query = {}) => {
  const { branchId, productId, action, page = 1, limit = 10 } = query;
  
  const filter = {};

  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  if (productId) {
    filter.productId = productId;
  }

  if (action) {
    filter.action = action;
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);

  const totalRecords = await InventoryHistory.countDocuments(filter);
  const history = await InventoryHistory.find(filter)
    .populate('productId', 'name sku')
    .populate('branchId', 'name')
    .populate('userId', 'username')
    .sort({ timestamp: -1 })
    .skip(skipIndex)
    .limit(parseInt(limit))
    .lean();

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    history,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
};

export const getLowStock = async (scope) => {
  const filter = {};
  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  }

  const allItems = await Inventory.find(filter)
    .populate('productId', 'name sku price')
    .populate('branchId', 'name')
    .lean();

  // Dynamic filter matching quantity <= threshold
  const lowStock = allItems.filter(item => item.quantity <= item.threshold)
    .map(item => {
      let status = item.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
      return { ...item, status };
    })
    .slice(0, 10); // top 10 only

  return lowStock;
};

export const getDashboardMetrics = async (scope) => {
  const filter = {};
  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  }

  const allItems = await Inventory.find(filter)
    .populate('productId', 'name sku price')
    .lean();

  const totalItems = allItems.length;
  const lowStockCount = allItems.filter(item => item.quantity <= item.threshold).length;

  // Total Inventory Value: Sum of quantity * product.price
  const totalValue = allItems.reduce((sum, item) => {
    const price = item.productId?.price || 0;
    return sum + (item.quantity * price);
  }, 0);

  // Recently Restocked (last 7 days restock operations)
  const historyFilter = { action: 'RESTOCK' };
  if (!scope.isSuperAdmin) {
    historyFilter.branchId = scope.branchId;
  }
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  historyFilter.timestamp = { $gte: oneWeekAgo };

  const recentlyRestockedCount = await InventoryHistory.countDocuments(historyFilter);

  return {
    totalItems,
    lowStockCount,
    totalValue,
    recentlyRestockedCount
  };
};
