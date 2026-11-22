import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const paymentRouter = Router();
export const accountingRouter = Router();

// Payment routes
paymentRouter.use(requireAuth);
paymentRouter.post('/', PaymentController.createPayment);
paymentRouter.get('/', PaymentController.getPayments);
paymentRouter.get('/:id', PaymentController.getPaymentById);

// Accounting & Cash Book routes
accountingRouter.use(requireAuth);
accountingRouter.get('/cash-book', PaymentController.getCashBook);
accountingRouter.get('/outstanding', PaymentController.getOutstandingDues);
