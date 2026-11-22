import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const deliveryRouter = Router();
export const driverRouter = Router();
export const vehicleRouter = Router();

// Driver routes
driverRouter.use(requireAuth);
driverRouter.get('/', DeliveryController.getDrivers);
driverRouter.post('/', DeliveryController.createDriver);

// Vehicle routes
vehicleRouter.use(requireAuth);
vehicleRouter.get('/', DeliveryController.getVehicles);
vehicleRouter.post('/', DeliveryController.createVehicle);

// Delivery Challan routes
deliveryRouter.use(requireAuth);
deliveryRouter.get('/', DeliveryController.getDeliveries);
deliveryRouter.post('/', DeliveryController.createDelivery);
deliveryRouter.get('/:id', DeliveryController.getDeliveryById);
