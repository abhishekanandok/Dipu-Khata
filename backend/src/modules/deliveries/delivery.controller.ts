import { Response, NextFunction } from 'express';
import { DeliveryService } from './delivery.service.js';
import {
  createDriverSchema,
  createVehicleSchema,
  createDeliverySchema,
  deliveryQuerySchema,
} from './delivery.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class DeliveryController {
  // Driver Controllers
  static async createDriver(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createDriverSchema.parse(req.body);
      const driver = await DeliveryService.createDriver(validated);
      return ApiRes.created(res, driver, 'Driver registered successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getDrivers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const drivers = await DeliveryService.getDrivers();
      return ApiRes.success(res, drivers, 'Drivers fetched successfully');
    } catch (error) {
      return next(error);
    }
  }

  // Vehicle Controllers
  static async createVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createVehicleSchema.parse(req.body);
      const vehicle = await DeliveryService.createVehicle(validated);
      return ApiRes.created(res, vehicle, 'Vehicle registered successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getVehicles(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vehicles = await DeliveryService.getVehicles();
      return ApiRes.success(res, vehicles, 'Vehicles fetched successfully');
    } catch (error) {
      return next(error);
    }
  }

  // Delivery Challan Controllers
  static async createDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createDeliverySchema.parse(req.body);
      const delivery = await DeliveryService.createDelivery(validated, req.userId);
      return ApiRes.created(
        res,
        delivery,
        `Delivery Challan #${delivery.challanNumber} issued and stock dispatched`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getDeliveries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = deliveryQuerySchema.parse(req.query);
      const result = await DeliveryService.getDeliveries(validated);

      return ApiRes.success(res, result.deliveries, 'Deliveries fetched successfully', 200, {
        timestamp: new Date().toISOString(),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getDeliveryById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const delivery = await DeliveryService.getDeliveryById(req.params.id as string);
      return ApiRes.success(res, delivery, 'Delivery challan details fetched');
    } catch (error) {
      return next(error);
    }
  }
}
