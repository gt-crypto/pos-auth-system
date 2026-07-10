import { z } from 'zod';

const billingItemSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional().default(''),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().optional().default(0),
  taxAmount: z.number().nonnegative().optional().default(0),
  totalPrice: z.number().nonnegative('Total price cannot be negative'),
  variantName: z.string().optional().default('')
});

const paymentMethodSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'UPI']),
  amount: z.number().positive('Payment amount must be greater than zero'),
  referenceNumber: z.string().trim().max(100).optional().default('')
});

export const checkoutSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Customer ID').optional().nullable(),
  customerName: z.string().trim().optional().default('Walk-in Customer'),
  customerPhone: z.string().trim().optional().default(''),
  items: z.array(billingItemSchema).min(1, 'At least one item in cart is required'),
  subtotal: z.number().nonnegative(),
  totalDiscount: z.number().nonnegative().optional().default(0),
  totalTax: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().nonnegative(),
  paymentMethods: z.array(paymentMethodSchema).min(1, 'At least one payment method is required'),
  notes: z.string().trim().max(500).optional().default('')
}).refine(data => {
  // Validate total payments matches grand total (allowing for float rounding up to 2 decimals)
  const sumPayments = data.paymentMethods.reduce((sum, p) => sum + p.amount, 0);
  return Math.abs(sumPayments - data.totalAmount) < 0.05;
}, {
  message: 'Sum of split payment amounts must equal the grand total',
  path: ['paymentMethods']
});

export const holdOrderSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  customerName: z.string().trim().optional().default('Walk-in Customer'),
  customerPhone: z.string().trim().optional().default(''),
  items: z.array(billingItemSchema).min(1, 'Cart items required to hold order'),
  subtotal: z.number().nonnegative(),
  totalDiscount: z.number().nonnegative().optional().default(0),
  totalTax: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().nonnegative(),
  notes: z.string().trim().max(500).optional().default('')
});

export const splitOrderSchema = z.object({
  parentOrderId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  splits: z.array(z.object({
    items: z.array(billingItemSchema).min(1),
    subtotal: z.number().nonnegative(),
    totalDiscount: z.number().nonnegative().optional().default(0),
    totalTax: z.number().nonnegative().optional().default(0),
    totalAmount: z.number().nonnegative(),
    paymentMethods: z.array(paymentMethodSchema).min(1)
  })).min(2, 'Must split into at least 2 bills')
});

export const voidRefundSchema = z.object({
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(200)
});
