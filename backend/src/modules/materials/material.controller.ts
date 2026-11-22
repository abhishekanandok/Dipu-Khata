import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { MaterialService } from './material.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { MaterialQueryParams } from './material.schema.js';

export class MaterialController {
  static async getCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await MaterialService.getCategories();
      return ApiRes.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const category = await MaterialService.createCategory(req.body);
      return ApiRes.created(res, category, 'Category created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getMaterials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as MaterialQueryParams;
      const result = await MaterialService.getMaterials(query);
      return ApiRes.success(res, result.materials, 'Materials retrieved successfully', 200, {
        pagination: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getMaterialById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const materialId = req.params.id as string;
      const material = await MaterialService.getMaterialById(materialId);
      return ApiRes.success(res, material, 'Material retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async createMaterial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const material = await MaterialService.createMaterial(req.body, req.userId);
      return ApiRes.created(res, material, 'Material added to catalog successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async updateMaterial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const materialId = req.params.id as string;
      const material = await MaterialService.updateMaterial(materialId, req.body, req.userId);
      return ApiRes.success(res, material, 'Material updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getPriceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const materialId = req.params.id as string;
      const history = await MaterialService.getPriceHistory(materialId);
      return ApiRes.success(res, history, 'Price history retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }
}
