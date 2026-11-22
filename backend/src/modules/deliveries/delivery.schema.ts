import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().min(2, 'Driver name is required'),
  mobile: z.string().min(10, 'Valid 10-digit mobile number required'),
  licenseNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const createVehicleSchema = z.object({
  vehicleNumber: z.string().min(4, 'Vehicle number is required'),
  vehicleType: z.enum(['TRACTOR', 'TIPPER', 'TRUCK_10_WHEELER', 'PICKUP', 'OTHER']).default('TRACTOR'),
  capacity: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const deliveryItemInputSchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
});

export const createDeliverySchema = z.object({
  saleId: z.string().min(1, 'Sale invoice ID is required'),
  driverId: z.string().optional(),
  driverName: z.string().trim().optional(),
  driverMobile: z.string().trim().optional(),
  vehicleId: z.string().optional(),
  vehicleNumber: z.string().trim().optional(),
  deliveryAddress: z.string().min(2, 'Delivery address is required'),
  items: z.array(deliveryItemInputSchema).min(1, 'At least one dispatched item is required'),
  dispatchDate: z.string().datetime().or(z.date()).optional(),
  notes: z.string().trim().optional(),
});

export const deliveryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  saleId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  status: z.enum(['DISPATCHED', 'DELIVERED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type DeliveryQueryParams = z.infer<typeof deliveryQuerySchema>;
