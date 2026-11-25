import { Response, NextFunction } from 'express';
import { ReportService } from './report.service.js';
import { reportQuerySchema } from './report.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class ReportController {
  static async getSalesSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = reportQuerySchema.parse(req.query);
      const data = await ReportService.getSalesSummary(query);
      return ApiRes.success(res, data, 'Sales summary report generated');
    } catch (error) {
      return next(error);
    }
  }

  static async getCashFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = reportQuerySchema.parse(req.query);
      const data = await ReportService.getCashFlow(query);
      return ApiRes.success(res, data, 'Cash flow report generated');
    } catch (error) {
      return next(error);
    }
  }

  static async getProfitLoss(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = reportQuerySchema.parse(req.query);
      const data = await ReportService.getProfitLoss(query);
      return ApiRes.success(res, data, 'Profit & Loss report generated');
    } catch (error) {
      return next(error);
    }
  }

  static async getStockValuation(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getStockValuation();
      return ApiRes.success(res, data, 'Stock valuation report generated');
    } catch (error) {
      return next(error);
    }
  }
}
