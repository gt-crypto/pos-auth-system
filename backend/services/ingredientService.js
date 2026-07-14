import mongoose from 'mongoose';
import Ingredient from '../models/Ingredient.js';
import IngredientHistory from '../models/IngredientHistory.js';
import Branch from '../models/Branch.js';
import Supplier from '../models/Supplier.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditLogger.js';
import logger from '../config/logger.js';

const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

// ---------- Low Stock Alert Helper ----------
const checkLowStockAlert = async (ingredient, actorId, req) => {
  if (ingredient.status === 'ACTIVE') {
    if (ingredient.quantity === 0) {
      await logAudit({
        actor: actorId,
        action: 'OUT_OF_STOCK_ALERT',
        entityType: 'Ingredient',
        entityId: ingredient._id,
        branchId: ingredient.branchId,
        metadata: { name: ingredient.name, quantity: 0 },
        req
      });
    } else if (ingredient.quantity <= ingredient.minimumQuantity) {
      await logAudit({
        actor: actorId,
        action: 'LOW_STOCK_ALERT',
        entityType: 'Ingredient',
        entityId: ingredient._id,
        branchId: ingredient.branchId,
        metadata: { name: ingredient.name, quantity: ingredient.quantity, minimumQuantity: ingredient.minimumQuantity },
        req
      });
    }
  }
};

// ---------- Ingredient CRUD ----------

export const createIngredient = async (ingredientData, scope, actorId, req) => {
  let targetBranchId = ingredientData.branch || ingredientData.branchId;

  if (!scope.isSuperAdmin) {
    targetBranchId = scope.branchId;
  } else if (!targetBranchId) {
    // Super admin fallback: associate with the first active branch
    const defaultBranch = await Branch.findOne({ status: 'ACTIVE' });
    if (!defaultBranch) {
      throwError('No active branches found to associate ingredient', 400);
    }
    targetBranchId = defaultBranch._id;
  } else {
    const branch = await Branch.findById(targetBranchId);
    if (!branch || branch.status === 'INACTIVE') throwError('Assigned branch must be active', 400);
  }

  // Preemptive Unique check: branch + name
  const duplicate = await Ingredient.findOne({
    branchId: targetBranchId,
    name: { $regex: new RegExp(`^${ingredientData.name.trim()}$`, 'i') }
  });
  if (duplicate) throwError(`An ingredient named "${ingredientData.name}" already exists in this branch.`, 409);

  // Supplier check
  const supplierId = ingredientData.supplier || ingredientData.supplierId;
  if (supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier || supplier.status === 'INACTIVE') throwError('Selected supplier does not exist or is inactive', 400);
  }

  // Support both key models on create
  const finalQuantity = ingredientData.quantity !== undefined ? ingredientData.quantity : (ingredientData.currentStock || 0);
  const finalMinQty = ingredientData.minimumQuantity !== undefined ? ingredientData.minimumQuantity : (ingredientData.reorderThreshold || 0);
  const finalCost = ingredientData.costPerUnit !== undefined ? ingredientData.costPerUnit : (ingredientData.costPrice || 0);

  const ingredient = await Ingredient.create({
    name: ingredientData.name,
    category: ingredientData.category,
    unit: ingredientData.unit,
    quantity: finalQuantity,
    currentStock: finalQuantity,
    minimumQuantity: finalMinQty,
    reorderThreshold: finalMinQty,
    costPerUnit: finalCost,
    costPrice: finalCost,
    supplier: supplierId || null,
    supplierId: supplierId || null,
    branch: targetBranchId,
    branchId: targetBranchId,
    createdBy: actorId,
    updatedBy: actorId
  });

  // History log if quantity > 0
  if (ingredient.quantity > 0) {
    await IngredientHistory.create({
      ingredientId: ingredient._id,
      branchId: targetBranchId,
      branch: targetBranchId,
      previousQuantity: 0,
      newQuantity: ingredient.quantity,
      quantityChanged: ingredient.quantity,
      quantity: ingredient.quantity,
      action: 'RESTOCK',
      operation: 'RESTOCK',
      reason: 'Initial stock on creation',
      actorId,
      user: actorId
    });
  }

  await logAudit({ actor: actorId, action: 'INGREDIENT_CREATED', entityType: 'Ingredient', entityId: ingredient._id, branchId: targetBranchId, metadata: { name: ingredient.name }, req });
  
  // Alert Check
  await checkLowStockAlert(ingredient, actorId, req);

  return ingredient;
};

