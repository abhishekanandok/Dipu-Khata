import { Router } from 'express';
import { DocumentController } from './document.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const documentRouter = Router();

documentRouter.use(requireAuth);
documentRouter.get('/invoices/:id/html', DocumentController.getInvoiceHtml);
documentRouter.get('/estimates/:id/html', DocumentController.getEstimateHtml);
documentRouter.get('/statements/:id/html', DocumentController.getCustomerStatementHtml);
documentRouter.get('/receipts/:id/html', DocumentController.getPaymentReceiptHtml);
