import mongoose from 'mongoose';
import { Purchase, IPurchase, IPurchaseItem, PurchasePaymentStatus } from './purchase.model.js';
import { Supplier, ISupplier } from './supplier.model.js';
import { Material } from '../materials/material.model.js';
import { InventoryService } from '../inventory/inventory.service.js';
import {
  CreateSupplierInput,
  CreatePurchaseInput,
  PurchaseQueryParams,
} from './purchase.schema.js';

export class PurchaseService {
  static async createSupplier(input: CreateSupplierInput): Promise<ISupplier> {
    const supplier = new Supplier({
      name: input.name,
      companyName: input.companyName,
      mobile: input.mobile,
      address: input.address,
      notes: input.notes,
    });
    await supplier.save();
    return supplier;
  }

  static async getSuppliers(): Promise<any[]> {
    return Supplier.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  static async createPurchase(input: CreatePurchaseInput, userId?: string): Promise<IPurchase> {
    const supplier = await Supplier.findById(input.supplierId);
    if (!supplier || !supplier.isActive) {
      const error = new Error('Supplier not found or inactive');
      (error as any).statusCode = 404;
      throw error;
    }

    // Process line items and compute subtotal
    const processedItems: IPurchaseItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const material = await Material.findById(item.materialId);
      if (!material) {
        const error = new Error(`Material with ID ${item.materialId} not found`);
        (error as any).statusCode = 404;
        throw error;
      }

      const qty = item.quantity;
      const rate = Math.round(item.rate);
      const lineTotal = Math.round(qty * rate);
      subtotal += lineTotal;

      processedItems.push({
        materialId: material._id as mongoose.Types.ObjectId,
        materialName: material.name,
        quantity: qty,
        unit: item.unit || material.defaultUnit,
        rate,
        lineTotal,
      });
    }

    const transportCharges = Math.round(input.transportCharges || 0);
    const otherCharges = Math.round(input.otherCharges || 0);
    const totalAmount = subtotal + transportCharges + otherCharges;
    const amountPaid = Math.round(input.amountPaid || 0);
    const balanceDue = Math.max(0, totalAmount - amountPaid);

    let paymentStatus: PurchasePaymentStatus = 'UNPAID';
    if (amountPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // 1. Create Purchase Record
    const purchase = new Purchase({
      invoiceNumber: input.invoiceNumber,
      supplierId: supplier._id,
      supplierName: supplier.companyName
        ? `${supplier.name} (${supplier.companyName})`
        : supplier.name,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
      items: processedItems,
      subtotal,
      transportCharges,
      otherCharges,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentStatus,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await purchase.save();

    // 2. Increment Material Stock & Record Inward Stock Movements
    for (const item of processedItems) {
      await InventoryService.recordStockMovement({
        materialId: item.materialId,
        movementType: 'PURCHASE',
        quantity: item.quantity,
        referenceType: 'PURCHASE',
        referenceId: purchase.invoiceNumber,
        reason: `Inward Stock: Bill #${purchase.invoiceNumber} from ${supplier.name}`,
        userId,
      });
    }

    // 3. Update Supplier Payable Balance if there is an unpaid amount
    if (balanceDue > 0) {
      supplier.currentBalance += balanceDue;
      await supplier.save();
    }

    return purchase;
  }

  static async getPurchases(query: PurchaseQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const filterConditions: any = {};

    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filterConditions.$or = [{ invoiceNumber: regex }, { supplierName: regex }];
    }

    if (query.supplierId) {
      filterConditions.supplierId = new mongoose.Types.ObjectId(query.supplierId);
    }

    if (query.paymentStatus) {
      filterConditions.paymentStatus = query.paymentStatus;
    }

    if (query.startDate || query.endDate) {
      filterConditions.purchaseDate = {};
      if (query.startDate) filterConditions.purchaseDate.$gte = new Date(query.startDate);
      if (query.endDate) filterConditions.purchaseDate.$lte = new Date(query.endDate);
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(filterConditions)
        .sort({ purchaseDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filterConditions),
    ]);

    return {
      purchases,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPurchaseById(id: string): Promise<IPurchase> {
    const purchase = await Purchase.findById(id).populate('supplierId', 'name mobile address companyName');
    if (!purchase) {
      const error = new Error('Purchase record not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return purchase;
  }
}