export const getIngredients = async (scope, query = {}) => {
  const { search, branchId, category, supplierId, status, lowStock, page = 1, limit = 15 } = query;
  const filter = {};

  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  const targetSupplierId = supplierId;
  if (targetSupplierId) {
    filter.supplierId = targetSupplierId;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } }
    ];
  }

  let list = await Ingredient.find(filter)
    .sort({ name: 1 })
    .populate('supplierId', 'companyName')
    .populate('branchId', 'name')
    .lean();

  if (lowStock === 'true' || lowStock === true) {
    list = list.filter(item => item.quantity <= item.minimumQuantity);
  }

  const total = list.length;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginated = list.slice(skip, skip + parseInt(limit));

  return {
    ingredients: paginated,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

export const getIngredientById = async (id, scope) => {
  const filter = { _id: id };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter)
    .populate('supplierId', 'companyName')
    .populate('branchId', 'name')
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username')
    .lean();

  if (!ingredient) throwError('Ingredient not found', 404);

  // Fetch Stock History
  const stockHistory = await IngredientHistory.find({ ingredientId: id })
    .sort({ timestamp: -1 })
    .populate('actorId', 'username')
    .lean();

  // Fetch Audit History (associated audit logs for this specific entity ID)
  const auditHistory = await AuditLog.find({ entityId: id, entityType: 'Ingredient' })
    .sort({ timestamp: -1 })
    .populate('performedBy', 'username')
    .lean();

  return {
    ...ingredient,
    stockHistory,
    auditHistory
  };
};

export const updateIngredient = async (id, updateData, scope, actorId, req) => {
  const filter = { _id: id };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter);
  if (!ingredient) throwError('Ingredient not found', 404);

  // Exclude branch/product changes and stock quantity
  delete updateData.branchId;
  delete updateData.branch;
  delete updateData.currentStock;
  delete updateData.quantity;

  // Name duplicate check
  if (updateData.name && updateData.name.trim().toLowerCase() !== ingredient.name.toLowerCase()) {
    const dup = await Ingredient.findOne({
      branchId: ingredient.branchId,
      name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') },
      _id: { $ne: id }
    });
    if (dup) throwError(`An ingredient named "${updateData.name}" already exists in this branch.`, 409);
  }

  // Supplier check
  const supplierId = updateData.supplier || updateData.supplierId;
  if (supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier || supplier.status === 'INACTIVE') throwError('Selected supplier is inactive or invalid', 400);
  }

  const oldValues = { name: ingredient.name, category: ingredient.category, threshold: ingredient.minimumQuantity, price: ingredient.costPerUnit };

  Object.keys(updateData).forEach(key => {
    ingredient[key] = updateData[key];
  });
  ingredient.updatedBy = actorId;
  await ingredient.save();

  await logAudit({ actor: actorId, action: 'INGREDIENT_UPDATED', entityType: 'Ingredient', entityId: ingredient._id, branchId: ingredient.branchId, metadata: { oldValues, newValues: updateData }, req });
  
  // Alert Check
  await checkLowStockAlert(ingredient, actorId, req);

  return ingredient;
};

