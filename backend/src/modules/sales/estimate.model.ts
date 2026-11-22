import mongoose, { Document, Schema } from 'mongoose';

export type EstimateStatus = 'DRAFT' | 'SENT' | 'CONVERTED' | 'EXPIRED' | 'REJECTED';

export interface IEstimateItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
  rate: number; // In paise
  lineTotal: number; // In paise
}

export interface IEstimate extends Document {
  estimateNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerMobile: string;
  village?: string;
  estimateDate: Date;
  validUntil?: Date;
  items: IEstimateItem[];
  subtotal: number; // In paise
  discount: number; // In paise
  transportCharges: number; // In paise
  grandTotal: number; // In paise
  status: EstimateStatus;
  convertedSaleId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EstimateItemSchema = new Schema<IEstimateItem>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const EstimateSchema = new Schema<IEstimate>(
  {
    estimateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    village: {
      type: String,
      trim: true,
    },
    estimateDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    validUntil: {
      type: Date,
    },
    items: {
      type: [EstimateItemSchema],
      validate: {
        validator: (v: IEstimateItem[]) => v && v.length > 0,
        message: 'An estimate must have at least one line item',
      },
    },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'CONVERTED', 'EXPIRED', 'REJECTED'],
      default: 'DRAFT',
      index: true,
    },
    convertedSaleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
    },
    convertedAt: {
      type: Date,
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

EstimateSchema.index({ estimateDate: -1 });

export const Estimate = mongoose.model<IEstimate>('Estimate', EstimateSchema);
