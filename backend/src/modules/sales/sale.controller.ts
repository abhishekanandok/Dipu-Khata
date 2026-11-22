import { Response, NextFunction } from 'express';
import { SaleService, EstimateService } from './sale.service.js';
import {
  createSaleSchema,
  cancelSaleSchema,
  saleQuerySchema,
  createEstimateSchema,
  convertEstimateSchema,
  estimateQuerySchema,
} from './sale.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class SaleController {
  static async createSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
      const validated = createSaleSchema.parse({
        ...req.body,
        idempotencyKey,
      });

      const sale = await SaleService.createSale(validated, req.userId);

      return ApiRes.created(
        res,
        sale,
        `Invoice #${sale.invoiceNumber} created successfully`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = saleQuerySchema.parse(req.query);
      const result = await SaleService.getSales(validated);

      return ApiRes.success(
        res,
        {
          sales: result.sales,
          summary: result.summary,
        },
        'Sales fetched successfully',
        200,
        {
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.totalCount,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getSaleById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sale = await SaleService.getSaleById(req.params.id as string);
      return ApiRes.success(res, sale, 'Sale details fetched');
    } catch (error) {
      return next(error);
    }
  }

  static async cancelSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = cancelSaleSchema.parse(req.body);
      const sale = await SaleService.cancelSale(
        req.params.id as string,
        reason,
        req.userId
      );

      return ApiRes.success(
        res,
        sale,
        `Invoice #${sale.invoiceNumber} cancelled successfully`
      );
    } catch (error) {
      return next(error);
    }
  }
}

export class EstimateController {
  static async createEstimate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createEstimateSchema.parse(req.body);
      const estimate = await EstimateService.createEstimate(validated, req.userId);

      return ApiRes.created(
        res,
        estimate,
        `Estimate #${estimate.estimateNumber} created successfully`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getEstimates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = estimateQuerySchema.parse(req.query);
      const result = await EstimateService.getEstimates(validated);

      return ApiRes.success(
        res,
        result.estimates,
        'Estimates fetched successfully',
        200,
        {
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.totalCount,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getEstimateById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const estimate = await EstimateService.getEstimateById(req.params.id as string);
      return ApiRes.success(res, estimate, 'Estimate details fetched');
    } catch (error) {
      return next(error);
    }
  }

  static async convertEstimate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = convertEstimateSchema.parse(req.body);
      const result = await EstimateService.convertEstimate(
        req.params.id as string,
        validated,
        req.userId
      );

      return ApiRes.success(
        res,
        result,
        `Estimate #${result.estimate.estimateNumber} converted into Bill #${result.sale.invoiceNumber}`
      );
    } catch (error) {
      return next(error);
    }
  }
}
