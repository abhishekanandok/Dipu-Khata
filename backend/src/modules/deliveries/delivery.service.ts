import mongoose from 'mongoose';
import { Delivery, IDelivery } from './delivery.model.js';
import { Driver, IDriver } from './driver.model.js';
import { Vehicle, IVehicle } from './vehicle.model.js';
import { Sale } from '../sales/sale.model.js';
import { Material } from '../materials/material.model.js';
import { StockMovement } from '../inventory/stockMovement.model.js';
import { getNextDocumentNumber } from '../sales/documentSequence.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  CreateDriverInput,
  CreateVehicleInput,
  CreateDeliveryInput,
  DeliveryQueryParams,
} from './delivery.schema.js';

export class DeliveryService {
  // Driver Operations
  static async createDriver(input: CreateDriverInput): Promise<IDriver> {
    const driver = new Driver({
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      licenseNumber: input.licenseNumber?.trim(),
      address: input.address?.trim(),
    });
    await driver.save();
    return driver;
  }

  static async getDrivers(): Promise<any[]> {
    return Driver.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  // Vehicle Operations
  static async createVehicle(input: CreateVehicleInput): Promise<IVehicle> {
    const existing = await Vehicle.findOne({ vehicleNumber: input.vehicleNumber.trim().toUpperCase() });
    if (existing) {
      throw new AppError('Vehicle with this number already registered', 409);
    }

    const vehicle = new Vehicle({
      vehicleNumber: input.vehicleNumber.trim().toUpperCase(),
      vehicleType: input.vehicleType,
      capacity: input.capacity?.trim(),
      notes: input.notes?.trim(),
    });
    await vehicle.save();
    return vehicle;
  }

  static async getVehicles(): Promise<any[]> {
    return Vehicle.find({ isActive: true }).sort({ vehicleNumber: 1 }).lean();
  }

  // Delivery Challan Operations
  static async createDelivery(input: CreateDeliveryInput, userId?: string): Promise<IDelivery> {
    // 1. Validate Sale
    const sale = await Sale.findById(input.saleId);
    if (!sale) {
      throw new AppError('Sale invoice not found', 404);
    }
    if (sale.isCancelled) {
      throw new AppError('Cannot dispatch goods for a cancelled sale bill', 400);
    }

    // 2. Validate Driver & Vehicle
    let driverName = input.driverName;
    let driverMobile = input.driverMobile;
    let vehicleNumber = input.vehicleNumber;

    if (input.driverId) {
      const driver = await Driver.findById(input.driverId);
      if (driver) {
        driverName = driver.name;
        driverMobile = driver.mobile;
      }
    }

    if (input.vehicleId) {
      const vehicle = await Vehicle.findById(input.vehicleId);
      if (vehicle) {
        vehicleNumber = vehicle.vehicleNumber;
      }
    }

    // 3. Resolve and Validate Materials
    const materialIds = input.items.map((i) => i.materialId);
    const materials = await Material.find({ _id: { $in: materialIds } });
    const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));

    for (const item of input.items) {
      if (!materialMap.has(item.materialId)) {
        throw new AppError(`Material ID ${item.materialId} not found`, 404);
      }
    }

    const resolvedItems = input.items.map((item) => {
      const mat = materialMap.get(item.materialId)!;
      return {
        materialId: mat._id as mongoose.Types.ObjectId,
        materialName: mat.name,
        quantity: item.quantity,
        unit: item.unit || mat.defaultUnit,
      };
    });

    // 4. Generate Challan Number (e.g. CH-2611-0001)
    const challanNumber = await getNextDocumentNumber('CHALLAN', 'CH');
    const dispatchDate = input.dispatchDate ? new Date(input.dispatchDate) : new Date();

    // 5. Create Delivery Challan
    const delivery = new Delivery({
      challanNumber,
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerMobile: sale.customerMobile,
      driverId: input.driverId ? new mongoose.Types.ObjectId(input.driverId) : undefined,
      driverName: driverName?.trim(),
      driverMobile: driverMobile?.trim(),
      vehicleId: input.vehicleId ? new mongoose.Types.ObjectId(input.vehicleId) : undefined,
      vehicleNumber: vehicleNumber?.trim(),
      deliveryAddress: input.deliveryAddress.trim(),
      items: resolvedItems,
      dispatchDate,
      status: 'DISPATCHED',
      notes: input.notes?.trim(),
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await delivery.save();

    // 6. Deduct Stock & Write Stock Movement Audit Logs
    for (const item of resolvedItems) {
      const mat = materialMap.get(item.materialId.toString())!;
      const prevStock = mat.currentStock;
      mat.currentStock = Math.round((mat.currentStock - item.quantity) * 100) / 100;
      await mat.save();

      const movement = new StockMovement({
        materialId: mat._id,
        materialName: mat.name,
        date: dispatchDate,
        movementType: 'SALE_DISPATCH',
        quantity: item.quantity,
        unit: item.unit,
        referenceType: 'DELIVERY',
        referenceId: challanNumber,
        previousStock: prevStock,
        newStock: mat.currentStock,
        reason: `Challan #${challanNumber} for Sale #${sale.invoiceNumber}`,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
      await movement.save();
    }

    // 7. Update Sale Fulfillment Status (Multi-trip delivery tracking)
    const allDeliveries = await Delivery.find({
      saleId: sale._id,
      status: { $ne: 'CANCELLED' },
    }).lean();

    const dispatchedTotals = new Map<string, number>();
    for (const d of allDeliveries) {
      for (const itm of d.items) {
        const key = itm.materialId.toString();
        dispatchedTotals.set(key, (dispatchedTotals.get(key) || 0) + itm.quantity);
      }
    }

    let allFulfilled = true;
    for (const saleItem of sale.items) {
      const totalDispatched = dispatchedTotals.get(saleItem.materialId.toString()) || 0;
      if (totalDispatched < saleItem.quantity) {
        allFulfilled = false;
        break;
      }
    }

    sale.deliveryStatus = allFulfilled ? 'DELIVERED' : 'PARTIAL';
    await sale.save();

    return delivery;
  }

  static async getDeliveries(query: DeliveryQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { challanNumber: searchRegex },
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { driverName: searchRegex },
        { vehicleNumber: searchRegex },
      ];
    }

    if (query.saleId) {
      filter.saleId = new mongoose.Types.ObjectId(query.saleId);
    }

    if (query.customerId) {
      filter.customerId = new mongoose.Types.ObjectId(query.customerId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.startDate || query.endDate) {
      filter.dispatchDate = {};
      if (query.startDate) filter.dispatchDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.dispatchDate.$lte = new Date(query.endDate);
    }

    const [deliveries, totalCount] = await Promise.all([
      Delivery.find(filter)
        .sort({ dispatchDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    return {
      deliveries,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  static async getDeliveryById(id: string): Promise<IDelivery> {
    const delivery = await Delivery.findById(id)
      .populate('customerId', 'name mobile village address')
      .populate('driverId', 'name mobile licenseNumber')
      .populate('vehicleId', 'vehicleNumber vehicleType capacity')
      .populate('saleId', 'invoiceNumber grandTotal paymentStatus deliveryStatus');

    if (!delivery) {
      throw new AppError('Delivery challan not found', 404);
    }
    return delivery;
  }
}
