import { z } from 'zod';

export const syncOperationSchema = z.object({
  localId: z.string().min(1, 'Local ID is required'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  action: z.enum(['CREATE_CUSTOMER', 'CREATE_SALE', 'CREATE_PAYMENT', 'CREATE_EXPENSE']),
  payload: z.record(z.any()),
  createdAt: z.string().optional(),
});

export const batchSyncSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(100),
});

export type SyncOperationInput = z.infer<typeof syncOperationSchema>;
export type BatchSyncInput = z.infer<typeof batchSyncSchema>;
