import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceHistory extends Document {
  materialId: mongoose.Types.ObjectId;
  effectiveDate: Date;
  oldSellingRate: number; // In paise
  newSellingRate: number; // In paise
  oldPurchaseRate: number; // In paise
  newPurchaseRate: number; // In paise
  reason?: string;
  changedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    oldSellingRate: {
      type: Number,
      required: true,
    },
    newSellingRate: {
      type: Number,
      required: true,
    },
    oldPurchaseRate: {
      type: Number,
      required: true,
    },
    newPurchaseRate: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

PriceHistorySchema.index({ materialId: 1, effectiveDate: -1 });

export const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
