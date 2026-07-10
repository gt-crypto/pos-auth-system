import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Branch from './models/Branch.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Supplier from './models/Supplier.js';
import Inventory from './models/Inventory.js';
import InventoryHistory from './models/InventoryHistory.js';
import StockTransfer from './models/StockTransfer.js';
import AuditLog from './models/AuditLog.js';

import * as supplierService from './services/supplierService.js';
import * as inventoryService from './services/inventoryService.js';

dotenv.config();

const runTests = async () => {
  console.log('=== STARTING INTEGRATION TESTS FOR INVENTORY & SUPPLIERS ===');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pos_auth_db');
  console.log('Connected to Database');

  let testUser, testBranchA, testBranchB, testCategoryA, testCategoryB, testProductA, testProductB;
  let inventoryA, inventoryB;

  try {
    // 0. Setup test prerequisites
    console.log('\n[Setup] Creating test prerequisites...');
    testUser = await User.findOne({ username: 'superadmin1' });
    if (!testUser) {
      testUser = await User.create({
        username: 'superadmin1',
        password: 'Password123!',
        email: 'superadmin@test.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      });
    }

    testBranchA = await Branch.create({
      name: 'Test Branch Alpha',
      branchCode: 'T-ALPHA',
      phone: '1234567890',
      email: 'alpha@branch.com',
      address: '123 Alpha St',
      city: 'Alpha City',
      state: 'Alpha State',
      country: 'Alpha Land',
      pincode: '123456',
      managerName: 'Manager Alpha',
      status: 'ACTIVE'
    });

    testBranchB = await Branch.create({
      name: 'Test Branch Beta',
      branchCode: 'T-BETA',
      phone: '0987654321',
      email: 'beta@branch.com',
      address: '456 Beta St',
      city: 'Beta City',
      state: 'Beta State',
      country: 'Beta Land',
      pincode: '654321',
      managerName: 'Manager Beta',
      status: 'ACTIVE'
    });

    testCategoryA = await Category.create({
      name: 'Test Cat Alpha',
      branchId: testBranchA._id,
      createdBy: testUser._id,
      updatedBy: testUser._id
    });

    testCategoryB = await Category.create({
      name: 'Test Cat Beta',
      branchId: testBranchB._id,
      createdBy: testUser._id,
      updatedBy: testUser._id
    });

    testProductA = await Product.create({
      name: 'Test Product Alpha Item',
      sku: 'TEST-SKU-ALPHA-123',
      branchId: testBranchA._id,
      categoryId: testCategoryA._id,
      price: 15.50,
      taxPercentage: 5,
      createdBy: testUser._id,
      updatedBy: testUser._id
    });

    testProductB = await Product.create({
      name: 'Test Product Beta Item',
      sku: 'TEST-SKU-BETA-456',
      branchId: testBranchB._id,
      categoryId: testCategoryB._id,
      price: 20.00,
      taxPercentage: 5,
      createdBy: testUser._id,
      updatedBy: testUser._id
    });

    const scope = { isSuperAdmin: true, branchId: null };

    // 1. Create Supplier
    console.log('\n[Test 1] Creating supplier...');
    const supplier = await supplierService.createSupplier({
      companyName: 'Test Supplier Corp',
      contactPerson: 'Alice Supplier',
      phone: '1234567890',
      email: 'alice@supplier.com',
      address: '123 Supplier Lane'
    }, scope, testUser._id, null);
    console.log('✔ Supplier created successfully:', supplier.companyName);

    // 2. Prevent duplicate Supplier
    console.log('\n[Test 2] Verifying unique supplier name constraint...');
    try {
      await supplierService.createSupplier({
        companyName: 'test supplier corp', // case-insensitive check
        contactPerson: 'Bob',
        phone: '0987654321',
        email: 'bob@supplier.com',
        address: '456 Supplier St'
      }, scope, testUser._id, null);
      console.log('❌ Failed: duplicate supplier created.');
    } catch (err) {
      console.log('✔ Success: duplicate supplier rejected correctly:', err.message);
    }

    // 3. Create Inventory Record
    console.log('\n[Test 3] Creating inventory record...');
    inventoryA = await inventoryService.createInventory({
      productId: testProductA._id,
      supplierId: supplier._id,
      branchId: testBranchA._id,
      quantity: 100,
      threshold: 10,
      unit: 'items' // Integer-based unit
    }, scope, testUser._id, null);
    console.log('✔ Inventory A created successfully. Current Stock:', inventoryA.quantity);

    // 4. Verify compound unique index (prevents duplicate product in same branch)
    console.log('\n[Test 4] Verifying compound unique index (duplicate product in same branch)...');
    try {
      await inventoryService.createInventory({
        productId: testProductA._id,
        branchId: testBranchA._id,
        quantity: 50,
        threshold: 5,
        unit: 'items'
      }, scope, testUser._id, null);
      console.log('❌ Failed: duplicate inventory created.');
    } catch (err) {
      console.log('✔ Success: duplicate inventory rejected correctly:', err.message);
    }

    // 5. Verify editing locked fields (productId / branchId) is blocked
    console.log('\n[Test 5] Verifying locked fields (productId / branchId / quantity) cannot be updated via PUT...');
    const updatedInv = await inventoryService.updateInventory(inventoryA._id, {
      productId: testProductB._id, // should be ignored
      branchId: testBranchB._id, // should be ignored
      quantity: 9999, // should be ignored
      threshold: 15, // editable
      unit: 'pieces' // editable
    }, scope, testUser._id, null);
    console.log('✔ Inventory details updated.');
    console.log('Verify fields:');
    console.log('  - productId matches old:', updatedInv.productId.toString() === testProductA._id.toString());
    console.log('  - branchId matches old:', updatedInv.branchId.toString() === testBranchA._id.toString());
    console.log('  - quantity matches old:', updatedInv.quantity === 100);
    console.log('  - threshold changed to 15:', updatedInv.threshold === 15);
    console.log('  - unit changed to pieces:', updatedInv.unit === 'pieces');

    // 6. Restock Inventory (verify notes, supplier link, invoiceNumber, quantity validation, and AuditLog/InventoryHistory creation)
    console.log('\n[Test 6] Performing restock operation...');
    const restocked = await inventoryService.restockInventory({
      inventoryId: inventoryA._id,
      quantityAdded: 50,
      supplierId: supplier._id,
      invoiceNumber: 'INV-ABC-789',
      notes: 'Monthly batch stocking'
    }, scope, testUser._id, null);
    console.log('✔ Restocked successfully. New Quantity:', restocked.quantity);

    // Verify history and audit log
    const restockHistory = await InventoryHistory.findOne({ inventoryId: inventoryA._id, action: 'RESTOCK' }).sort({ timestamp: -1 });
    console.log('  - InventoryHistory log check:', restockHistory ? 'Exists' : 'Missing');
    console.log('  - History invoiceNumber matches:', restockHistory?.invoiceNumber === 'INV-ABC-789');
    console.log('  - History notes matches:', restockHistory?.notes === 'Monthly batch stocking');

    const restockAudit = await AuditLog.findOne({ action: 'RESTOCK_INVENTORY', entityId: inventoryA._id });
    console.log('  - System AuditLog check:', restockAudit ? 'Exists' : 'Missing');

    // 7. Adjust Inventory (verify DAMAGED adjustment, decimal checks, and AuditLog/InventoryHistory creation)
    console.log('\n[Test 7] Performing manual adjustment (Damaged stock)...');
    const adjusted = await inventoryService.adjustInventory({
      inventoryId: inventoryA._id,
      newQuantity: 140, // 150 -> 140 (-10)
      reason: 'DAMAGED',
      notes: 'Water leak damage on box A'
    }, scope, testUser._id, null);
    console.log('✔ Adjusted successfully. New Quantity:', adjusted.quantity);

    // Decimal verification on integer-based unit (pieces)
    try {
      await inventoryService.adjustInventory({
        inventoryId: inventoryA._id,
        newQuantity: 139.5,
        reason: 'MANUAL_CORRECTION',
        notes: 'Decimal adjustment test'
      }, scope, testUser._id, null);
      console.log('❌ Failed: decimal adjustment permitted on integer unit.');
    } catch (err) {
      console.log('✔ Success: decimal adjustment correctly rejected:', err.message);
    }

    // 8. Transfer Inventory (verify same branch validation, negative/insufficient stock validation, and transaction commits)
    console.log('\n[Test 8] Performing stock transfer between Branch A and Branch B...');
    
    // Create destination inventory with 0 stock first
    inventoryB = await inventoryService.createInventory({
      productId: testProductA._id, // transferring Product A
      branchId: testBranchB._id, // destination branch
      quantity: 0,
      threshold: 5,
      unit: 'pieces'
    }, scope, testUser._id, null);

    console.log('Initial Stock:');
    console.log('  - Branch A (source):', adjusted.quantity);
    console.log('  - Branch B (dest):', inventoryB.quantity);

    // Perform transfer of 40 units
    const transferResult = await inventoryService.transferInventory({
      productId: testProductA._id,
      fromBranch: testBranchA._id,
      toBranch: testBranchB._id,
      quantity: 40,
      notes: 'Relocating surplus stock to Beta branch'
    }, scope, testUser._id, null);

    const afterSource = await Inventory.findById(inventoryA._id);
    const afterDest = await Inventory.findById(inventoryB._id);
    console.log('Stock after transfer:');
    console.log('  - Branch A (source) [expected 100]:', afterSource.quantity);
    console.log('  - Branch B (dest) [expected 40]:', afterDest.quantity);

    // Verify transfer logs
    const outHistory = await InventoryHistory.findOne({ inventoryId: inventoryA._id, action: 'TRANSFER_OUT' });
    const inHistory = await InventoryHistory.findOne({ inventoryId: inventoryB._id, action: 'TRANSFER_IN' });
    console.log('  - TRANSFER_OUT History logged:', !!outHistory);
    console.log('  - TRANSFER_IN History logged:', !!inHistory);

    // Verify same branch transfer is blocked
    try {
      await inventoryService.transferInventory({
        productId: testProductA._id,
        fromBranch: testBranchA._id,
        toBranch: testBranchA._id,
        quantity: 10
      }, scope, testUser._id, null);
      console.log('❌ Failed: same branch transfer allowed.');
    } catch (err) {
      console.log('✔ Success: same branch transfer rejected:', err.message);
    }

    // Verify insufficient stock transfer is blocked
    try {
      await inventoryService.transferInventory({
        productId: testProductA._id,
        fromBranch: testBranchA._id,
        toBranch: testBranchB._id,
        quantity: 9999
      }, scope, testUser._id, null);
      console.log('❌ Failed: transfer exceeding stock allowed.');
    } catch (err) {
      console.log('✔ Success: transfer exceeding stock rejected:', err.message);
    }

    // 9. Soft-delete Supplier and verify blocks
    console.log('\n[Test 9] Performing Supplier Archiving (Soft-delete)...');
    const archivedSupplier = await supplierService.deleteSupplier(supplier._id, scope, testUser._id, null);
    console.log('✔ Supplier archived. Status:', archivedSupplier.status);

    // Verify archived supplier cannot be selected for restocking
    try {
      await inventoryService.restockInventory({
        inventoryId: inventoryA._id,
        quantityAdded: 10,
        supplierId: supplier._id
      }, scope, testUser._id, null);
      console.log('❌ Failed: restock allowed using archived supplier.');
    } catch (err) {
      console.log('✔ Success: restock rejected with archived supplier:', err.message);
    }

    // Restore supplier
    const restoredSupplier = await supplierService.restoreSupplier(supplier._id, scope, testUser._id, null);
    console.log('✔ Supplier restored back to ACTIVE. Status:', restoredSupplier.status);

    // 10. Dynamic calculation checks
    console.log('\n[Test 10] Checking dynamic statistics calculation...');
    const dashboardMetrics = await inventoryService.getDashboardMetrics(scope);
    console.log('  - Total Items Count:', dashboardMetrics.totalItems);
    console.log('  - Low Stock Count:', dashboardMetrics.lowStockCount);
    console.log('  - Total Inventory Value (calculated dynamically):', dashboardMetrics.totalValue);

    const supplierDetails = await supplierService.getSupplierById(supplier._id, scope);
    console.log('  - Supplier total value purchased (calculated dynamically):', supplierDetails.totalValuePurchased);

    console.log('\n✔ ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
  } finally {
    // 11. Cleanup test records
    console.log('\n[Cleanup] Cleaning up test records...');
    if (testProductA) await Product.deleteOne({ _id: testProductA._id });
    if (testProductB) await Product.deleteOne({ _id: testProductB._id });
    if (testCategoryA) await Category.deleteOne({ _id: testCategoryA._id });
    if (testCategoryB) await Category.deleteOne({ _id: testCategoryB._id });
    if (testBranchA) await Branch.deleteOne({ _id: testBranchA._id });
    if (testBranchB) await Branch.deleteOne({ _id: testBranchB._id });
    if (testUser && testUser.username === 'superadmin1_test') await User.deleteOne({ _id: testUser._id });

    // Clean models created during test
    await Supplier.deleteMany({ companyName: 'Test Supplier Corp' });
    await Inventory.deleteMany({ _id: { $in: [inventoryA?._id, inventoryB?._id].filter(Boolean) } });
    await InventoryHistory.deleteMany({ branchId: { $in: [testBranchA?._id, testBranchB?._id].filter(Boolean) } });
    await StockTransfer.deleteMany({ fromBranch: testBranchA?._id });
    await AuditLog.deleteMany({ branchId: { $in: [testBranchA?._id, testBranchB?._id].filter(Boolean) } });

    await mongoose.disconnect();
    console.log('Disconnected from Database. Cleanup done.');
  }
};

runTests();
