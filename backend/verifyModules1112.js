import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Branch from './models/Branch.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Inventory from './models/Inventory.js';
import Ingredient from './models/Ingredient.js';
import IngredientHistory from './models/IngredientHistory.js';
import AuditLog from './models/AuditLog.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';
import InventoryHistory from './models/InventoryHistory.js';
import * as auditService from './services/auditService.js';
import * as ingredientService from './services/ingredientService.js';
import * as userService from './services/userService.js';
import * as billingService from './services/billingService.js';

dotenv.config();

const log = (msg, ok = true) => console.log(`${ok ? '✔' : '✘'} ${msg}`);
const fail = (msg, err) => { console.error(`✘ ${msg}:`, err?.message || err); process.exit(1); };

async function run() {
  if (!process.env.MONGO_URI) {
    fail('MONGO_URI env variable is missing');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🧪 Running integration tests for Module 11 (Audit Logs) & Module 12 (Kitchen Ingredients)...\n');

  // Clear out previous test runs to ensure complete isolation
  await AuditLog.collection.deleteMany({});
  await Ingredient.deleteMany({});
  await IngredientHistory.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await InventoryHistory.deleteMany({});

  // Fetch or Seed basic entities
  const branchAlpha = await Branch.findOne({ branchCode: 'B-ALPH' }) || await Branch.create({
    name: 'Branch Alpha', branchCode: 'B-ALPH', phone: '+1234567890', email: 'alpha@branch.com', status: 'ACTIVE'
  });
  const branchBeta = await Branch.findOne({ branchCode: 'B-BETA' }) || await Branch.create({
    name: 'Branch Beta', branchCode: 'B-BETA', phone: '+1234567891', email: 'beta@branch.com', status: 'ACTIVE'
  });

  const superAdmin = await User.findOne({ username: 'superadmin' }) || await User.create({
    username: 'superadmin', password: 'Password@123', email: 'super@admin.com', name: 'Super Admin', role: 'SUPER_ADMIN', status: 'ACTIVE'
  });
  const admin = await User.findOne({ username: 'admin' }) || await User.create({
    username: 'admin', password: 'Password@123', email: 'admin@branch.com', name: 'Branch Admin', role: 'ADMIN', status: 'ACTIVE', branchId: branchAlpha._id
  });
  const cashier = await User.findOne({ username: 'cashier' }) || await User.create({
    username: 'cashier', password: 'Password@123', email: 'cashier@branch.com', name: 'Cashier User', role: 'CASHIER', status: 'ACTIVE', branchId: branchAlpha._id, hasIngredientsAccess: false
  });

  const scopeSuper = { isSuperAdmin: true };
  const scopeAdmin = { isSuperAdmin: false, branchId: branchAlpha._id };

  // =========================================================================
  // MODULE 11: AUDIT LOGS TESTS
  // =========================================================================

  // 1. Immutable Audit Log check
  let testLog = await AuditLog.create({
    performedBy: superAdmin._id,
    performedByRole: 'SUPER_ADMIN',
    action: 'TEST_ACTION',
    entityType: 'User',
    entityId: superAdmin._id,
    branchId: branchAlpha._id,
    metadata: { test: true }
  });
  log('Audit log successfully created');

  try {
    testLog.action = 'MUTATED';
    await testLog.save();
    fail('FAIL: Audit log document update was not blocked!');
  } catch (err) {
    log('Audit log Mongoose pre-save hook successfully blocked update (Immutability)');
  }

  try {
    await AuditLog.deleteOne({ _id: testLog._id });
    fail('FAIL: Audit log direct deletion was not blocked!');
  } catch (err) {
    log('Audit log query hook successfully blocked deletion');
  }

  // 2. Fetch Audit Logs with Pagination & Filters
  const fetchResult = await auditService.getAuditLogs({ page: 1, limit: 10 });
  if (fetchResult.logs && fetchResult.logs.length >= 1) {
    log('Audit logs paginated retrieval functional');
  } else {
    fail('Audit logs fetch returned empty list');
  }

  // 3. Export to CSV & JSON
  const csvExport = await auditService.getAuditLogs({ export: 'csv' });
  if (csvExport.exportType === 'csv' && csvExport.data.includes('TEST_ACTION')) {
    log('Audit logs CSV serialization and export functional');
  } else {
    fail('CSV export failed or missing header rows');
  }

  const jsonExport = await auditService.getAuditLogs({ export: 'json' });
  if (jsonExport.exportType === 'json' && jsonExport.data.includes('TEST_ACTION')) {
    log('Audit logs JSON serialization and export functional');
  } else {
    fail('JSON export failed');
  }

  // 4. Discount Override logging
  const burgerCat = await Category.findOne({ name: 'Burgers' }) || await Category.create({ name: 'Burgers', branchId: branchAlpha._id, status: 'ACTIVE', createdBy: admin._id, updatedBy: admin._id });
  const burger = await Product.findOne({ name: 'Veg Burger' }) || await Product.create({
    name: 'Veg Burger', categoryId: burgerCat._id, price: 10, taxPercentage: 10, isAvailable: true, status: 'ACTIVE', branchId: branchAlpha._id, createdBy: admin._id, updatedBy: admin._id, sku: 'B-VEG'
  });
  await Inventory.findOneAndUpdate(
    { branchId: branchAlpha._id, productId: burger._id },
    { quantity: 20, currentStock: 20, createdBy: admin._id, unit: 'units' },
    { upsert: true }
  );

  await billingService.checkoutCart({
    customerId: null,
    customerName: 'Walk-in Customer',
    items: [{ productId: burger._id, name: burger.name, quantity: 1, unitPrice: 10, totalPrice: 10, discount: 2, taxPercentage: 10 }],
    subtotal: 10,
    totalDiscount: 2,
    totalTax: 0.8,
    totalAmount: 8.8,
    paymentMethods: [{ method: 'CASH', amount: 8.8 }]
  }, scopeAdmin, cashier._id);

  const discountLogs = await AuditLog.find({ action: 'DISCOUNT_OVERRIDE' });
  if (discountLogs.length === 1 && discountLogs[0].metadata.discountPercentage === 20) {
    log('Discount override (discount > 0) automatically created DISCOUNT_OVERRIDE log entry with exact metadata');
  } else {
    fail('Discount override audit log missing or miscalculated');
  }

  // 5. User updates hasIngredientsAccess logging
  await userService.updateUser(cashier._id, { hasIngredientsAccess: true }, admin);
  const grantLogs = await AuditLog.find({ action: 'INGREDIENTS_ACCESS_GRANTED' });
  if (grantLogs.length === 1) {
    log('Ingredients access GRANT logged successfully');
  } else {
    fail('Ingredients access GRANT audit log missing');
  }

  await userService.updateUser(cashier._id, { hasIngredientsAccess: false }, admin);
  const revokeLogs = await AuditLog.find({ action: 'INGREDIENTS_ACCESS_REVOKED' });
  if (revokeLogs.length === 1) {
    log('Ingredients access REVOKE logged successfully');
  } else {
    fail('Ingredients access REVOKE audit log missing');
  }

  // =========================================================================
  // MODULE 12: KITCHEN INGREDIENTS TESTS
  // =========================================================================

  // 6. Ingredient creation Zod categories & units validation
  try {
    await ingredientService.createIngredient({
      name: 'Salt', category: 'InvalidCategory', unit: 'Kg'
    }, scopeAdmin, admin._id);
    fail('FAIL: Accepted invalid category');
  } catch (err) {
    log('Zod validation successfully blocked invalid category');
  }

  try {
    await ingredientService.createIngredient({
      name: 'Salt', category: 'Spices', unit: 'InvalidUnit'
    }, scopeAdmin, admin._id);
    fail('FAIL: Accepted invalid unit');
  } catch (err) {
    log('Zod validation successfully blocked invalid unit');
  }

  // 7. Branch unique name constraint
  const ingSalt1 = await ingredientService.createIngredient({
    name: 'Table Salt', category: 'Spices', unit: 'Kg', quantity: 10, minimumQuantity: 2
  }, scopeAdmin, admin._id);
  log('First branch ingredient created successfully');

  try {
    await ingredientService.createIngredient({
      name: 'Table Salt', category: 'Spices', unit: 'Kg', quantity: 5
    }, scopeAdmin, admin._id);
    fail('FAIL: Accepted duplicate ingredient name in same branch');
  } catch (err) {
    log('Preemptive unique branch constraint successfully blocked duplicate name');
  }

  // 8. Quantities cannot be negative
  try {
    await ingredientService.createIngredient({
      name: 'Black Pepper', category: 'Spices', unit: 'Kg', quantity: -1
    }, scopeAdmin, admin._id);
    fail('FAIL: Accepted negative quantity');
  } catch (err) {
    log('Negative quantity correctly blocked by model validator');
  }

  // 9. Dashboard metrics categories & low stock calculation
  const ingMilk = await ingredientService.createIngredient({
    name: 'Milk', category: 'Dairy', unit: 'Liter', quantity: 0, minimumQuantity: 5
  }, scopeAdmin, admin._id);

  const metrics = await ingredientService.getIngredientMetrics(scopeAdmin);
  if (metrics.totalIngredients === 2 && metrics.lowStockIngredients === 0 && metrics.outOfStockIngredients === 1 && metrics.totalCategories === 2) {
    log('Dashboard metrics calculated correctly (Total, Low Stock, Out of Stock, Categories)');
  } else {
    fail(`Metrics mismatch: total=${metrics.totalIngredients}, low=${metrics.lowStockIngredients}, out=${metrics.outOfStockIngredients}, cats=${metrics.totalCategories}`);
  }

  // 10. PATCH /ingredients/:id/stock increase, decrease, adjust
  // Restock (increase)
  const restocked = await ingredientService.restockIngredient({
    ingredientId: ingSalt1._id, quantity: 5, costPerUnit: 2, reason: 'Weekly intake'
  }, scopeAdmin, admin._id);
  if (restocked.quantity === 15) {
    log('Restock operation successfully increased stock');
  } else {
    fail('Restock stock level mismatch');
  }

  // Decrease stock (adjustment)
  const adjusted = await ingredientService.adjustIngredient({
    ingredientId: ingSalt1._id, quantity: 8, reason: 'Manual waste correction'
  }, scopeAdmin, admin._id);
  if (adjusted.quantity === 8) {
    log('Adjust operation successfully updated stock level');
  } else {
    fail('Adjust stock level mismatch');
  }

  // 11. Low stock alerts logged in audits
  const alertLogs = await AuditLog.find({ action: { $in: ['LOW_STOCK_ALERT', 'OUT_OF_STOCK_ALERT'] } });
  // Table salt is quantity 8, minimum 2 (not low). Milk is quantity 0, minimum 5 (Out of stock alert / Low stock alert).
  if (alertLogs.length >= 1) {
    log('Low stock and out of stock conditions automatically generated audit alerts');
  } else {
    fail('Low stock alerts not logged');
  }

  // 12. Cross-branch transfer transaction fallback verification
  // Create destination base ingredient in branchBeta
  const betaScope = { isSuperAdmin: false, branchId: branchBeta._id };
  await ingredientService.transferIngredient({
    ingredientId: ingSalt1._id, toBranchId: branchBeta._id, quantity: 3, reason: 'Cross-branch transfer'
  }, scopeSuper, admin._id);

  const postSrc = await Ingredient.findById(ingSalt1._id);
  const postDest = await Ingredient.findOne({ branchId: branchBeta._id, name: 'Table Salt' });

  if (postSrc.quantity === 5 && postDest.quantity === 3) {
    log('Cross branch transfer transaction successfully relocated stock');
  } else {
    fail(`Transfer quantity mismatch: source=${postSrc.quantity}, dest=${postDest.quantity}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test leftovers...');
  await AuditLog.collection.deleteMany({});
  await Ingredient.deleteMany({});
  await IngredientHistory.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await InventoryHistory.deleteMany({});
  
  log('Verification checks completed successfully!');
}

run().catch(err => fail('Unhandled test suite error', err));
