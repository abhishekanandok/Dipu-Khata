import { Router } from 'express';
import { PurchaseController } from './purchase.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  createSupplierSchema,
  createPurchaseSchema,
  purchaseQuerySchema,
} from './purchase.schema.js';

export const purchaseRouter = Router();
export const supplierRouter = Router();

supplierRouter.use(requireAuth);
supplierRouter.get('/', PurchaseController.getSuppliers);
supplierRouter.post('/', validate(createSupplierSchema), PurchaseController.createSupplier);

purchaseRouter.use(requireAuth);
purchaseRouter.get('/', validate(purchaseQuerySchema), PurchaseController.getPurchases);
purchaseRouter.post('/', validate(createPurchaseSchema), PurchaseController.createPurchase);
purchaseRouter.get('/:id', PurchaseController.getPurchaseById);