export const archiveIngredient = async (id, scope, actorId, req) => {
  const filter = { _id: id };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter);
  if (!ingredient) throwError('Ingredient not found', 404);
  if (ingredient.status === 'INACTIVE') throwError('Ingredient is already archived', 400);

  ingredient.status = 'INACTIVE';
  ingredient.updatedBy = actorId;
  await ingredient.save();

  await logAudit({ actor: actorId, action: 'INGREDIENT_DELETED', entityType: 'Ingredient', entityId: ingredient._id, branchId: ingredient.branchId, metadata: { name: ingredient.name }, req });
  return ingredient;
};

export const restoreIngredient = async (id, scope, actorId, req) => {
  const filter = { _id: id };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter);
  if (!ingredient) throwError('Ingredient not found', 404);
  if (ingredient.status === 'ACTIVE') throwError('Ingredient is already active', 400);

  ingredient.status = 'ACTIVE';
  ingredient.updatedBy = actorId;
  await ingredient.save();

  await logAudit({ actor: actorId, action: 'INGREDIENT_RESTORED', entityType: 'Ingredient', entityId: ingredient._id, branchId: ingredient.branchId, metadata: { name: ingredient.name }, req });
  return ingredient;
};

// ---------- Stock Adjustments / Operations ----------

export const restockIngredient = async (restockData, scope, actorId, req) => {
  const { ingredientId, quantity, costPrice, costPerUnit, reason, invoiceNumber, supplierId, supplier } = restockData;

  const filter = { _id: ingredientId };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter);
  if (!ingredient) throwError('Ingredient not found', 404);

  // Supplier check
  const targetSupplierId = supplier || supplierId;
  if (targetSupplierId) {
    const sup = await Supplier.findById(targetSupplierId);
    if (!sup || sup.status === 'INACTIVE') throwError('Selected supplier is inactive', 400);
  }

  const previousQuantity = ingredient.quantity;
  const restockPrice = costPerUnit !== undefined ? costPerUnit : costPrice;

  ingredient.quantity += quantity;
  if (restockPrice !== undefined) ingredient.costPerUnit = restockPrice;
  if (targetSupplierId) ingredient.supplier = targetSupplierId;
  ingredient.updatedBy = actorId;
  await ingredient.save();

  // Write History
  await IngredientHistory.create({
    ingredientId: ingredient._id,
    branchId: ingredient.branchId,
    branch: ingredient.branchId,
    previousQuantity,
    newQuantity: ingredient.quantity,
    quantityChanged: quantity,
    quantity,
    action: 'RESTOCK',
    operation: 'RESTOCK',
    reason,
    invoiceNumber: invoiceNumber || '',
    supplierId: targetSupplierId || null,
    supplier: targetSupplierId || null,
    actorId,
    user: actorId
  });

  await logAudit({ actor: actorId, action: 'STOCK_INCREASED', entityType: 'Ingredient', entityId: ingredient._id, branchId: ingredient.branchId, metadata: { quantity, invoiceNumber }, req });
  
  // Alert Check
  await checkLowStockAlert(ingredient, actorId, req);

  return ingredient;
};

export const adjustIngredient = async (adjustData, scope, actorId, req) => {
  const { ingredientId, quantity, reason } = adjustData; // quantity is new total stock

  const filter = { _id: ingredientId };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const ingredient = await Ingredient.findOne(filter);
  if (!ingredient) throwError('Ingredient not found', 404);

  const previousQuantity = ingredient.quantity;
  const quantityChanged = quantity - previousQuantity;
  ingredient.quantity = quantity;
  ingredient.updatedBy = actorId;
  await ingredient.save();

  // Write History
  await IngredientHistory.create({
    ingredientId: ingredient._id,
    branchId: ingredient.branchId,
    branch: ingredient.branchId,
    previousQuantity,
    newQuantity: quantity,
    quantityChanged,
    quantity: quantityChanged,
    action: 'ADJUSTMENT',
    operation: 'ADJUSTMENT',
    reason,
    actorId,
    user: actorId
  });

  await logAudit({ actor: actorId, action: 'STOCK_ADJUSTED', entityType: 'Ingredient', entityId: ingredient._id, branchId: ingredient.branchId, metadata: { previousQuantity, newQuantity: quantity, reason }, req });
  
  // Alert Check
  await checkLowStockAlert(ingredient, actorId, req);

  return ingredient;
};

