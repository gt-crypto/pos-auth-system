import mongoose from 'mongoose';

const ingredientHistorySchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
    index: true
  },
  
  // Branch
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  
  // Quantity Changed
  quantityChanged: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },

  // Action / Operation
  action: {
    type: String,
    required: true,
    index: true
  },
  operation: {
    type: String,
    required: true,
    index: true
  },

  reason: {
    type: String,
    required: true,
    trim: true
  },
  invoiceNumber: {
    type: String,
    default: ''
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },

  // User / Actor
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Date / Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Pre-validate synchronization hook
ingredientHistorySchema.pre('validate', function(next) {
  // Sync branch
  if (this.branch !== undefined) this.branchId = this.branch;
  else if (this.branchId !== undefined) this.branch = this.branchId;

  // Sync quantity changed
  if (this.quantity !== undefined) this.quantityChanged = this.quantity;
  else if (this.quantityChanged !== undefined) this.quantity = this.quantityChanged;

  // Sync operation
  if (this.operation !== undefined) this.action = this.operation;
  else if (this.action !== undefined) this.operation = this.action;

  // Sync user
  if (this.user !== undefined) this.actorId = this.user;
  else if (this.actorId !== undefined) this.user = this.actorId;

  // Sync date
  if (this.date !== undefined) this.timestamp = this.date;
  else if (this.timestamp !== undefined) this.date = this.timestamp;

  next();
});

const IngredientHistory = mongoose.model('IngredientHistory', ingredientHistorySchema);
export default IngredientHistory;
