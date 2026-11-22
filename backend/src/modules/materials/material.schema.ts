import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').trim(),
    hindiName: z.string().trim().optional(),
    description: z.string().trim().optional(),
  }),
});

export const alternativeUnitSchema = z.object({
  unit: z.string().min(1),
  conversionFactor: z.number().positive('Conversion factor must be positive'),
});

export const createMaterialSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Material name must be at least 2 characters').trim(),
    hindiName: z.string().trim().optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().min(1, 'Category name is required').trim(),
    sku: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    description: z.string().trim().optional(),
    defaultUnit: z.enum(['CFT', 'TON', 'BAG', 'KG', 'PIECE', 'TRIP', 'CUSTOM']).default('CFT'),
    alternativeUnits: z.array(alternativeUnitSchema).optional().default([]),
    purchaseRate: z.coerce.number().min(0, 'Purchase rate cannot be negative'), // In paise
    sellingRate: z.coerce.number().min(0, 'Selling rate cannot be negative'), // In paise
    currentStock: z.coerce.number().default(0),
    minimumStockAlert: z.coerce.number().min(0).default(10),
  }),
});

export const updateMaterialSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Material ID is required'),
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    hindiName: z.string().trim().optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    description: z.string().trim().optional(),
    defaultUnit: z.enum(['CFT', 'TON', 'BAG', 'KG', 'PIECE', 'TRIP', 'CUSTOM']).optional(),
    alternativeUnits: z.array(alternativeUnitSchema).optional(),
    purchaseRate: z.coerce.number().min(0).optional(),
    sellingRate: z.coerce.number().min(0).optional(),
    currentStock: z.coerce.number().optional(),
    minimumStockAlert: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    priceChangeReason: z.string().optional(),
  }),
});

export const materialQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    unit: z.string().optional(),
    lowStockOnly: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>['body'];
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>['body'];
export type MaterialQueryParams = z.infer<typeof materialQuerySchema>['query'];
