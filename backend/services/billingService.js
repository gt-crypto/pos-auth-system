import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import InventoryHistory from '../models/InventoryHistory.js';
import Customer from '../models/Customer.js';
import { logAudit } from '../utils/auditLogger.js';
import logger from '../config/logger.js';

const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
};

// Deduct inventory for product. Handles combo extraction and individual deduction.
const deductInventoryStock = async (branchId, productId, quantity, variantName, actorId, session = null) => {
  const product = await Product.findById(productId).session(session);
  if (!product) throwError(`Product with ID ${productId} not found`, 404);
  if (product.status !== 'ACTIVE' || !product.isAvailable) {
    throwError(`Product "${product.name}" is not active or available for sale`, 400);
  }

  if (product.isCombo) {
    // Deduct stock for each sub-product in the combo
    if (!product.comboItems || product.comboItems.length === 0) {
      throwError(`Combo meal "${product.name}" has no items configured`, 400);
    }
    const deductions = [];
    for (const itemRefId of product.comboItems) {
      const subItem = await deductInventoryStock(branchId, itemRefId, quantity, '', actorId, session);
      deductions.push(subItem);
    }
    return deductions;
  }

  // Normal product or product with variant
  const inventory = await Inventory.findOne({ branchId, productId }).session(session);
  if (!inventory) {
    throwError(`Inventory configuration not found for product "${product.name}" in this branch`, 404);
  }

  if (inventory.quantity < quantity) {
    throwError(`Insufficient stock for product "${product.name}". Required: ${quantity}, Available: ${inventory.quantity}`, 400);
  }

  const previousQuantity = inventory.quantity;
  inventory.quantity -= quantity;
  inventory.updatedBy = actorId;
  await inventory.save({ session });

  // Log inventory history (SALE)
  const history = await InventoryHistory.create([{
    inventoryId: inventory._id,
    productId: inventory.productId,
    action: 'SALE',
    quantity: -quantity,
    previousQuantity,
    newQuantity: inventory.quantity,
    notes: `POS Sale: ${product.name}${variantName ? ` (${variantName})` : ''}`,
    userId: actorId,
    branchId
  }], { session });

  return {
    inventoryId: inventory._id,
    productId: inventory.productId,
    quantityDeducted: quantity,
    previousQuantity,
    newQuantity: inventory.quantity
  };
};

// Revert inventory deduction on Void/Refund/Rollback
const restoreInventoryStock = async (branchId, productId, quantity, variantName, actorId, session = null) => {
  const product = await Product.findById(productId).session(session);
  if (!product) return;

  if (product.isCombo) {
    for (const itemRefId of product.comboItems) {
      await restoreInventoryStock(branchId, itemRefId, quantity, '', actorId, session);
    }
    return;
  }

  const inventory = await Inventory.findOne({ branchId, productId }).session(session);
  if (!inventory) return;

  const previousQuantity = inventory.quantity;
  inventory.quantity += quantity;
  inventory.updatedBy = actorId;
  await inventory.save({ session });

  // Log inventory history (RESTOCK due to void/refund)
  await InventoryHistory.create([{
    inventoryId: inventory._id,
    productId: inventory.productId,
    action: 'RESTOCK',
    quantity,
    previousQuantity,
    newQuantity: inventory.quantity,
    notes: `Reverted Sale: ${product.name}${variantName ? ` (${variantName})` : ''}`,
    userId: actorId,
    branchId
  }], { session });
};

// ---------- Billing Core Services ----------

