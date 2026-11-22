import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Supplier name must be at least 2 characters').trim(),
    companyName: z.string().trim().optional(),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits').trim(),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  }),
});

export const purchaseItemSchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'), // In paise
});

export const createPurchaseSchema = z.object({
  body: z.object({
    invoiceNumber: z.string().min(1, 'Invoice / bill number is required').trim(),
    supplierId: z.string().min(1, 'Supplier ID is required'),
    purchaseDate: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1, 'At least one material item is required'),
    transportCharges: z.coerce.number().min(0).default(0), // In paise
    otherCharges: z.coerce.number().min(0).default(0), // In paise
    amountPaid: z.coerce.number().min(0).default(0), // In paise
    paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CREDIT']).default('CREDIT'),
    notes: z.string().trim().optional(),
  }),
});

export const purchaseQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    supplierId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(30),
  }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>['body'];
export type PurchaseQueryParams = z.infer<typeof purchaseQuerySchema>['query'];
