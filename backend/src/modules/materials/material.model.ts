import mongoose, { Document, Schema } from 'mongoose';

export type MaterialUnit = 'CFT' | 'TON' | 'BAG' | 'KG' | 'PIECE' | 'TRIP' | 'CUSTOM';

export interface IAlternativeUnit {
  unit: string;
  conversionFactor: number; // e.g. 1 Ton = 25 CFT -> factor = 25
}

export interface IMaterial extends Document {
  name: string;
  hindiName?: string;
  categoryId?: mongoose.Types.ObjectId;
  categoryName: string;
  sku?: string;
  brand?: string;
  description?: string;
  defaultUnit: MaterialUnit;
  alternativeUnits: IAlternativeUnit[];
  purchaseRate: number; // In paise
  sellingRate: number; // In paise
  currentStock: number;
  minimumStockAlert: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlternativeUnitSchema = new Schema<IAlternativeUnit>(
  {
    unit: { type: String, required: true },
    conversionFactor: { type: Number, required: true },
  },
  { _id: false }
);

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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
      index: true,
      default: 'General',
    },
    sku: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    defaultUnit: {
      type: String,
      enum: ['CFT', 'TON', 'BAG', 'KG', 'PIECE', 'TRIP', 'CUSTOM'],
      default: 'CFT',
      required: true,
    },
    alternativeUnits: [AlternativeUnitSchema],
    purchaseRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sellingRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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

MaterialSchema.index({ name: 'text', brand: 'text', hindiName: 'text' });

export const Material = mongoose.model<IMaterial>('Material', MaterialSchema);
