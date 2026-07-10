import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

export const createUserSchema = z.object({
  username: z.string().min(4, 'Username must be at least 4 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(Object.values(ROLES)),
  branchId: z.string().optional().nullable(),
  hasIngredientsAccess: z.boolean().optional().default(false)
}).refine((data) => {
  if (data.role === ROLES.ADMIN || data.role === ROLES.CASHIER) {
    return !!data.branchId;
  }
  return true;
}, {
  message: 'Branch is required for Admins and Cashiers',
  path: ['branchId']
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  branchId: z.string().optional().nullable(),
  hasIngredientsAccess: z.boolean().optional()
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
});