export const checkoutCart = async (checkoutData, scope, actorId, req) => {
  const branchId = scope.branchId || checkoutData.branchId;
  if (!branchId) throwError('Branch context is required for checkout', 400);

  const orderNumber = generateOrderNumber();

  // Dynamic calculation checks (tax, discount, subtotal, grandTotal)
  let calculatedSubtotal = 0;
  let calculatedTax = 0;
  let calculatedDiscount = 0;

  for (const item of checkoutData.items) {
    const product = await Product.findById(item.productId);
    if (!product) throwError(`Product ${item.name} not found`, 404);
    if (product.status !== 'ACTIVE') throwError(`Product "${product.name}" is inactive and cannot be sold`, 400);

    // Variant verification
    let itemPrice = product.price;
    if (item.variantName) {
      const variant = product.variants.find(v => v.name === item.variantName);
      if (!variant) throwError(`Variant "${item.variantName}" not found on product "${product.name}"`, 404);
      itemPrice = variant.price;
    }

    const itemSubtotal = itemPrice * item.quantity;
    const itemDiscount = item.discount || 0;
    const itemTax = (itemSubtotal - itemDiscount) * (product.taxPercentage / 100);

    calculatedSubtotal += itemSubtotal;
    calculatedDiscount += itemDiscount;
    calculatedTax += itemTax;

    if (Math.abs(item.unitPrice - itemPrice) > 0.05) {
      throwError(`Price mismatch for product "${product.name}". Expected: ${itemPrice}, Got: ${item.unitPrice}`, 400);
    }
  }

  const calculatedTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;

  if (Math.abs(checkoutData.totalAmount - calculatedTotal) > 0.05) {
    throwError(`Grand total calculations mismatch. Calculated: ${calculatedTotal.toFixed(2)}, Received: ${checkoutData.totalAmount.toFixed(2)}`, 400);
  }

  // Database atomic process via transaction
  let order;
  let payments = [];
  const prevStocks = []; // To manual rollback if standalone MongoDB node is used

  try {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Create Order
      const [newOrder] = await Order.create([{
        orderNumber,
        customerId: checkoutData.customerId || null,
        customerName: checkoutData.customerName || 'Walk-in Customer',
        customerPhone: checkoutData.customerPhone || '',
        branchId,
        cashierId: actorId,
        items: checkoutData.items,
        subtotal: checkoutData.subtotal,
        totalDiscount: checkoutData.totalDiscount || 0,
        totalTax: checkoutData.totalTax || 0,
        totalAmount: checkoutData.totalAmount,
        paymentMethods: checkoutData.paymentMethods,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        notes: checkoutData.notes || '',
        orderDate: new Date()
      }], { session });

      order = newOrder;

      // Create Payments
      for (const p of checkoutData.paymentMethods) {
        const [payment] = await Payment.create([{
          orderId: order._id,
          paymentMethod: p.method,
          amount: p.amount,
          referenceNumber: p.referenceNumber || '',
          timestamp: new Date()
        }], { session });
        payments.push(payment);
      }

      // Deduct Inventory Stock
      for (const item of checkoutData.items) {
        await deductInventoryStock(branchId, item.productId, item.quantity, item.variantName, actorId, session);
      }

      // Update Customer purchase history
      if (checkoutData.customerId) {
        await Customer.findByIdAndUpdate(checkoutData.customerId, {
          $inc: { totalOrders: 1, totalSpent: checkoutData.totalAmount },
          $set: { lastPurchase: new Date() }
        }, { session });
      }

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
      throw err;
    }

    // STANDALONE MONGO FALLBACK (MANUAL ROLLBACK INTEGRITY)
    try {
      // Create Order
      order = await Order.create({
        orderNumber,
        customerId: checkoutData.customerId || null,
        customerName: checkoutData.customerName || 'Walk-in Customer',
        customerPhone: checkoutData.customerPhone || '',
        branchId,
        cashierId: actorId,
        items: checkoutData.items,
        subtotal: checkoutData.subtotal,
        totalDiscount: checkoutData.totalDiscount || 0,
        totalTax: checkoutData.totalTax || 0,
        totalAmount: checkoutData.totalAmount,
        paymentMethods: checkoutData.paymentMethods,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        notes: checkoutData.notes || '',
        orderDate: new Date()
      });

      // Create Payments
      for (const p of checkoutData.paymentMethods) {
        const payment = await Payment.create({
          orderId: order._id,
          paymentMethod: p.method,
          amount: p.amount,
          referenceNumber: p.referenceNumber || '',
          timestamp: new Date()
        });
        payments.push(payment);
      }

      // Deduct stock + record previous values for manual rollback if subsequent ones fail
      for (const item of checkoutData.items) {
        const deduction = await deductInventoryStock(branchId, item.productId, item.quantity, item.variantName, actorId);
        prevStocks.push({ productId: item.productId, quantity: item.quantity, variantName: item.variantName });
      }

      // Update Customer
      if (checkoutData.customerId) {
        await Customer.findByIdAndUpdate(checkoutData.customerId, {
          $inc: { totalOrders: 1, totalSpent: checkoutData.totalAmount },
          $set: { lastPurchase: new Date() }
        });
      }
    } catch (manualErr) {
      // ROLLBACK MANUALLY
      try {
        if (order) await Order.deleteOne({ _id: order._id });
        if (payments.length > 0) {
          await Payment.deleteMany({ _id: { $in: payments.map(p => p._id) } });
        }
        for (const item of prevStocks) {
          await restoreInventoryStock(branchId, item.productId, item.quantity, item.variantName, actorId);
        }
        if (checkoutData.customerId && order) {
          await Customer.findByIdAndUpdate(checkoutData.customerId, {
            $inc: { totalOrders: -1, totalSpent: -checkoutData.totalAmount }
          });
        }
      } catch (rollbackErr) {
        logger.error('CRITICAL: Manual Rollback failed:', rollbackErr);
      }
      throw manualErr;
    }
  }

  // Audits
  await logAudit({ actor: actorId, action: 'CREATE_ORDER', entityType: 'Order', entityId: order._id, branchId, metadata: { orderNumber, grandTotal: order.totalAmount }, req });
  await logAudit({ actor: actorId, action: 'PAYMENT_RECEIVED', entityType: 'Order', entityId: order._id, branchId, metadata: { payments: checkoutData.paymentMethods }, req });
  await logAudit({ actor: actorId, action: 'COMPLETE_ORDER', entityType: 'Order', entityId: order._id, branchId, metadata: { orderNumber }, req });

  // Discount override logging
  if (order.totalDiscount > 0) {
    const previousTotal = order.subtotal + order.totalTax;
    const discountPercentage = +((order.totalDiscount / order.subtotal) * 100).toFixed(2);
    await logAudit({
      actor: actorId,
      action: 'DISCOUNT_OVERRIDE',
      entityType: 'Order',
      entityId: order._id,
      branchId,
      metadata: {
        orderId: order._id,
        discountPercentage,
        previousTotal,
        newTotal: order.totalAmount
      },
      req
    });
  }

  return { order, payments };
};

