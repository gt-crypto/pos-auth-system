import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Branch from '../models/Branch.js';
import { logAudit } from '../utils/auditLogger.js';

const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

/**
 * Validates variants list constraints
 */
const validateVariants = (variants) => {
  if (!variants || variants.length === 0) return;

  const defaultVariants = variants.filter(v => v.isDefault === true);
  if (defaultVariants.length > 1) {
    throwError('A product cannot have more than one default variant configuration', 400);
  }
  if (defaultVariants.length === 0) {
    throwError('Product must have at least one variant set as the default choice', 400);
  }

  // Check unique variant names
  const names = variants.map(v => v.name.trim().toLowerCase());
  const nameSet = new Set(names);
  if (nameSet.size !== names.length) {
    throwError('Variant names must be unique within the product', 400);
  }
};

/**
 * Validates combo items constraints
 */
const validateComboItems = async (productId, comboItems, branchId) => {
  if (!comboItems || comboItems.length === 0) return;

  // Prevent self-reference
  if (productId && comboItems.map(id => id.toString()).includes(productId.toString())) {
    throwError('A combo product cannot reference itself as an item inside the combo list', 400);
  }

  // Ensure combo items belong to same branch and exist
  const items = await Product.find({ _id: { $in: comboItems } });
  if (items.length !== comboItems.length) {
    throwError('One or more referenced combo products do not exist', 400);
  }

  for (const item of items) {
    if (item.branchId.toString() !== branchId.toString()) {
      throwError('All combo items must belong to the same branch location', 400);
    }
    if (item.isCombo) {
      throwError('Nested combos are blocked. A combo product cannot contain another combo product', 400);
    }
  }
};

/**
 * Creates a new Product
 */
export const createProduct = async (productData, scope, actorId, req) => {
  let targetBranchId = productData.branchId;

  if (!scope.isSuperAdmin) {
    targetBranchId = scope.branchId;
  } else {
    if (!targetBranchId) {
      throwError('Branch ID is required for Super Admin creation');
    }
    const branchExists = await Branch.findById(targetBranchId);
    if (!branchExists || branchExists.status === 'INACTIVE') {
      throwError('Assigned branch must be active and exist', 400);
    }
  }

  // Verify Category existence and active status
  const category = await Category.findById(productData.categoryId);
  if (!category || category.branchId.toString() !== targetBranchId.toString()) {
    throwError('Target category does not exist or belongs to a different branch location', 400);
  }
  if (!category.isActive) {
    throwError('Cannot assign products to an inactive/archived category', 400);
  }

  // Verify SKU uniqueness inside this branch
  const existingSku = await Product.findOne({ branchId: targetBranchId, sku: productData.sku.trim() });
  if (existingSku) {
    throwError(`A product with SKU "${productData.sku}" already exists in this branch location`, 409);
  }

  // Verify Barcode uniqueness inside this branch
  if (productData.barcode && productData.barcode.trim() !== '') {
    const existingBarcode = await Product.findOne({ branchId: targetBranchId, barcode: productData.barcode.trim() });
    if (existingBarcode) {
      throwError(`A product with Barcode "${productData.barcode}" already exists in this branch location`, 409);
    }
  }

  // Verify Name uniqueness inside the same category of same branch
  const existingName = await Product.findOne({
    branchId: targetBranchId,
    categoryId: productData.categoryId,
    name: { $regex: new RegExp(`^${productData.name.trim()}$`, 'i') }
  });
  if (existingName) {
    throwError(`Product name "${productData.name}" already exists in this category`, 409);
  }

  // Validate variant rules
  validateVariants(productData.variants);

  // Validate combo items
  if (productData.isCombo) {
    await validateComboItems(null, productData.comboItems, targetBranchId);
  }

  const product = await Product.create({
    ...productData,
    branchId: targetBranchId,
    createdBy: actorId,
    updatedBy: actorId
  });

  await logAudit({
    actor: actorId,
    action: 'CREATE_PRODUCT',
    entityType: 'Product',
    entityId: product._id,
    branchId: targetBranchId,
    metadata: { name: product.name, sku: product.sku },
    req
  });

  return product;
};

/**
 * Lists products with query search, filters, pagination, and sorting
 */
export const getProducts = async (scope, query = {}) => {
  const { 
    search, 
    categoryId, 
    status, 
    isVeg, 
    isAvailable, 
    isCombo, 
    minPrice, 
    maxPrice, 
    branchId, 
    page = 1, 
    limit = 10, 
    sortBy = 'newest' 
  } = query;

  const filter = {};

  // Branch Scope Isolation check
  if (!scope.isSuperAdmin) {
    filter.branchId = scope.branchId;
  } else if (branchId) {
    filter.branchId = branchId;
  }

  // Search by Name, SKU, or Barcode (case-insensitive, partial matching)
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { barcode: searchRegex }
    ];
  }

  // Filters
  if (categoryId) filter.categoryId = categoryId;
  if (status) filter.status = status;
  if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
  if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
  if (isCombo !== undefined) filter.isCombo = isCombo === 'true';

  // Price range checks (check either base price or variant prices)
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {};
    if (minPrice !== undefined) priceFilter.$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) priceFilter.$lte = parseFloat(maxPrice);
    
    filter.$or = [
      { price: priceFilter },
      { 'variants.price': priceFilter }
    ];
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = {};

  if (sortBy === 'oldest') {
    sortOptions.createdAt = 1;
  } else if (sortBy === 'price_asc') {
    sortOptions.price = 1;
  } else if (sortBy === 'price_desc') {
    sortOptions.price = -1;
  } else if (sortBy === 'alphabetical') {
    sortOptions.name = 1;
  } else {
    sortOptions.createdAt = -1; // newest first
  }

  const totalRecords = await Product.countDocuments(filter);
  const productsList = await Product.find(filter)
    .populate('categoryId', 'name')
    .sort(sortOptions)
    .skip(skipIndex)
    .limit(parseInt(limit))
    .lean();

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    products: productsList,
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
 * Gets product details by ID
 */
