import { Router } from 'express';
import { MaterialController } from './material.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  createCategorySchema,
  createMaterialSchema,
  updateMaterialSchema,
  materialQuerySchema,
} from './material.schema.js';

export const materialRouter = Router();
export const categoryRouter = Router();

// Category routes
categoryRouter.use(requireAuth);
categoryRouter.get('/', MaterialController.getCategories);
categoryRouter.post('/', validate(createCategorySchema), MaterialController.createCategory);

// Material catalog routes
materialRouter.use(requireAuth);
materialRouter.get('/', validate(materialQuerySchema), MaterialController.getMaterials);
materialRouter.post('/', validate(createMaterialSchema), MaterialController.createMaterial);
materialRouter.get('/:id', MaterialController.getMaterialById);
materialRouter.put('/:id', validate(updateMaterialSchema), MaterialController.updateMaterial);
materialRouter.get('/:id/price-history', MaterialController.getPriceHistory);
