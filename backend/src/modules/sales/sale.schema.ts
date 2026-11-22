import { z } from 'zod';

const saleItemInputSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().nonnegative('Rate must be non-negative'), // In paise
});

const salePaymentInputSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'), // In paise
  method: z.enum(['CASH', 'UPI', 'BANK']),
  referenceNumber: z.string().trim().optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  saleDate: z.string().datetime().or(z.date()).optional(),
  items: z.array(saleItemInputSchema).min(1, 'At least one item is required'),
  discount: z.number().nonnegative().optional().default(0), // In paise
  transportCharges: z.number().nonnegative().optional().default(0), // In paise
  payments: z.array(salePaymentInputSchema).optional().default([]),
  estimateId: z.string().optional(),
  autoStockDeduction: z.boolean().optional().default(false),
  notes: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters'),
});

export const saleQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
  deliveryStatus: z.enum(['PENDING', 'PARTIAL', 'DELIVERED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createEstimateSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, 'Customer name is required'),
  customerMobile: z.string().min(10, 'Valid 10-digit mobile number required'),
  village: z.string().trim().optional(),
  estimateDate: z.string().datetime().or(z.date()).optional(),
  validUntil: z.string().datetime().or(z.date()).optional(),
  items: z.array(saleItemInputSchema).min(1, 'At least one item is required'),
  discount: z.number().nonnegative().optional().default(0),
  transportCharges: z.number().nonnegative().optional().default(0),
  notes: z.string().trim().optional(),
});

export const convertEstimateSchema = z.object({
  customerId: z.string().optional(), // In case prospective customer was now registered
  payments: z.array(salePaymentInputSchema).optional().default([]),
  discount: z.number().nonnegative().optional(),
  transportCharges: z.number().nonnegative().optional(),
  autoStockDeduction: z.boolean().optional().default(false),
  notes: z.string().trim().optional(),
});

export const estimateQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONVERTED', 'EXPIRED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
export type SaleQueryParams = z.infer<typeof saleQuerySchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type ConvertEstimateInput = z.infer<typeof convertEstimateSchema>;
export type EstimateQueryParams = z.infer<typeof estimateQuerySchema>;
