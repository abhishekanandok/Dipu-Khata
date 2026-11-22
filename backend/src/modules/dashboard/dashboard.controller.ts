import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { DashboardService } from './dashboard.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { DashboardSummaryQuery } from './dashboard.schema.js';

export class DashboardController {
  static async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as DashboardSummaryQuery;
      const summary = await DashboardService.getSummary(query);
      return ApiRes.success(res, summary, 'Dashboard summary retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }
}
