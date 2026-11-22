import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters').trim(),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits').trim(),
    village: z.string().trim().optional(),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    openingBalance: z.coerce.number().default(0), // In paise
    openingBalanceType: z.enum(['RECEIVABLE', 'PAYABLE']).default('RECEIVABLE'),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters').trim().optional(),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits').trim().optional(),
    village: z.string().trim().optional(),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});

export const customerQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    filter: z.enum(['all', 'with_dues', 'zero_balance', 'advance']).default('all'),
    village: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(30),
  }),
});

export const ledgerQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const createAdjustmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  body: z.object({
    amount: z.coerce.number().min(1, 'Amount must be greater than zero'), // In paise
    type: z.enum(['DEBIT', 'CREDIT']),
    description: z.string().min(3, 'Reason / description must be at least 3 characters'),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type CustomerQueryParams = z.infer<typeof customerQuerySchema>['query'];
export type LedgerQueryParams = z.infer<typeof ledgerQuerySchema>['query'];
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>['body'];
