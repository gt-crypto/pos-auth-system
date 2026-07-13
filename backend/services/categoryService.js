import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Branch from '../models/Branch.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Helper to throw standard errors
 */
const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

/**
 * Creates a new Category
 * @param {Object} categoryData - Raw category input values
 * @param {Object} scope - Decoded user scope payload
 * @param {string} actorId - Active user ID
 * @param {Object} req - Express request object for audit logger
 */
export const createCategory = async (categoryData, scope, actorId, req) => {
  let targetBranchId = categoryData.branchId;

  if (!scope.isSuperAdmin) {
    targetBranchId = scope.branchId;
  } else {
    if (!targetBranchId) {
      // Fallback: use first active branch
      const activeBranch = await Branch.findOne({ status: 'ACTIVE', isDeleted: { $ne: true } });
      if (!activeBranch) {
        throwError('No active branch found in the system', 400);
      }
      targetBranchId = activeBranch._id;
    } else {
      const branchExists = await Branch.findById(targetBranchId);
      if (!branchExists || branchExists.status === 'INACTIVE') {
        throwError('Assigned branch must be active and exist', 400);
      }
    }
  }

  // Enforce name uniqueness inside target branch
  const existing = await Category.findOne({ 
    branchId: targetBranchId, 
    name: { $regex: new RegExp(`^${categoryData.name.trim()}$`, 'i') } 
  });
  if (existing) {
    throwError(`Category with name "${categoryData.name}" already exists in this branch`, 409);
  }

  const category = await Category.create({
    ...categoryData,
    branchId: targetBranchId,
    createdBy: actorId,
    updatedBy: actorId
  });

  await logAudit({
    actor: actorId,
    action: 'CREATE_CATEGORY',
    entityType: 'Category',
    entityId: category._id,
    branchId: targetBranchId,
    metadata: { name: category.name },
    req
  });

  return category;
};

/**
 * Queries categories with filters, pagination, and search
 */
export const getCategories = async (scope, query = {}) => {
  const { search, branchId, status, page = 1, limit = 10, sortBy = 'newest' } = query;
  const filter = {};

  // Branch Isolation check
  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  // Search by name
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  // Active status filter
  if (status === 'ACTIVE') {
    filter.isActive = true;
  } else if (status === 'INACTIVE') {
    filter.isActive = false;
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = {};

  if (sortBy === 'oldest') {
    sortOptions.createdAt = 1;
  } else if (sortBy === 'alphabetical') {
    sortOptions.name = 1;
  } else if (sortBy === 'displayOrder') {
    sortOptions.displayOrder = 1;
  } else {
    sortOptions.createdAt = -1; // Default: newest
  }

  const totalRecords = await Category.countDocuments(filter);
  const categoriesList = await Category.find(filter)
    .sort(sortOptions)
    .skip(skipIndex)
    .limit(parseInt(limit))
    .lean();

  // Aggregate product counts for each category
  const categoriesWithCount = await Promise.all(
    categoriesList.map(async (cat) => {
      const count = await Product.countDocuments({ categoryId: cat._id, status: 'ACTIVE' });
      return { ...cat, productsCount: count };
    })
  );

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    categories: categoriesWithCount,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
};

/**
 * Fetches category by ID
 */
export const getCategoryById = async (id, scope) => {
  const category = await Category.findById(id).lean();
  if (!category) {
    throwError('Category not found', 404);
  }

  // Scope enforcement
  if (!scope.isSuperAdmin && category.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch mismatch', 403);
  }

  return category;
};

/**
 * Updates Category details
 */
export const updateCategory = async (id, updateData, scope, actorId, req) => {
  const category = await Category.findById(id);
  if (!category) {
    throwError('Category not found', 404);
  }

  // Scope enforcement
  if (!scope.isSuperAdmin && category.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch mismatch', 403);
  }

  // Prevent parameters tampering
  delete updateData.branchId;
  delete updateData.createdBy;

  // Name uniqueness check if renaming
  if (updateData.name && updateData.name.trim().toLowerCase() !== category.name.toLowerCase()) {
    const existing = await Category.findOne({
      branchId: category.branchId,
      name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') },
      _id: { $ne: id }
    });
    if (existing) {
      throwError(`Category with name "${updateData.name}" already exists in this branch`, 409);
    }
  }

  const oldValues = {
    name: category.name,
    description: category.description,
    displayOrder: category.displayOrder
  };

  category.name = updateData.name || category.name;
  category.description = updateData.description !== undefined ? updateData.description : category.description;
  category.displayOrder = updateData.displayOrder !== undefined ? updateData.displayOrder : category.displayOrder;
  category.updatedBy = actorId;

  await category.save();

  await logAudit({
    actor: actorId,
    action: 'UPDATE_CATEGORY',
    entityType: 'Category',
    entityId: category._id,
    branchId: category.branchId,
    metadata: { oldValues, newValues: updateData },
    req
  });

  return category;
};

/**
 * Soft deletes / toggles status of Category
 */
export const updateCategoryStatus = async (id, isActive, scope, actorId, req) => {
  const category = await Category.findById(id);
  if (!category) {
    throwError('Category not found', 404);
  }

  // Scope enforcement
  if (!scope.isSuperAdmin && category.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch mismatch', 403);
  }

  const oldStatus = category.isActive;
  category.isActive = isActive;
  category.updatedBy = actorId;

  await category.save();

  // Audit event
  const actionName = isActive ? 'RESTORE_CATEGORY' : 'ARCHIVE_CATEGORY';
  await logAudit({
    actor: actorId,
    action: actionName,
    entityType: 'Category',
    entityId: category._id,
    branchId: category.branchId,
    metadata: { oldStatus, newStatus: isActive },
    req
  });

  // If archived (isActive = false), recursively disable all active products belonging to it
  if (!isActive) {
    await Product.updateMany(
      { categoryId: id },
      { status: 'INACTIVE', updatedBy: actorId }
    );
  }

  return category;
};
