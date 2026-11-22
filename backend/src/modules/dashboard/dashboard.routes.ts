import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { dashboardSummaryQuerySchema } from './dashboard.schema.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  requireAuth,
  validate(dashboardSummaryQuerySchema),
  DashboardController.getSummary
);
