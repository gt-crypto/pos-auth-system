import { z } from 'zod';

export const createSupplierSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  contactPerson: z.string()
    .trim()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(100, 'Contact person name cannot exceed 100 characters'),
  phone: z.string()
    .trim()
    .min(5, 'Phone number must be at least 5 characters')
    .max(20, 'Phone number cannot exceed 20 characters'),
  email: z.string()
    .trim()
    .email('Please provide a valid email address'),
  gstNumber: z.string().trim().max(30, 'GST Number cannot exceed 30 characters').optional().default(''),
  address: z.string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(300, 'Address cannot exceed 300 characters'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
});

export const updateSupplierSchema = createSupplierSchema.partial();
