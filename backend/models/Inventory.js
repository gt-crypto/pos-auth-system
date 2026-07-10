import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  threshold: {
    type: Number,
    required: [true, 'Reorder threshold level is required'],
    min: [0, 'Threshold level cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Unit specification (e.g. kg, units) is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Enforce unique configuration constraint: a product can only have one inventory config per branch.
inventorySchema.index({ branchId: 1, productId: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
