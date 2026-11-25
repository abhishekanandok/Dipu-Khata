import { Router } from 'express';
import { SyncController } from './sync.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const syncRouter = Router();

syncRouter.use(requireAuth);
syncRouter.post('/batch', SyncController.processBatch);
syncRouter.get('/pull', SyncController.pullDelta);
