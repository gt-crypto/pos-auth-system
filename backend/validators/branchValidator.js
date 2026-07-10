import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  branchCode: z.string().trim().min(3, 'Branch code must be at least 3 characters').toUpperCase(),
  phone: z.string().trim().min(5, 'Phone is too short'),
  email: z.string().email('Invalid email address').toLowerCase(),
  address: z.string().trim().min(5, 'Address is too short'),
  city: z.string().trim().min(2, 'City is too short'),
  state: z.string().trim().min(2, 'State is too short'),
  country: z.string().trim().min(2, 'Country is too short'),
  pincode: z.string().trim().min(4, 'Pincode must be at least 4 digits'),
  managerName: z.string().trim().min(2, 'Manager name must be at least 2 characters'),
  businessId: z.string().optional().nullable()
});

export const updateBranchSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  branchCode: z.string().trim().min(3, 'Branch code must be at least 3 characters').toUpperCase().optional(),
  phone: z.string().trim().min(5, 'Phone is too short').optional(),
  email: z.string().email('Invalid email address').toLowerCase().optional(),
  address: z.string().trim().min(5, 'Address is too short').optional(),
  city: z.string().trim().min(2, 'City is too short').optional(),
  state: z.string().trim().min(2, 'State is too short').optional(),
  country: z.string().trim().min(2, 'Country is too short').optional(),
  pincode: z.string().trim().min(4, 'Pincode must be at least 4 digits').optional(),
  managerName: z.string().trim().min(2, 'Manager name must be at least 2 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  businessId: z.string().optional().nullable()
});

export const updateBranchStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'])
});
