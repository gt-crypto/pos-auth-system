import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createInventorySchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid Product ID'),
  supplierId: z.string().regex(objectIdRegex, 'Invalid Supplier ID').optional().nullable(),
  branchId: z.string().regex(objectIdRegex, 'Invalid Branch ID').optional().nullable(),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  threshold: z.number().nonnegative('Threshold level cannot be negative'),
  unit: z.string().trim().min(1, 'Unit specification is required')
});

// Update allows ONLY threshold, supplierId, and unit changes
export const updateInventorySchema = z.object({
  threshold: z.number().nonnegative('Threshold level cannot be negative').optional(),
  supplierId: z.string().regex(objectIdRegex, 'Invalid Supplier ID').nullable().optional(),
  unit: z.string().trim().min(1, 'Unit specification is required').optional()
});

export const restockInventorySchema = z.object({
  inventoryId: z.string().regex(objectIdRegex, 'Invalid Inventory ID'),
  quantityAdded: z.number().positive('Restock quantity must be greater than zero'),
  supplierId: z.string().regex(objectIdRegex, 'Invalid Supplier ID').optional().nullable(),
  invoiceNumber: z.string().trim().max(100, 'Invoice number is too long').optional().default(''),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().default('')
});

export const adjustInventorySchema = z.object({
  inventoryId: z.string().regex(objectIdRegex, 'Invalid Inventory ID'),
  newQuantity: z.number().nonnegative('New quantity cannot be negative'),
  reason: z.enum(['DAMAGED', 'EXPIRED', 'WASTED', 'MANUAL_CORRECTION'], {
    errorMap: () => ({ message: 'Reason must be DAMAGED, EXPIRED, WASTED, or MANUAL_CORRECTION' })
  }),
  notes: z.string().trim().min(3, 'Audit notes describing the manual adjustment are required').max(1000)
});

export const transferInventorySchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid Product ID'),
  fromBranch: z.string().regex(objectIdRegex, 'Invalid Source Branch ID'),
  toBranch: z.string().regex(objectIdRegex, 'Invalid Destination Branch ID'),
  quantity: z.number().positive('Transfer quantity must be greater than zero'),
  notes: z.string().trim().max(1000).optional().default('')
});
