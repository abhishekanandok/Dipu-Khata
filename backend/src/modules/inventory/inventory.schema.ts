import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  body: z.object({
    materialId: z.string().min(1, 'Material ID is required'),
    type: z.enum(['ADD', 'SUBTRACT', 'DAMAGE', 'WASTAGE']),
    quantity: z.coerce.number().positive('Quantity must be greater than zero'),
    reason: z.string().min(3, 'Reason / audit explanation is required').trim(),
  }),
});

export const stockMovementQuerySchema = z.object({
  query: z.object({
    materialId: z.string().optional(),
    movementType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>['body'];
export type StockMovementQueryParams = z.infer<typeof stockMovementQuerySchema>['query'];
