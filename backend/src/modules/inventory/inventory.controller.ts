import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { InventoryService } from './inventory.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { StockMovementQueryParams } from './inventory.schema.js';

export class InventoryController {
  static async getOverview(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const overview = await InventoryService.getStockOverview();
      return ApiRes.success(res, overview, 'Stock overview retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getMaterialStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const materialId = req.params.materialId as string;
      const stock = await InventoryService.getMaterialStock(materialId);
      return ApiRes.success(res, stock, 'Material stock details retrieved');
    } catch (error) {
      return next(error);
    }
  }

  static async getMovements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as StockMovementQueryParams;
      const result = await InventoryService.getStockMovements(query);
      return ApiRes.success(res, result.movements, 'Stock movements retrieved', 200, {
        pagination: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const movement = await InventoryService.adjustStock(req.body, req.userId);
      return ApiRes.created(res, movement, 'Stock adjusted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