export const transferIngredient = async (transferData, scope, actorId, req) => {
  const { ingredientId, toBranchId, quantity, reason } = transferData;

  const filter = { _id: ingredientId };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const srcIngredient = await Ingredient.findOne(filter);
  if (!srcIngredient) throwError('Source ingredient not found', 404);

  if (srcIngredient.branchId.toString() === toBranchId.toString()) {
    throwError('Source branch and destination branch must be different.', 400);
  }

  if (srcIngredient.quantity < quantity) {
    throwError(`Transfer quantity exceeds available stock. Available: ${srcIngredient.quantity} ${srcIngredient.unit}`, 400);
  }

  // Verify destination branch exists and is active
  const destBranch = await Branch.findOne({ _id: toBranchId, isDeleted: false });
  if (!destBranch || destBranch.status === 'INACTIVE') {
    throwError('Destination branch must be active and exist', 400);
  }

  // Find or create target ingredient on destination branch
  let destIngredient = await Ingredient.findOne({ branchId: toBranchId, name: srcIngredient.name });
  const createdDest = !destIngredient;
  if (!destIngredient) {
    destIngredient = new Ingredient({
      name: srcIngredient.name,
      category: srcIngredient.category,
      unit: srcIngredient.unit,
      quantity: 0,
      currentStock: 0,
      minimumQuantity: srcIngredient.minimumQuantity,
      reorderThreshold: srcIngredient.minimumQuantity,
      costPerUnit: srcIngredient.costPerUnit,
      costPrice: srcIngredient.costPerUnit,
      supplier: srcIngredient.supplier,
      supplierId: srcIngredient.supplier,
      branch: toBranchId,
      branchId: toBranchId,
      createdBy: actorId,
      updatedBy: actorId
    });
  }

  const prevSrcQty = srcIngredient.quantity;
  const prevDestQty = destIngredient.quantity;

  // Process transfer atomically (dual-mode transaction fallback)
  try {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      srcIngredient.quantity = prevSrcQty - quantity;
      srcIngredient.updatedBy = actorId;
      await srcIngredient.save({ session });

      destIngredient.quantity = prevDestQty + quantity;
      destIngredient.updatedBy = actorId;
      await destIngredient.save({ session });

      await IngredientHistory.create([{
        ingredientId: srcIngredient._id,
        branchId: srcIngredient.branchId,
        branch: srcIngredient.branchId,
        previousQuantity: prevSrcQty,
        newQuantity: srcIngredient.quantity,
        quantityChanged: -quantity,
        quantity: -quantity,
        action: 'TRANSFER_OUT',
        operation: 'TRANSFER_OUT',
        reason: reason || `Transfer to branch ID ${toBranchId}`,
        actorId,
        user: actorId
      }, {
        ingredientId: destIngredient._id,
        branchId: toBranchId,
        branch: toBranchId,
        previousQuantity: prevDestQty,
        newQuantity: destIngredient.quantity,
        quantityChanged: quantity,
        quantity,
        action: 'TRANSFER_IN',
        operation: 'TRANSFER_IN',
        reason: reason || `Transfer from branch ID ${srcIngredient.branchId}`,
        actorId,
        user: actorId
      }], { session, ordered: true });

      await session.commitTransaction();
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      session.endSession();
    }
  } catch (err) {
    const isReplicaSetError = err.message.includes('replica set') || err.message.includes('Transaction numbers');
    if (!isReplicaSetError) {
      throwError(`Database transfer transaction aborted: ${err.message}`, 500);
    }

    // FALLBACK
    try {
      srcIngredient.quantity = prevSrcQty - quantity;
      srcIngredient.updatedBy = actorId;
      await srcIngredient.save();

      destIngredient.quantity = prevDestQty + quantity;
      destIngredient.updatedBy = actorId;
      await destIngredient.save();

      await IngredientHistory.create({
        ingredientId: srcIngredient._id,
        branchId: srcIngredient.branchId,
        branch: srcIngredient.branchId,
        previousQuantity: prevSrcQty,
        newQuantity: srcIngredient.quantity,
        quantityChanged: -quantity,
        quantity: -quantity,
        action: 'TRANSFER_OUT',
        operation: 'TRANSFER_OUT',
        reason: reason || `Transfer to branch ID ${toBranchId}`,
        actorId,
        user: actorId
      });

      await IngredientHistory.create({
        ingredientId: destIngredient._id,
        branchId: toBranchId,
        branch: toBranchId,
        previousQuantity: prevDestQty,
        newQuantity: destIngredient.quantity,
        quantityChanged: quantity,
        quantity,
        action: 'TRANSFER_IN',
        operation: 'TRANSFER_IN',
        reason: reason || `Transfer from branch ID ${srcIngredient.branchId}`,
        actorId,
        user: actorId
      });
    } catch (manualErr) {
      // Manual Rollback
      try {
        await Ingredient.updateOne({ _id: srcIngredient._id }, { $set: { quantity: prevSrcQty, currentStock: prevSrcQty } });
        if (createdDest) {
          await Ingredient.deleteOne({ _id: destIngredient._id });
        } else {
          await Ingredient.updateOne({ _id: destIngredient._id }, { $set: { quantity: prevDestQty, currentStock: prevDestQty } });
        }
      } catch (rollbackErr) {
        logger.error('CRITICAL: Ingredient Rollback failed:', rollbackErr);
      }
      throw manualErr;
    }
  }

  await logAudit({ actor: actorId, action: 'STOCK_TRANSFER', entityType: 'Ingredient', entityId: srcIngredient._id, branchId: srcIngredient.branchId, metadata: { fromBranch: srcIngredient.branchId, toBranch: toBranchId, quantity }, req });
  
  // Alert Checks
  await checkLowStockAlert(srcIngredient, actorId, req);
  await checkLowStockAlert(destIngredient, actorId, req);

  return { srcIngredient, destIngredient };
};

