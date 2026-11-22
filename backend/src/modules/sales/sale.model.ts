import mongoose, { Document, Schema } from 'mongoose';

export type SalePaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type SaleDeliveryStatus = 'PENDING' | 'PARTIAL' | 'DELIVERED';

export interface ISaleItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
  rate: number; // In paise
  lineTotal: number; // In paise
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  saleDate: Date;
  items: ISaleItem[];
  subtotal: number; // In paise
  discount: number; // In paise
  transportCharges: number; // In paise
  grandTotal: number; // In paise
  amountPaid: number; // In paise
  balanceDue: number; // In paise
  paymentStatus: SalePaymentStatus;
  deliveryStatus: SaleDeliveryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    rate: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'UNPAID'],
      default: 'UNPAID',
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'DELIVERED'],
      default: 'PENDING',
      index: true,
    },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