// ---------- Hold & Resume Order ----------

export const holdOrder = async (holdData, scope, actorId, req) => {
  const branchId = scope.branchId || holdData.branchId;
  if (!branchId) throwError('Branch context is required', 400);

  const orderNumber = generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customerId: holdData.customerId || null,
    customerName: holdData.customerName || 'Walk-in Customer',
    customerPhone: holdData.customerPhone || '',
    branchId,
    cashierId: actorId,
    items: holdData.items,
    subtotal: holdData.subtotal,
    totalDiscount: holdData.totalDiscount || 0,
    totalTax: holdData.totalTax || 0,
    totalAmount: holdData.totalAmount,
    status: 'HOLD',
    notes: holdData.notes || '',
    orderDate: new Date()
  });

  await logAudit({ actor: actorId, action: 'HOLD_ORDER', entityType: 'Order', entityId: order._id, branchId, metadata: { orderNumber }, req });
  return order;
};

export const resumeOrder = async (id, scope, actorId, req) => {
  const filter = { _id: id, status: 'HOLD' };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const order = await Order.findOne(filter);
  if (!order) throwError('Held order not found', 404);

  await logAudit({ actor: actorId, action: 'RESUME_ORDER', entityType: 'Order', entityId: order._id, branchId: order.branchId, metadata: { orderNumber: order.orderNumber }, req });
  return order;
};

export const cancelHoldOrder = async (id, scope, actorId, req) => {
  const filter = { _id: id, status: 'HOLD' };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const order = await Order.findOne(filter);
  if (!order) throwError('Held order not found', 404);

  order.status = 'CANCELLED';
  await order.save();

  await logAudit({ actor: actorId, action: 'CANCEL_ORDER', entityType: 'Order', entityId: order._id, branchId: order.branchId, metadata: { orderNumber: order.orderNumber }, req });
  return order;
};

// ---------- Split Bills ----------

