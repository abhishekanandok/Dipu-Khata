import { Router } from 'express';
import { ReportController } from './report.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);
reportRouter.get('/sales-summary', ReportController.getSalesSummary);
reportRouter.get('/cash-flow', ReportController.getCashFlow);
reportRouter.get('/profit-loss', ReportController.getProfitLoss);
reportRouter.get('/stock-valuation', ReportController.getStockValuation);