export const getProductById = async (id, scope) => {
  const product = await Product.findById(id)
    .populate('categoryId', 'name isActive')
    .populate('comboItems', 'name sku price imageUrl')
    .lean();

  if (!product) {
    throwError('Product not found', 404);
  }

  // Scope verification
  if (!scope.isSuperAdmin && product.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  return product;
};

/**
 * Updates Product fields
 */
export const updateProduct = async (id, updateData, scope, actorId, req) => {
  const product = await Product.findById(id);
  if (!product) {
    throwError('Product not found', 404);
  }

  // Scope verification
  if (!scope.isSuperAdmin && product.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Strip overrides
  delete updateData.branchId;
  delete updateData.createdBy;

  // Validate category if updating
  if (updateData.categoryId && updateData.categoryId.toString() !== product.categoryId.toString()) {
    const category = await Category.findById(updateData.categoryId);
    if (!category || category.branchId.toString() !== product.branchId.toString()) {
      throwError('Assigned category does not exist or is in a different branch', 400);
    }
    if (!category.isActive) {
      throwError('Cannot assign products to an inactive/archived category', 400);
    }
  }

  // Validate SKU uniqueness
  if (updateData.sku && updateData.sku.trim() !== product.sku) {
    const existingSku = await Product.findOne({ 
      branchId: product.branchId, 
      sku: updateData.sku.trim(),
      _id: { $ne: id }
    });
    if (existingSku) {
      throwError(`A product with SKU "${updateData.sku}" already exists in this branch`, 409);
    }
  }

  // Validate Barcode uniqueness
  if (updateData.barcode && updateData.barcode.trim() !== product.barcode) {
    const existingBarcode = await Product.findOne({
      branchId: product.branchId,
      barcode: updateData.barcode.trim(),
      _id: { $ne: id }
    });
    if (existingBarcode) {
      throwError(`A product with Barcode "${updateData.barcode}" already exists in this branch`, 409);
    }
  }

  // Validate Name uniqueness inside category
  const targetCategory = updateData.categoryId || product.categoryId;
  const targetName = updateData.name || product.name;
  if (updateData.name || updateData.categoryId) {
    const existingName = await Product.findOne({
      branchId: product.branchId,
      categoryId: targetCategory,
      name: { $regex: new RegExp(`^${targetName.trim()}$`, 'i') },
      _id: { $ne: id }
    });
    if (existingName) {
      throwError(`Product name "${targetName}" already exists in this category`, 409);
    }
  }

  // Validate variants
  if (updateData.variants !== undefined) {
    validateVariants(updateData.variants);
  }

  // Validate combo items
  const isComboProduct = updateData.isCombo !== undefined ? updateData.isCombo : product.isCombo;
  const items = updateData.comboItems || product.comboItems;
  if (isComboProduct) {
    await validateComboItems(id, items, product.branchId);
  }

  const oldValues = {
    name: product.name,
    sku: product.sku,
    price: product.price,
    status: product.status,
    isAvailable: product.isAvailable
  };

  // Perform updates
  Object.keys(updateData).forEach(key => {
    product[key] = updateData[key];
  });
  product.updatedBy = actorId;

  await product.save();

  await logAudit({
    actor: actorId,
    action: 'UPDATE_PRODUCT',
    entityType: 'Product',
    entityId: product._id,
    branchId: product.branchId,
    metadata: { oldValues, newValues: updateData },
    req
  });

  return product;
};

/**
 * Toggles status (ACTIVE / INACTIVE) of Product
 */
export const updateProductStatus = async (id, status, scope, actorId, req) => {
  const product = await Product.findById(id);
  if (!product) {
    throwError('Product not found', 404);
  }

  // Scope verification
  if (!scope.isSuperAdmin && product.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // If restoring, make sure category is ACTIVE
  if (status === 'ACTIVE') {
    const category = await Category.findById(product.categoryId);
    if (!category || !category.isActive) {
      throwError('Cannot restore a product whose category is archived or inactive. Activate the category first.', 400);
    }
  }

  const oldStatus = product.status;
  product.status = status;
  product.updatedBy = actorId;

  await product.save();

  const actionName = status === 'ACTIVE' ? 'RESTORE_PRODUCT' : 'ARCHIVE_PRODUCT';
  await logAudit({
    actor: actorId,
    action: actionName,
    entityType: 'Product',
    entityId: product._id,
    branchId: product.branchId,
    metadata: { oldStatus, newStatus: status },
    req
  });

  return product;
};
