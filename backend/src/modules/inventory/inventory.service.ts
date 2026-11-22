import mongoose from 'mongoose';
import { Material } from '../materials/material.model.js';
import { StockMovement, IStockMovement, StockMovementType, StockReferenceType } from './stockMovement.model.js';
import { StockAdjustmentInput, StockMovementQueryParams } from './inventory.schema.js';

export class InventoryService {
  /**
   * Core atomic stock movement recorder
   * Updates Material.currentStock and writes an immutable StockMovement entry
   */
  static async recordStockMovement(params: {
    materialId: string | mongoose.Types.ObjectId;
    movementType: StockMovementType;
    quantity: number;
    referenceType?: StockReferenceType;
    referenceId?: string;
    reason?: string;
    userId?: string | mongoose.Types.ObjectId;
  }): Promise<IStockMovement> {
    const material = await Material.findById(params.materialId);
    if (!material) {
      const error = new Error('Material not found for stock movement');
      (error as any).statusCode = 404;
      throw error;
    }

    const previousStock = material.currentStock;
    const qty = Math.abs(params.quantity);
    let newStock = previousStock;

    const isAdditive = [
      'OPENING_STOCK',
      'PURCHASE',
      'SALE_RETURN',
      'ADJUSTMENT_ADD',
    ].includes(params.movementType);

    if (isAdditive) {
      newStock = previousStock + qty;
    } else {
      // Deductive movements (SALE_DISPATCH, PURCHASE_RETURN, ADJUSTMENT_SUB, DAMAGE, WASTAGE)
      newStock = previousStock - qty;
    }

    // Update material current stock
    material.currentStock = newStock;
    await material.save();

    // Create append-only stock movement record
    const movement = new StockMovement({
      materialId: material._id,
      materialName: material.name,
      date: new Date(),
      movementType: params.movementType,
      quantity: qty,
      unit: material.defaultUnit,
      referenceType: params.referenceType || 'MANUAL',
      referenceId: params.referenceId,
      previousStock,
      newStock,
      reason: params.reason || params.movementType,
      createdBy: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
    });

    await movement.save();
    return movement;
  }

  static async adjustStock(input: StockAdjustmentInput, userId?: string): Promise<IStockMovement> {
    let movementType: StockMovementType = 'ADJUSTMENT_ADD';
    if (input.type === 'SUBTRACT') movementType = 'ADJUSTMENT_SUB';
    if (input.type === 'DAMAGE') movementType = 'DAMAGE';
    if (input.type === 'WASTAGE') movementType = 'WASTAGE';

    return this.recordStockMovement({
      materialId: input.materialId,
      movementType,
      quantity: input.quantity,
      referenceType: 'MANUAL',
      reason: input.reason,
      userId,
    });
  }

  static async getStockOverview() {
    const [stats, lowStockItems] = await Promise.all([
      Material.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValuation: {
              $sum: { $multiply: ['$currentStock', '$purchaseRate'] },
            },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ['$currentStock', '$minimumStockAlert'] }, 1, 0],
              },
            },
          },
        },
      ]),
      Material.find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minimumStockAlert'] },
      })
        .select('name hindiName categoryName currentStock defaultUnit minimumStockAlert purchaseRate')
        .limit(20)
        .lean(),
    ]);

    const overview = stats[0] || {
      totalItems: 0,
      totalValuation: 0,
      lowStockCount: 0,
    };

    return {
      totalItems: overview.totalItems,
      totalValuation: overview.totalValuation, // In paise
      lowStockCount: overview.lowStockCount,
      lowStockAlerts: lowStockItems,
    };
  }

  static async getStockMovements(query: StockMovementQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const match: any = {};
    if (query.materialId) {
      match.materialId = new mongoose.Types.ObjectId(query.materialId);
    }
    if (query.movementType) {
      match.movementType = query.movementType;
    }
    if (query.startDate || query.endDate) {
      match.date = {};
      if (query.startDate) match.date.$gte = new Date(query.startDate);
      if (query.endDate) match.date.$lte = new Date(query.endDate);
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(match)
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockMovement.countDocuments(match),
    ]);

    return {
      movements,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMaterialStock(materialId: string) {
    const material = await Material.findById(materialId);
    if (!material) {
      const error = new Error('Material not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const recentMovements = await StockMovement.find({ materialId: material._id })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    return {
      material: {
        id: material._id.toString(),
        name: material.name,
        hindiName: material.hindiName,
        categoryName: material.categoryName,
        currentStock: material.currentStock,
        defaultUnit: material.defaultUnit,
        minimumStockAlert: material.minimumStockAlert,
        purchaseRate: material.purchaseRate,
        sellingRate: material.sellingRate,
        totalValuation: material.currentStock * material.purchaseRate,
      },
      recentMovements,
    };
  }
}
