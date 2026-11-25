import { Response, NextFunction } from 'express';
import { SyncService } from './sync.service.js';
import { batchSyncSchema } from './sync.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class SyncController {
  static async processBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = batchSyncSchema.parse(req.body);
      const result = await SyncService.processBatch(validated.operations, req.userId);
      return ApiRes.success(
        res,
        result,
        `Sync batch processed: ${result.syncedCount} synced, ${result.failedCount} failed`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async pullDelta(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const since = req.query.since as string | undefined;
      const data = await SyncService.pullDelta(since);
      return ApiRes.success(res, data, 'Offline cache delta pulled successfully');
    } catch (error) {
      return next(error);
    }
  }
}
