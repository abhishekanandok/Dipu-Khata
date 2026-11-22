import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  stockAdjustmentSchema,
  stockMovementQuerySchema,
} from './inventory.schema.js';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get('/', InventoryController.getOverview);
inventoryRouter.get('/movements', validate(stockMovementQuerySchema), InventoryController.getMovements);
inventoryRouter.get('/:materialId', InventoryController.getMaterialStock);
inventoryRouter.post('/adjustments', validate(stockAdjustmentSchema), InventoryController.adjustStock);
