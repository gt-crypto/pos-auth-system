import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Vegetables', 'Dairy', 'Meat', 'Spices', 'Oil', 'Beverages', 'Bakery', 'Frozen', 'Other'],
    required: [true, 'Category is required']
  },
  unit: {
    type: String,
    enum: ['Kg', 'Gram', 'Liter', 'ml', 'Packet', 'Piece', 'Bottle', 'Box'],
    required: [true, 'Unit is required (e.g. Kg, Gram, Liter, ml, Packet, Piece, Bottle, Box)'],
    trim: true
  },
  
  // Stock Quantity
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  currentStock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },

  // Minimum Reorder Quantity
  minimumQuantity: {
    type: Number,
    required: true,
    min: [0, 'Minimum quantity cannot be negative'],
    default: 0
  },
  reorderThreshold: {
    type: Number,
    required: true,
    min: [0, 'Reorder threshold cannot be negative'],
    default: 0
  },

  // Cost Price
  costPerUnit: {
    type: Number,
    required: true,
    min: [0, 'Cost per unit cannot be negative'],
    default: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: [0, 'Cost price cannot be negative'],
    default: 0
  },

  // Supplier
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null,
    index: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null,
    index: true
  },

  // Branch
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
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

// Pre-validate synchronization hook
ingredientSchema.pre('validate', function(next) {
  // Sync quantities
  if (this.quantity !== undefined) this.currentStock = this.quantity;
  else if (this.currentStock !== undefined) this.quantity = this.currentStock;

  // Sync thresholds
  if (this.minimumQuantity !== undefined) this.reorderThreshold = this.minimumQuantity;
  else if (this.reorderThreshold !== undefined) this.minimumQuantity = this.reorderThreshold;

  // Sync prices
  if (this.costPerUnit !== undefined) this.costPrice = this.costPerUnit;
  else if (this.costPrice !== undefined) this.costPerUnit = this.costPrice;

  // Sync supplier
  if (this.supplier !== undefined) this.supplierId = this.supplier;
  else if (this.supplierId !== undefined) this.supplier = this.supplierId;

  // Sync branch
  if (this.branch !== undefined) this.branchId = this.branch;
  else if (this.branchId !== undefined) this.branch = this.branchId;

  next();
});

// Indexes
ingredientSchema.index({ branch: 1, name: 1 }, { unique: true });
ingredientSchema.index({ branchId: 1, name: 1 }, { unique: true });
ingredientSchema.index({ name: 1 });
ingredientSchema.index({ status: 1 });
ingredientSchema.index({ category: 1 });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export default Ingredient;
