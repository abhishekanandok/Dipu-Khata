import mongoose, { Document, Schema } from 'mongoose';

export type MaterialUnit = 'CFT' | 'TON' | 'BAG' | 'KG' | 'PIECE' | 'TRIP' | 'CUSTOM';

export interface IMaterial extends Document {
  name: string;
  hindiName?: string;
  category: string;
  defaultUnit: MaterialUnit;
  sellingRate: number; // In paise
  purchaseRate: number; // In paise
  currentStock: number;
  minimumStockAlert: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    name: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
      index: true,
    },
    hindiName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    defaultUnit: {
      type: String,
      enum: ['CFT', 'TON', 'BAG', 'KG', 'PIECE', 'TRIP', 'CUSTOM'],
      default: 'CFT',
    },
    sellingRate: {
      type: Number,
      required: true,
      default: 0,
    },
    purchaseRate: {
      type: Number,
      required: true,
      default: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
      index: true,
    },
    minimumStockAlert: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Material = mongoose.model<IMaterial>('Material', MaterialSchema);