// ---------- Ledgers & History & Dashboard ----------

export const getIngredientHistory = async (scope, query = {}) => {
  const { branchId, ingredientId, action, page = 1, limit = 15 } = query;
  const filter = {};

  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  if (ingredientId) filter.ingredientId = ingredientId;
  if (action) filter.action = action;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [history, total] = await Promise.all([
    IngredientHistory.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('ingredientId', 'name unit')
      .populate('branchId', 'name')
      .populate('actorId', 'username')
      .lean(),
    IngredientHistory.countDocuments(filter)
  ]);

  return {
    history,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

export const getLowStockIngredients = async (scope) => {
  const filter = { status: 'ACTIVE' };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const list = await Ingredient.find(filter)
    .populate('branchId', 'name')
    .lean();

  return list.filter(item => item.quantity <= item.minimumQuantity);
};

export const getIngredientMetrics = async (scope) => {
  const filter = { status: 'ACTIVE' };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const list = await Ingredient.find(filter).lean();
  const total = list.length;
  const lowStock = list.filter(item => item.quantity <= item.minimumQuantity && item.quantity > 0).length;
  const outOfStock = list.filter(item => item.quantity === 0).length;

  // Unique categories count
  const categories = [...new Set(list.map(item => item.category).filter(Boolean))];
  const totalCategories = categories.length;

  // Recently Restocked (last 10 histories)
  const historyFilter = { action: 'RESTOCK' };
  if (!scope.isSuperAdmin) historyFilter.branchId = scope.branchId;

  const recent = await IngredientHistory.find(historyFilter)
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('ingredientId', 'name unit')
    .populate('branchId', 'name')
    .lean();

  return {
    totalIngredients: total,
    lowStockIngredients: lowStock,
    outOfStockIngredients: outOfStock,
    totalCategories,
    recentRestocked: recent
  };
};
