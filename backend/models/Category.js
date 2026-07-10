import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: [true, 'Branch ID is required'] 
  },
  name: { 
    type: String, 
    required: [true, 'Category name is required'], 
    trim: true, 
    minlength: [2, 'Category name must be at least 2 characters'], 
    maxlength: [60, 'Category name cannot exceed 60 characters'] 
  },
  description: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  displayOrder: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
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

// Category name must be unique inside the same branch
CategorySchema.index({ branchId: 1, name: 1 }, { unique: true });
CategorySchema.index({ isActive: 1 });

export default mongoose.model('Category', CategorySchema);
