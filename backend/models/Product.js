import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Variant name is required'], 
    trim: true 
  },
  price: { 
    type: Number, 
    required: [true, 'Variant price is required'], 
    min: [0.01, 'Price must be greater than zero'] 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  displayOrder: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
});

const ProductSchema = new mongoose.Schema({
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: [true, 'Branch ID is required'] 
  },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: [true, 'Category ID is required'] 
  },
  name: { 
    type: String, 
    required: [true, 'Product name is required'], 
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  sku: { 
    type: String, 
    required: [true, 'SKU is required'], 
    trim: true 
  },
  barcode: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  price: { 
    type: Number, 
    min: [0, 'Base price cannot be negative'] 
  },
  taxPercentage: { 
    type: Number, 
    required: [true, 'Tax percentage (GST) is required'], 
    min: [0, 'Tax percentage cannot be negative'], 
    max: [100, 'Tax percentage cannot exceed 100'],
    default: 0 
  },
  imageUrl: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  isVeg: { 
    type: Boolean, 
    default: false 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE'], 
    default: 'ACTIVE' 
  },
  isCombo: { 
    type: Boolean, 
    default: false 
  },
  variants: [VariantSchema],
  comboItems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
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

// Enforce database level constraints
ProductSchema.index({ branchId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ branchId: 1, categoryId: 1, name: 1 }, { unique: true });
ProductSchema.index({ branchId: 1, barcode: 1 }, { 
  unique: true, 
  partialFilterExpression: { barcode: { $gt: '' } } 
});
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ status: 1 });

export default mongoose.model('Product', ProductSchema);
