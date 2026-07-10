import { z } from 'zod';

export const getAuditLogsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 15),
  sort: z.string().optional().default('timestamp'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  action: z.string().optional(),
  performedByRole: z.string().optional(),
  branchId: z.string().optional(),
  performedBy: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  export: z.enum(['csv', 'json']).optional()
});
