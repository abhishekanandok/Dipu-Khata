import { Router } from 'express';
import { SaleController, EstimateController } from './sale.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const salesRouter = Router();
export const estimateRouter = Router();

// Sales Routes
salesRouter.use(requireAuth);
salesRouter.post('/', SaleController.createSale);
salesRouter.get('/', SaleController.getSales);
salesRouter.get('/:id', SaleController.getSaleById);
salesRouter.post('/:id/cancel', SaleController.cancelSale);

// Estimate Routes
estimateRouter.use(requireAuth);
estimateRouter.post('/', EstimateController.createEstimate);
estimateRouter.get('/', EstimateController.getEstimates);
estimateRouter.get('/:id', EstimateController.getEstimateById);
estimateRouter.post('/:id/convert', EstimateController.convertEstimate);
