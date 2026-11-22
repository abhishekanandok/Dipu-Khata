import { z } from 'zod';

export const createPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  paymentDate: z.string().datetime().or(z.date()).optional(),
  amount: z.number().positive('Payment amount must be greater than 0'), // In paise
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']).default('CASH'),
  referenceNumber: z.string().trim().optional(),
  relatedSaleId: z.string().optional(),
  notes: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const cashBookQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQueryParams = z.infer<typeof paymentQuerySchema>;
export type CashBookQueryParams = z.infer<typeof cashBookQuerySchema>;
