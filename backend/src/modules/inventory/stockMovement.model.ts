import mongoose, { Document, Schema } from 'mongoose';

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE_DISPATCH'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'DAMAGE'
  | 'WASTAGE';

export type StockReferenceType = 'PURCHASE' | 'SALE' | 'DELIVERY' | 'MANUAL';

export interface IStockMovement extends Document {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  date: Date;
  movementType: StockMovementType;
  quantity: number; // Always positive magnitude
  unit: string;
  referenceType: StockReferenceType;
  referenceId?: string;
  previousStock: number;
  newStock: number;
  reason?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    materialName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    movementType: {
      type: String,
      enum: [
        'OPENING_STOCK',
        'PURCHASE',
        'SALE_DISPATCH',
        'PURCHASE_RETURN',
        'SALE_RETURN',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_SUB',
        'DAMAGE',
        'WASTAGE',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    unit: {
      type: String,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'DELIVERY', 'MANUAL'],
      default: 'MANUAL',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

StockMovementSchema.index({ materialId: 1, date: -1, _id: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
