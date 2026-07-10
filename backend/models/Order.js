import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  variantName: { type: String, default: '' } // Variant identifier e.g. "Large", "Medium"
}, { _id: false });

const orderPaymentMethodSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  referenceNumber: {
    type: String,
    default: ''
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
    index: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: {
    type: String,
    default: ''
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'OTHER'],
    default: 'CASH'
  },
  paymentMethods: [orderPaymentMethodSchema],
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PENDING', 'REFUNDED'],
    default: 'PENDING'
  },
  status: {
    type: String,
    enum: ['HOLD', 'COMPLETED', 'CANCELLED', 'VOID', 'REFUNDED'],
    default: 'COMPLETED',
    index: true
  },
  notes: { type: String, default: '' },
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  parentOrderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true // For split bills sharing a common order reference
  }
}, {
  timestamps: true
});

// Compound indexes for reporting aggregations and quick queries
orderSchema.index({ branchId: 1, orderDate: -1 });
orderSchema.index({ cashierId: 1, orderDate: -1 });
orderSchema.index({ customerId: 1, orderDate: -1 });
orderSchema.index({ orderDate: -1, status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