export const splitOrder = async (splitData, scope, actorId, req) => {
  const { parentOrderId, splits } = splitData;
  
  const parentOrder = await Order.findById(parentOrderId);
  if (!parentOrder) throwError('Parent order not found', 404);
  if (parentOrder.status !== 'HOLD') throwError('Only held orders can be split', 400);

  const subOrders = [];
  
  // Set parent status to COMPLETED so it doesn't get processed again, but it's marked as the parent container
  parentOrder.status = 'COMPLETED';
  await parentOrder.save();

  for (const s of splits) {
    const orderNumber = generateOrderNumber();
    
    // Process checkout for this sub-bill
    const checkoutResult = await checkoutCart({
      branchId: parentOrder.branchId,
      customerId: parentOrder.customerId,
      customerName: parentOrder.customerName,
      customerPhone: parentOrder.customerPhone,
      items: s.items,
      subtotal: s.subtotal,
      totalDiscount: s.totalDiscount || 0,
      totalTax: s.totalTax || 0,
      totalAmount: s.totalAmount,
      paymentMethods: s.paymentMethods,
      notes: `Split sub-bill of ${parentOrder.orderNumber}`
    }, scope, actorId, req);

    checkoutResult.order.parentOrderRef = parentOrder._id;
    await checkoutResult.order.save();

    subOrders.push(checkoutResult);
  }

  return { parentOrder, subOrders };
};

// ---------- Void & Refund (Manager/Admin constraints) ----------

export const voidOrder = async (id, reason, scope, actorId, req) => {
  const order = await Order.findById(id);
  if (!order) throwError('Order not found', 404);
  if (order.status !== 'COMPLETED') throwError('Only completed orders can be voided', 400);

  if (!scope.isSuperAdmin && order.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Restore stock
  for (const item of order.items) {
    await restoreInventoryStock(order.branchId, item.productId, item.quantity, item.variantName, actorId);
  }

  // Reverse Customer totals
  if (order.customerId) {
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: { totalOrders: -1, totalSpent: -order.totalAmount }
    });
  }

  order.status = 'VOID';
  order.notes = `${order.notes || ''} [VOIDED: ${reason}]`;
  await order.save();

  await logAudit({ actor: actorId, action: 'VOID_ORDER', entityType: 'Order', entityId: order._id, branchId: order.branchId, metadata: { orderNumber: order.orderNumber, reason }, req });
  return order;
};

export const refundOrder = async (id, reason, scope, actorId, req) => {
  const order = await Order.findById(id);
  if (!order) throwError('Order not found', 404);
  if (order.status !== 'COMPLETED') throwError('Only completed orders can be refunded', 400);

  if (!scope.isSuperAdmin && order.branchId.toString() !== scope.branchId.toString()) {
    throwError('Access denied: branch location mismatch', 403);
  }

  // Restore stock
  for (const item of order.items) {
    await restoreInventoryStock(order.branchId, item.productId, item.quantity, item.variantName, actorId);
  }

  // Reverse Customer totals
  if (order.customerId) {
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: { totalOrders: -1, totalSpent: -order.totalAmount }
    });
  }

  order.status = 'REFUNDED';
  order.notes = `${order.notes || ''} [REFUNDED: ${reason}]`;
  await order.save();

  await logAudit({ actor: actorId, action: 'REFUND_ORDER', entityType: 'Order', entityId: order._id, branchId: order.branchId, metadata: { orderNumber: order.orderNumber, reason }, req });
  return order;
};

// ---------- History & List ----------

export const getOrdersList = async (query, scope, role) => {
  const { page = 1, limit = 15, status, customerId, orderNumber } = query;
  const filter = {};

  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (orderNumber) filter.orderNumber = { $regex: orderNumber, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('cashierId', 'username name')
      .populate('customerId', 'name phoneNumber')
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

export const getOrderById = async (id, scope) => {
  const filter = { _id: id };
  if (!scope.isSuperAdmin) filter.branchId = scope.branchId;

  const order = await Order.findOne(filter)
    .populate('cashierId', 'username name')
    .populate('customerId', 'name phoneNumber email')
    .populate('branchId', 'name branchCode');
  if (!order) throwError('Order not found', 404);

  const payments = await Payment.find({ orderId: id });
  return { order, payments };
};
