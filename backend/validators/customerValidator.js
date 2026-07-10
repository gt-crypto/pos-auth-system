import { z } from 'zod';

const customerBaseSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phoneNumber: z.string().trim().min(5, 'Phone number must be at least 5 digits').max(20).optional(),
  phone: z.string().trim().min(5, 'Phone number must be at least 5 digits').max(20).optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).default(''),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Branch ID').optional().nullable(),
  notes: z.string().trim().max(500).optional().default('')
});

export const createCustomerSchema = customerBaseSchema.refine(data => data.phone || data.phoneNumber, {
  message: "Phone number is required",
  path: ["phone"]
});

export const updateCustomerSchema = customerBaseSchema.partial();

export const createOrderSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  customerName: z.string().trim().optional().default('Walk-in Customer'),
  customerPhone: z.string().trim().optional().default(''),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
    name: z.string().trim().min(1),
    sku: z.string().trim().optional().default(''),
    quantity: z.number().int().positive('Quantity must be at least 1'),
    unitPrice: z.number().nonnegative('Unit price cannot be negative'),
    discount: z.number().nonnegative().optional().default(0),
    taxAmount: z.number().nonnegative().optional().default(0),
    totalPrice: z.number().nonnegative()
  })).min(1, 'At least one item is required'),
  subtotal: z.number().nonnegative(),
  totalDiscount: z.number().nonnegative().optional().default(0),
  totalTax: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().nonnegative(),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'OTHER']),
  notes: z.string().trim().max(500).optional().default('')
});
