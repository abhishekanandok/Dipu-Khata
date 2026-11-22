import { Router } from 'express';
import { CustomerController } from './customer.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  ledgerQuerySchema,
  createAdjustmentSchema,
} from './customer.schema.js';

export const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get('/', validate(customerQuerySchema), CustomerController.getCustomers);
customerRouter.post('/', validate(createCustomerSchema), CustomerController.createCustomer);
customerRouter.get('/:id', CustomerController.getCustomerById);
customerRouter.put('/:id', validate(updateCustomerSchema), CustomerController.updateCustomer);
customerRouter.get('/:id/ledger', validate(ledgerQuerySchema), CustomerController.getCustomerLedger);
customerRouter.get('/:id/summary', CustomerController.getCustomerSummary);
customerRouter.post('/:id/adjustment', validate(createAdjustmentSchema), CustomerController.addAdjustment);
