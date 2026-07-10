import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../constants/roles.js';

const loginHistorySchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  loginTime: { type: Date, default: Date.now }
}, { _id: false });

const roleHistorySchema = new mongoose.Schema({
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  oldRole: {
    type: String,
    required: true
  },
  newRole: {
    type: String,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 4,
    maxlength: 20,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.CASHIER
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    index: true,
    default: null,
    required: [
      function() {
        return (this.role === ROLES.ADMIN || this.role === ROLES.CASHIER) && this.status === 'ACTIVE';
      },
      'Branch is required for Admins and Cashiers'
    ]
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'PENDING',
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  inviteCodeUsed: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date
  },
  lastFailedLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  hasIngredientsAccess: {
    type: Boolean,
    default: false
  },
  loginHistory: [loginHistorySchema],
  roleHistory: [roleHistorySchema],
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function () {
  if (!this.accountLockedUntil) return false;
  return this.accountLockedUntil > Date.now();
};

const User = mongoose.model('User', userSchema);
export default User;
