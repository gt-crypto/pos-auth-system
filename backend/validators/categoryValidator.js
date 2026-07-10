import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(60, 'Category name cannot exceed 60 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  displayOrder: z.number().int().nonnegative('Display order must be a non-negative integer').optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();
