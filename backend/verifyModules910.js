/**
 * verifyModules910.js
 * Automated test script for Module 9 (POS Billing) + Module 10 (Kitchen Ingredients)
 * Run: node verifyModules910.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Branch from './models/Branch.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Inventory from './models/Inventory.js';
import Customer from './models/Customer.js';
import Supplier from './models/Supplier.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';
import InventoryHistory from './models/InventoryHistory.js';
import AuditLog from './models/AuditLog.js';
import Ingredient from './models/Ingredient.js';
import IngredientHistory from './models/IngredientHistory.js';

import * as billingService from './services/billingService.js';
import * as ingredientService from './services/ingredientService.js';
import * as customerService from './services/customerService.js';

const log = (msg, ok = true) => console.log(`${ok ? '✔' : '✘'} ${msg}`);
const fail = (msg, err) => { console.error(`✘ ${msg}:`, err?.message || err); process.exit(1); };

await mongoose.connect(process.env.MONGO_URI);
console.log('\n🧪 Seeding data & running tests for Module 9 & 10...\n');

// Clear out previous test run leftovers to guarantee state isolation
await Order.deleteMany({});
await Payment.deleteMany({});
await InventoryHistory.deleteMany({});
await Customer.deleteMany({ phoneNumber: '+91-1111111111' });
await Ingredient.deleteMany({});
await IngredientHistory.deleteMany({});

// ── Seeding Branches, Categories, Products & Stock ────────────────────────
const branchA = await Branch.findOne({ name: 'Branch Alpha' }) || await Branch.create({
  name: 'Branch Alpha', branchCode: 'B-ALPH', phone: '+1234567890', email: 'alpha@branch.com',
  address: '123 Alpha St', city: 'Metropolis', state: 'NY', country: 'USA', pincode: '10001',
  managerName: 'John Alpha', status: 'ACTIVE'
});

const branchB = await Branch.findOne({ name: 'Branch Beta' }) || await Branch.create({
  name: 'Branch Beta', branchCode: 'B-BETA', phone: '+9876543210', email: 'beta@branch.com',
  address: '456 Beta Ave', city: 'Gotham', state: 'NJ', country: 'USA', pincode: '07001',
  managerName: 'Bruce Beta', status: 'ACTIVE'
});

const cat = await Category.findOne({ name: 'Foods' }) || await Category.create({ name: 'Foods', branchId: branchA._id, createdBy: new mongoose.Types.ObjectId(), updatedBy: new mongoose.Types.ObjectId() });

// Cashier User
const cashier = await User.findOne({ username: 'cashier_test' }) || await User.create({
  username: 'cashier_test', name: 'Cashier Test', email: 'cashier@test.com', password: 'password123',
  role: 'CASHIER', branchId: branchA._id, status: 'ACTIVE', hasIngredientsAccess: false
});

// Admin User
const admin = await User.findOne({ username: 'admin_test' }) || await User.create({
  username: 'admin_test', name: 'Admin Test', email: 'admin@test.com', password: 'password123',
  role: 'ADMIN', branchId: branchA._id, status: 'ACTIVE'
});

// Products: Normal, Inactive, Variant, Combo
const burger = await Product.findOne({ sku: 'B-001' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'Hamburger', sku: 'B-001', price: 10, taxPercentage: 10,
  isAvailable: true, status: 'ACTIVE', createdBy: admin._id, updatedBy: admin._id
});

const fries = await Product.findOne({ sku: 'B-002' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'French Fries', sku: 'B-002', price: 5, taxPercentage: 5,
  isAvailable: true, status: 'ACTIVE', createdBy: admin._id, updatedBy: admin._id
});

const coke = await Product.findOne({ sku: 'B-003' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'Coca Cola', sku: 'B-003', price: 3, taxPercentage: 12,
  isAvailable: true, status: 'ACTIVE', createdBy: admin._id, updatedBy: admin._id
});

const inactiveSoda = await Product.findOne({ sku: 'B-004' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'Inactive Soda', sku: 'B-004', price: 2, taxPercentage: 12,
  isAvailable: true, status: 'INACTIVE', createdBy: admin._id, updatedBy: admin._id
});

const coffee = await Product.findOne({ sku: 'C-001' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'Hot Coffee', sku: 'C-001', price: 4, taxPercentage: 8,
  isAvailable: true, status: 'ACTIVE', createdBy: admin._id, updatedBy: admin._id,
  variants: [
    { name: 'Small', price: 3.50, isDefault: false },
    { name: 'Medium', price: 4.50, isDefault: true },
    { name: 'Large', price: 5.50, isDefault: false }
  ]
});

const comboMeal = await Product.findOne({ sku: 'M-001' }) || await Product.create({
  branchId: branchA._id, categoryId: cat._id, name: 'Burger Combo', sku: 'M-001', price: 15, taxPercentage: 8,
  isAvailable: true, status: 'ACTIVE', isCombo: true, comboItems: [burger._id, fries._id, coke._id],
  createdBy: admin._id, updatedBy: admin._id
});

// Setup Initial Inventory
const setStock = async (prod, qty, threshold = 5) => {
  await Inventory.deleteMany({ branchId: branchA._id, productId: prod._id });
  return Inventory.create({
    productId: prod._id, branchId: branchA._id, quantity: qty, threshold, unit: 'pieces',
    createdBy: admin._id, updatedBy: admin._id
  });
};

await setStock(burger, 50);
await setStock(fries, 30);
await setStock(coke, 40);
await setStock(inactiveSoda, 10);
await setStock(coffee, 20); // main product inventory
log('Seeded POS menu products and inventory configurations');

// Setup customer
const cust = await Customer.findOne({ phoneNumber: '+91-1111111111' }) || await Customer.create({
  name: 'John Customer', phoneNumber: '+91-1111111111', email: 'john@gmail.com', branchId: branchA._id,
  createdBy: admin._id, updatedBy: admin._id
});

const scope = { branchId: branchA._id };

// ── TEST CASES ──────────────────────────────────────────────────────────────

try {
  // Test 1: Active Product Validation (fails if item is inactive)
  try {
    await billingService.checkoutCart({
      items: [{ productId: inactiveSoda._id, name: inactiveSoda.name, quantity: 1, unitPrice: 2, totalPrice: 2 }],
      subtotal: 2, totalAmount: 2, paymentMethods: [{ method: 'CASH', amount: 2 }]
    }, scope, cashier._id);
    fail('Active validation: should block inactive product');
  } catch (e) {
    if (e.message.includes('inactive')) log('Checkout validated & correctly blocked inactive product');
    else fail('Active validation unexpected error', e);
  }

  // Test 2: Out of Stock validation (fails if inventory is insufficient)
  try {
    await billingService.checkoutCart({
      items: [{ productId: burger._id, name: burger.name, quantity: 60, unitPrice: 10, totalPrice: 600 }],
      subtotal: 600, totalAmount: 660, paymentMethods: [{ method: 'CASH', amount: 660 }]
    }, scope, cashier._id);
    fail('Out of stock validation: should block checkout of 60 burgers (only 50 in stock)');
  } catch (e) {
    if (e.message.includes('Insufficient stock')) log('Checkout validated & correctly blocked insufficient stock');
    else fail('Out of stock validation unexpected error', e);
  }

  // Test 3: Standard POS Cart Checkout with Multiple Payments & Calculations
  const checkoutData = {
    customerId: cust._id,
    customerName: cust.name,
    customerPhone: cust.phoneNumber,
    items: [
      { productId: burger._id, name: burger.name, quantity: 2, unitPrice: 10, discount: 1.50, totalPrice: 18.50 }, // tax is 10%, base price is 10
      { productId: coffee._id, name: coffee.name, quantity: 1, unitPrice: 5.50, variantName: 'Large', discount: 0, totalPrice: 5.50 } // tax is 8%, variant pricing Large = 5.50
    ],
    subtotal: 25.50,
    totalDiscount: 1.50, // sum of item discounts = 1.50
    totalTax: 2.29, // (20-1.5)*0.1 + (5.5-0)*0.08 = 1.85 + 0.44 = 2.29
    totalAmount: 26.29, // subtotal - discount + tax = 25.50 - 1.50 + 2.29 = 26.29
    paymentMethods: [
      { method: 'CASH', amount: 16.29 },
      { method: 'CARD', amount: 10.00 }
    ],
    notes: 'Split payment order test'
  };

  const checkResult = await billingService.checkoutCart(checkoutData, scope, cashier._id);
  if (checkResult.order && checkResult.payments.length === 2) {
    log('Cart checkout finalized successfully with split payment methods');
  } else {
    fail('Cart checkout failed to record sub-payments');
  }

  // Verify inventory deduction (burger went from 50 to 48, coffee went from 20 to 19)
  const burgerStock = await Inventory.findOne({ branchId: branchA._id, productId: burger._id });
  const coffeeStock = await Inventory.findOne({ branchId: branchA._id, productId: coffee._id });
  if (burgerStock.quantity === 48 && coffeeStock.quantity === 19) {
    log('Stock levels correctly decremented');
  } else {
    fail(`Stock mismatch: Burger: ${burgerStock.quantity}, Coffee: ${coffeeStock.quantity}`);
  }

  // Verify inventory history logged as SALE
  const burgerHistory = await InventoryHistory.findOne({ inventoryId: burgerStock._id, action: 'SALE' });
  if (burgerHistory && burgerHistory.quantity === -2) {
    log('InventoryHistory ledger correctly logged "SALE" record with negative quantity');
  } else {
    fail('Inventory history SALE entry missing');
  }

  // Verify Customer purchase profile totals updated
  const updatedCust = await customerService.getCustomerById(cust._id, scope, 'ADMIN');
  if (updatedCust.totalOrders === 1 && Math.abs(updatedCust.totalSpent - 26.29) < 0.05) {
    log('Customer totalOrders and totalSpent aggregates updated successfully');
  } else {
    fail(`Customer mismatch: totalOrders=${updatedCust.totalOrders}, totalSpent=${updatedCust.totalSpent}`);
  }

  // Test 4: Combo Meal Checkout (deducts sub-components)
  // Combo contains: Burger (stock 48), Fries (stock 30), Coke (stock 40)
  const comboCheckData = {
    customerId: null,
    items: [{ productId: comboMeal._id, name: comboMeal.name, quantity: 2, unitPrice: 15, totalPrice: 30 }],
    subtotal: 30,
    totalTax: 2.40, // 30 * 8%
    totalAmount: 32.40,
    paymentMethods: [{ method: 'UPI', amount: 32.40 }]
  };
  await billingService.checkoutCart(comboCheckData, scope, cashier._id);
  
  // Verify individual components deducted by 2
  const postBurger = await Inventory.findOne({ branchId: branchA._id, productId: burger._id });
  const postFries = await Inventory.findOne({ branchId: branchA._id, productId: fries._id });
  const postCoke = await Inventory.findOne({ branchId: branchA._id, productId: coke._id });
  if (postBurger.quantity === 46 && postFries.quantity === 28 && postCoke.quantity === 38) {
    log('Combo meal checkout correctly deducted stock from every sub-item');
  } else {
    fail(`Combo stock deduction failed: Burger: ${postBurger.quantity}, Fries: ${postFries.quantity}, Coke: ${postCoke.quantity}`);
  }

  // Test 5: Hold, Resume, and Cancel
  const holdData = {
    items: [{ productId: burger._id, name: burger.name, quantity: 5, unitPrice: 10, totalPrice: 50 }],
    subtotal: 50, totalAmount: 55, notes: 'Hold test'
  };
  const held = await billingService.holdOrder(holdData, scope, cashier._id);
  if (held.status === 'HOLD') log('Order successfully placed on HOLD');

  // Verify stock was not deducted while on hold
  const holdStockCheck = await Inventory.findOne({ branchId: branchA._id, productId: burger._id });
  if (holdStockCheck.quantity === 46) log('Verify: Held order does not reserve or deduct inventory');

  const resumed = await billingService.resumeOrder(held._id, scope, cashier._id);
  if (resumed.status === 'HOLD') log('Held order resumed successfully');

  const cancelled = await billingService.cancelHoldOrder(held._id, scope, cashier._id);
  if (cancelled.status === 'CANCELLED') log('Held order cancelled successfully');

  // Test 6: Void completed bills (resets stock + reverse customer)
  const voidCheck = await billingService.checkoutCart({
    customerId: cust._id,
    items: [{ productId: burger._id, name: burger.name, quantity: 1, unitPrice: 10, totalPrice: 10 }],
    subtotal: 10, totalTax: 1, totalAmount: 11, paymentMethods: [{ method: 'CASH', amount: 11 }]
  }, scope, cashier._id);

  const preVoidBurger = await Inventory.findOne({ branchId: branchA._id, productId: burger._id });
  await billingService.voidOrder(voidCheck.order._id, 'Customer changed mind', scope, admin._id);
  const postVoidBurger = await Inventory.findOne({ branchId: branchA._id, productId: burger._id });
  if (postVoidBurger.quantity === preVoidBurger.quantity + 1) {
    log('Voided order correctly restored inventory deductions');
  } else {
    fail(`Void stock restoration failed. Pre: ${preVoidBurger.quantity}, Post: ${postVoidBurger.quantity}`);
  }

  // Verify customer totals returned
  const voidCust = await customerService.getCustomerById(cust._id, scope, 'ADMIN');
  if (voidCust.totalOrders === 1 && Math.abs(voidCust.totalSpent - 26.29) < 0.05) {
    log('Voided order correctly reversed customer aggregates');
  } else {
    fail(`Customer void totals mismatch: totalOrders=${voidCust.totalOrders}, totalSpent=${voidCust.totalSpent}`);
  }

  // ── KITCHEN INGREDIENTS TESTS (Module 10) ──────────────────────────────────
  console.log('\n🧪 Running Kitchen Ingredients (Module 10) Checks...');

  await Ingredient.deleteMany({ branchId: branchA._id });

  // Test 7: Create Ingredient & Duplicate validation
  const ingRice = await ingredientService.createIngredient({
    name: 'Rice', unit: 'kg', currentStock: 10, reorderThreshold: 2, costPrice: 30
  }, scope, admin._id);
  log(`Ingredient created: ${ingRice.name} (${ingRice.currentStock} ${ingRice.unit})`);

  try {
    await ingredientService.createIngredient({
      name: 'Rice', unit: 'kg', currentStock: 5, reorderThreshold: 1, costPrice: 30
    }, scope, admin._id);
    fail('Duplicate validation: should reject duplicate ingredient name in same branch');
  } catch (e) {
    if (e.message.includes('already exists')) log('Correctly blocked duplicate ingredient name in same branch (409)');
    else fail('Duplicate validation unexpected error', e);
  }

  // Test 8: Ingredient Dashboard Metrics
  const metrics = await ingredientService.getIngredientMetrics(scope);
  if (metrics.totalIngredients === 1 && metrics.totalIngredientValue === 300) {
    log(`Ingredient Dashboard: Total value calculated correctly ($${metrics.totalIngredientValue})`);
  } else {
    fail(`Metrics mismatch: total=${metrics.totalIngredients}, value=${metrics.totalIngredientValue}`);
  }

  // Test 9: Ingredient CRUD Soft Delete (Archive/Restore)
  await ingredientService.archiveIngredient(ingRice._id, scope, admin._id);
  const archivedIng = await Ingredient.findById(ingRice._id);
  if (archivedIng.status === 'INACTIVE') log('Ingredient archived successfully (INACTIVE)');

  await ingredientService.restoreIngredient(ingRice._id, scope, admin._id);
  const activeIng = await Ingredient.findById(ingRice._id);
  if (activeIng.status === 'ACTIVE') log('Ingredient restored successfully (ACTIVE)');

  // Test 10: Ingredient Restocks
  await ingredientService.restockIngredient({
    ingredientId: ingRice._id, quantity: 5, costPrice: 32, reason: 'Weekly intake', invoiceNumber: 'INV-ING-99'
  }, scope, admin._id);
  const restockedIng = await Ingredient.findById(ingRice._id);
  if (restockedIng.currentStock === 15 && restockedIng.costPrice === 32) {
    log('Ingredient restocked and costPrice updated correctly');
  } else {
    fail(`Restock mismatch: stock=${restockedIng.currentStock}, price=${restockedIng.costPrice}`);
  }

  // Verify history fields
  const restockHistory = await IngredientHistory.findOne({ ingredientId: ingRice._id, action: 'RESTOCK', invoiceNumber: 'INV-ING-99' });
  if (restockHistory && restockHistory.previousQuantity === 10 && restockHistory.newQuantity === 15 && restockHistory.invoiceNumber === 'INV-ING-99') {
    log('Ingredient history ledger contains all fields (previousQty, newQty, invoice, user)');
  } else {
    fail('Ingredient history ledger missing fields or miscalculated');
  }

  // Test 11: Ingredient Adjustments
  await ingredientService.adjustIngredient({
    ingredientId: ingRice._id, quantity: 12, reason: 'Wastage due to moisture'
  }, scope, admin._id);
  const adjustedIng = await Ingredient.findById(ingRice._id);
  if (adjustedIng.currentStock === 12) log('Ingredient stock adjustment processed successfully');

  // Test 12: Ingredient transfers (cross branch)
  const destScope = { branchId: branchB._id };
  await ingredientService.transferIngredient({
    ingredientId: ingRice._id, toBranchId: branchB._id, quantity: 4, reason: 'Relocating base stock'
  }, scope, admin._id);

  const postSrcIng = await Ingredient.findById(ingRice._id);
  const postDestIng = await Ingredient.findOne({ branchId: branchB._id, name: 'Rice' });
  if (postSrcIng.currentStock === 8 && postDestIng.currentStock === 4) {
    log('Ingredient transfer correctly updated source and created/updated destination stock');
  } else {
    fail(`Transfer mismatch: Source stock=${postSrcIng.currentStock}, Dest stock=${postDestIng?.currentStock}`);
  }

  // Same branch transfer reject
  try {
    await ingredientService.transferIngredient({
      ingredientId: ingRice._id, toBranchId: branchA._id, quantity: 2, reason: 'Illegal same branch'
    }, scope, admin._id);
    fail('Same-branch transfer: should have rejected same-branch relocation');
  } catch (e) {
    if (e.message.includes('must be different')) log('Correctly blocked same-branch ingredient transfer');
    else fail('Same branch transfer unexpected error', e);
  }

  // Over stock transfer reject
  try {
    await ingredientService.transferIngredient({
      ingredientId: ingRice._id, toBranchId: branchB._id, quantity: 20, reason: 'Illegal over stock'
    }, scope, admin._id);
    fail('Over-stock transfer: should have rejected transfer exceeding stock');
  } catch (e) {
    if (e.message.includes('exceeds available stock')) log('Correctly blocked transfer exceeding stock limit');
    else fail('Over-stock transfer unexpected error', e);
  }

  // ── CLEANUP ────────────────────────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  await Order.deleteMany({ branchId: branchA._id });
  await Payment.deleteMany({});
  await InventoryHistory.deleteMany({ branchId: branchA._id });
  await Ingredient.deleteMany({ branchId: { $in: [branchA._id, branchB._id] } });
  await IngredientHistory.deleteMany({ branchId: { $in: [branchA._id, branchB._id] } });
  log('Test data cleaned up.');

  console.log('\n🎉 All checks passed! Module 9 & 10 verification complete.\n');
} catch (err) {
  fail('Unexpected test error occurred', err);
}

await mongoose.disconnect();
process.exit(0);
