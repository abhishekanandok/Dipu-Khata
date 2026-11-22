import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { customerRouter } from '../modules/customers/customer.routes.js';
import { materialRouter, categoryRouter } from '../modules/materials/material.routes.js';
import { purchaseRouter, supplierRouter } from '../modules/purchases/purchase.routes.js';
import { inventoryRouter } from '../modules/inventory/inventory.routes.js';
import { salesRouter, estimateRouter } from '../modules/sales/sale.routes.js';
import { paymentRouter, accountingRouter } from '../modules/payments/payment.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/materials', materialRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/purchases', purchaseRouter);
apiRouter.use('/suppliers', supplierRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/estimates', estimateRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/accounting', accountingRouter);
