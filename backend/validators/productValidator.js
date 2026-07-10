import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const variantSchema = z.object({
  name: z.string().trim().min(1, 'Variant name is required'),
  price: z.number().positive('Variant price must be greater than zero'),
  isDefault: z.boolean().optional().default(false),
  displayOrder: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true)
});

const productBaseSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, 'Invalid Category ID'),
  name: z.string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name cannot exceed 100 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().default(''),
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters'),
  barcode: z.string().trim().optional().default(''),
  price: z.number().min(0, 'Base price cannot be negative').optional(),
  taxPercentage: z.number().min(0, 'GST tax cannot be negative').max(100, 'GST tax cannot exceed 100%'),
  imageUrl: z.string().trim().optional().default(''),
  isVeg: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  isCombo: z.boolean().optional().default(false),
  variants: z.array(variantSchema).optional().default([]),
  comboItems: z.array(z.string().regex(objectIdRegex, 'Invalid Combo Product ID')).optional().default([])
});

export const updateProductSchema = productBaseSchema.partial();

export const createProductSchema = productBaseSchema
.refine((data) => {
  const hasVariants = data.variants && data.variants.length > 0;
  const hasPrice = data.price !== undefined && data.price !== null;
  return hasVariants || hasPrice;
}, {
  message: 'At least one variant configuration OR a base price must be supplied.',
  path: ['price']
})
.refine((data) => {
  // If imageUrl is supplied, it must be a valid URL format or a clean relative path / empty string
  if (data.imageUrl && data.imageUrl.trim() !== '') {
    try {
      new URL(data.imageUrl);
      return true;
    } catch {
      return data.imageUrl.startsWith('/') || data.imageUrl.startsWith('http');
    }
  }
  return true;
}, {
  message: 'Invalid Image URL format',
  path: ['imageUrl']
})
.refine((data) => {
  // If isCombo is true, it must have at least one combo item
  if (data.isCombo) {
    return data.comboItems && data.comboItems.length > 0;
  }
  return true;
}, {
  message: 'Combo products must have at least one selected item reference.',
  path: ['comboItems']
});
