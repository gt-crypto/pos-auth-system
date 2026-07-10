import { z } from 'zod';

export const createIngredientSchema = z.object({
  name: z.string().trim().min(2, 'Ingredient name must be at least 2 characters').max(100),
  category: z.enum(['Vegetables', 'Dairy', 'Meat', 'Spices', 'Oil', 'Beverages', 'Bakery', 'Frozen', 'Other']),
  unit: z.enum(['Kg', 'Gram', 'Liter', 'ml', 'Packet', 'Piece', 'Bottle', 'Box']),
  
  // Support both Module 10 and Module 12 fields
  quantity: z.number().nonnegative('Quantity cannot be negative').optional(),
  currentStock: z.number().nonnegative('Stock level cannot be negative').optional(),
  
  minimumQuantity: z.number().nonnegative('Minimum quantity cannot be negative').optional(),
  reorderThreshold: z.number().nonnegative('Reorder threshold cannot be negative').optional(),
  
  costPerUnit: z.number().nonnegative('Cost per unit cannot be negative').optional(),
  costPrice: z.number().nonnegative('Cost price cannot be negative').optional(),
  
  supplier: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Supplier ID').optional().nullable(),
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Supplier ID').optional().nullable(),
  
  branch: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Branch ID').optional().nullable(),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Branch ID').optional().nullable()
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const restockIngredientSchema = z.object({
  ingredientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ingredient ID'),
  quantity: z.number().positive('Restock quantity must be greater than zero'),
  costPrice: z.number().nonnegative('Cost price cannot be negative').optional(),
  costPerUnit: z.number().nonnegative('Cost price cannot be negative').optional(),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(200),
  invoiceNumber: z.string().trim().max(100).optional().default(''),
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  supplier: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable()
});

export const adjustIngredientSchema = z.object({
  ingredientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ingredient ID'),
  quantity: z.number().nonnegative('Quantity cannot be negative'), // New total quantity
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(200)
});

export const transferIngredientSchema = z.object({
  ingredientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ingredient ID'),
  toBranchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Destination Branch ID'),
  quantity: z.number().positive('Transfer quantity must be greater than zero'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(200)
});
