import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum(['TRANSPORT', 'FUEL', 'LABOUR', 'MAINTENANCE', 'SHOP', 'MISC']),
  amount: z.number().positive('Expense amount must be greater than 0'), // In paise
  date: z.string().datetime().or(z.date()).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK']).default('CASH'),
  paidTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional(),
});

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  category: z.enum(['TRANSPORT', 'FUEL', 'LABOUR', 'MAINTENANCE', 'SHOP', 'MISC']).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpenseQueryParams = z.infer<typeof expenseQuerySchema>;
