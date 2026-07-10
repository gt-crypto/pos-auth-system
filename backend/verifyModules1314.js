import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Branch from './models/Branch.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Inventory from './models/Inventory.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';
import * as customerService from './services/customerService.js';
import * as reportService from './services/reportService.js';

dotenv.config();

const log = (msg, ok = true) => console.log(`${ok ? '✔' : '      ✔'}`);
const fail = (msg, err) => { console.error(`✘ ${msg}:`, err?.message || err); process.exit(1); };

async function run() {
  if (!process.env.MONGO_URI) {
    fail('MONGO_URI env variable is missing');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🧪 Running integration tests for Module 13 (Customer Management) & Module 14 (Reporting Dashboard)...\n');

  // Clear collections for test isolation
  await Customer.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({});
  await Inventory.deleteMany({});

  // 1. Seed Branches
  const branchAlpha = await Branch.findOne({ branchCode: 'B-ALPH' }) || await Branch.create({
    name: 'Branch Alpha', branchCode: 'B-ALPH', phone: '+1234567890', email: 'alpha@branch.com', status: 'ACTIVE'
  });
  const branchBeta = await Branch.findOne({ branchCode: 'B-BETA' }) || await Branch.create({
    name: 'Branch Beta', branchCode: 'B-BETA', phone: '+1234567891', email: 'beta@branch.com', status: 'ACTIVE'
  });

  // 2. Seed Users
  const superAdmin = await User.findOne({ username: 'superadmin' }) || await User.create({
    username: 'superadmin', password: 'Password@123', email: 'super@admin.com', name: 'Super Admin', role: 'SUPER_ADMIN', status: 'ACTIVE'
  });
  const adminAlpha = await User.findOne({ username: 'admin_alpha' }) || await User.create({
    username: 'admin_alpha', password: 'Password@123', email: 'admin_alpha@branch.com', name: 'Admin Alpha', role: 'ADMIN', status: 'ACTIVE', branchId: branchAlpha._id
  });
  const cashierAlpha = await User.findOne({ username: 'cashier_alpha' }) || await User.create({
    username: 'cashier_alpha', password: 'Password@123', email: 'cashier_alpha@branch.com', name: 'Cashier Alpha', role: 'CASHIER', status: 'ACTIVE', branchId: branchAlpha._id
  });

  const scopeSuper = { isSuperAdmin: true };
  const scopeAlpha = { isSuperAdmin: false, branchId: branchAlpha._id };
  const scopeBeta = { isSuperAdmin: false, branchId: branchBeta._id };

  // =========================================================================
  // MODULE 13: CUSTOMER MANAGEMENT TESTS
  // =========================================================================

  // A. Create Customer
  const c1 = await customerService.createCustomer({
    name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    notes: 'Regular customer'
  }, cashierAlpha, scopeAlpha);
  console.log('✔ Customer created successfully');

  // B. Unique phone check within branch
  try {
    await customerService.createCustomer({
      name: 'John Copy',
      phone: '9876543210'
    }, cashierAlpha, scopeAlpha);
    fail('FAIL: Duplicate phone creation succeeded in the same branch!');
  } catch (err) {
    console.log('✔ Duplicate phone number within branch rejected successfully');
  }

  // C. Same phone number in DIFFERENT branch works
  const c2 = await customerService.createCustomer({
    name: 'John Beta',
    phone: '9876543210',
    email: 'john.beta@example.com'
  }, superAdmin, scopeBeta);
  console.log('✔ Phone number reuse allowed in a different branch');

  // D. Customer details
  const details = await customerService.getCustomerById(c1._id, scopeAlpha, 'CASHIER');
  if (details.name === 'John Doe' && details.phoneNumber === '9876543210') {
    console.log('✔ Get customer profile by ID returns complete details');
  } else {
    fail('FAIL: Customer profile mismatch');
  }

  // E. Update Customer
  await customerService.updateCustomer(c1._id, { name: 'John Updated' }, cashierAlpha, scopeAlpha, 'CASHIER');
  const c1Up = await Customer.findById(c1._id);
  if (c1Up.name === 'John Updated') {
    console.log('✔ Customer updated successfully');
  } else {
    fail('FAIL: Customer update failed');
  }

  // F. Soft Delete
  await customerService.archiveCustomer(c1._id, cashierAlpha, scopeAlpha, 'CASHIER');
  const c1Del = await Customer.findById(c1._id);
  if (c1Del.isDeleted === true && c1Del.status === 'INACTIVE') {
    console.log('✔ Customer soft-delete toggles isDeleted and status flags correctly');
  } else {
    fail('FAIL: Customer soft delete flags mismatch');
  }

  // G. Exclude isDeleted from listings
  const list1 = await customerService.getCustomers({ page: 1, limit: 10 }, scopeAlpha, 'CASHIER');
  if (list1.customers.some(c => c._id.toString() === c1._id.toString())) {
    fail('FAIL: Archived customer returned in customer list!');
  } else {
    console.log('✔ Soft-deleted customers excluded from active lists');
  }

  // H. Restore Customer
  await customerService.restoreCustomer(c1._id, cashierAlpha, scopeAlpha, 'CASHIER');
  const c1Res = await Customer.findById(c1._id);
  if (c1Res.isDeleted === false && c1Res.status === 'ACTIVE') {
    console.log('✔ Customer restoration resets flags correctly');
  } else {
    fail('FAIL: Customer restoration flags mismatch');
  }

  // I. Customer Search (case-insensitive, branch-scoped)
  const searchResults = await customerService.searchCustomers('john', scopeAlpha, 'CASHIER');
  if (searchResults.some(c => c.name === 'John Updated') && !searchResults.some(c => c.name === 'John Beta')) {
    console.log('✔ Search filters are case-insensitive and strictly branch-scoped');
  } else {
    fail('FAIL: Search results scoping violation');
  }

  // =========================================================================
  // MODULE 14: REPORTING & BILLING INTEGRATION TESTS
  // =========================================================================

  // Seed Products and Inventories
  const cat = await Category.findOne({ name: 'Food' }) || await Category.create({
    name: 'Food',
    description: 'Edibles',
    branchId: branchAlpha._id,
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });
  const p1 = await Product.create({
    name: 'Cappuccino',
    sku: 'CAP-01',
    price: 10,
    categoryId: cat._id,
    status: 'ACTIVE',
    branchId: branchAlpha._id,
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });
  const p2 = await Product.create({
    name: 'Croissant',
    sku: 'CRO-01',
    price: 5,
    categoryId: cat._id,
    status: 'ACTIVE',
    branchId: branchAlpha._id,
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });

  const inv1 = await Inventory.create({
    productId: p1._id,
    branchId: branchAlpha._id,
    quantity: 15,
    threshold: 5,
    unit: 'Piece',
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });
  const inv2 = await Inventory.create({
    productId: p2._id,
    branchId: branchAlpha._id,
    quantity: 2,
    threshold: 3,
    unit: 'Piece',
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });

  // J. Walk-in Customer checkout (no customerId)
  const orderWalkin = await customerService.createOrder({
    customerName: 'Walk-in Customer',
    items: [
      { productId: p1._id, name: 'Cappuccino', quantity: 1, unitPrice: 10, totalPrice: 10 }
    ],
    subtotal: 10,
    totalAmount: 10,
    paymentMethod: 'CARD',
    branchId: branchAlpha._id
  }, cashierAlpha, scopeAlpha);
  console.log('✔ Walk-in checkout completes successfully without customer association');

  // K. Checkout with customer updates history
  const orderCust = await customerService.createOrder({
    customerId: c1._id,
    customerName: 'John Updated',
    customerPhone: '9876543210',
    items: [
      { productId: p1._id, name: 'Cappuccino', quantity: 2, unitPrice: 10, totalPrice: 20 },
      { productId: p2._id, name: 'Croissant', quantity: 1, unitPrice: 5, totalPrice: 5 }
    ],
    subtotal: 25,
    totalAmount: 25,
    paymentMethod: 'UPI',
    branchId: branchAlpha._id
  }, cashierAlpha, scopeAlpha);

  const historyResult = await customerService.getCustomerHistory(c1._id, { page: 1, limit: 10 }, scopeAlpha, 'CASHIER');
  if (historyResult.orders.some(o => o._id.toString() === orderCust._id.toString())) {
    console.log('✔ Order checkout automatically updates customer purchase history');
  } else {
    fail('FAIL: Purchase history not updated');
  }

  // L. Reports Dashboard Metrics
  const metrics = await reportService.getDashboardMetrics({ period: 'today' }, scopeAlpha, 'ADMIN');
  if (metrics.totalOrders === 2 && metrics.totalRevenue === 35 && metrics.avgOrderValue === 17.5) {
    console.log('✔ Dashboard metrics calculated correctly (Sales, Orders, AOV)');
  } else {
    fail('FAIL: Dashboard metrics calculations mismatch');
  }

  if (metrics.topProduct?.name === 'Cappuccino') {
    console.log('✔ Top selling products report identifies top item correctly');
  } else {
    fail('FAIL: Top selling product incorrect');
  }

  // M. Reports Low Stock list
  const lowStockReport = await reportService.getLowStockReport({}, scopeAlpha, 'ADMIN');
  if (lowStockReport.length === 1 && lowStockReport[0].productName === 'Croissant') {
    console.log('✔ Low Stock Report identifies low-stock inventories correctly');
  } else {
    fail('FAIL: Low stock report list incorrect');
  }

  // N. Payment Method Breakdown
  const paymentReport = await reportService.getPaymentReport({ period: 'today' }, scopeAlpha, 'ADMIN');
  const cardMethod = paymentReport.breakdown.find(p => p.method === 'CARD');
  const upiMethod = paymentReport.breakdown.find(p => p.method === 'UPI');
  if (cardMethod?.revenue === 10 && upiMethod?.revenue === 25) {
    console.log('✔ Sales by payment method report groups transactions correctly');
  } else {
    fail('FAIL: Payment method grouping incorrect');
  }

  // O. Cashier Performance
  const cashierReport = await reportService.getCashierReport({ period: 'today' }, scopeAlpha, 'ADMIN');
  if (cashierReport.cashiers.some(c => c.name === cashierAlpha.username && c.orders === 2)) {
    console.log('✔ Cashier performance report aggregates sales correctly');
  } else {
    fail('FAIL: Cashier report aggregates incorrect');
  }

  // P. Branch Scoping and RBAC enforcement
  const betaMetrics = await reportService.getDashboardMetrics({ period: 'today' }, scopeBeta, 'ADMIN');
  if (betaMetrics.totalOrders === 0 && betaMetrics.totalRevenue === 0) {
    console.log('✔ Report branch isolation enforces strict scoping (Admin cannot view Beta data)');
  } else {
    fail('FAIL: Report branch scoping leak');
  }

  console.log('\n🧹 Cleaning up test data...');
  await Customer.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({});
  await Inventory.deleteMany({});

  console.log('✔ Verification checks completed successfully!\n');
  process.exit(0);
}

run().catch(err => fail('Unhandled execution failure', err));
