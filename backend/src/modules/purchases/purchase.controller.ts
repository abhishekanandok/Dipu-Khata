import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { PurchaseService } from './purchase.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { PurchaseQueryParams } from './purchase.schema.js';

export class PurchaseController {
  static async createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await PurchaseService.createSupplier(req.body);
      return ApiRes.created(res, supplier, 'Supplier created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getSuppliers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const suppliers = await PurchaseService.getSuppliers();
      return ApiRes.success(res, suppliers, 'Suppliers fetched successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async createPurchase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const purchase = await PurchaseService.createPurchase(req.body, req.userId);
      return ApiRes.created(res, purchase, 'Purchase recorded and stock updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getPurchases(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as PurchaseQueryParams;
      const result = await PurchaseService.getPurchases(query);
      return ApiRes.success(res, result.purchases, 'Purchases retrieved successfully', 200, {
        pagination: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getPurchaseById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const purchaseId = req.params.id as string;
      const purchase = await PurchaseService.getPurchaseById(purchaseId);
      return ApiRes.success(res, purchase, 'Purchase details retrieved');
    } catch (error) {
      return next(error);
    }
  }
}
