import mongoose, { Document, Schema } from 'mongoose';

export type SalePaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type SaleDeliveryStatus = 'PENDING' | 'PARTIAL' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK';

export interface ISaleItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
  rate: number; // In paise
  lineTotal: number; // In paise
}

export interface ISalePayment {
  amount: number; // In paise
  method: PaymentMethod;
  referenceNumber?: string;
  date: Date;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerMobile: string;
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
  payments: ISalePayment[];
  estimateId?: mongoose.Types.ObjectId;
  autoStockDeduction: boolean;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  notes?: string;
  idempotencyKey?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
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

const SalePaymentSchema = new Schema<ISalePayment>(
  {
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK'],
      required: true,
      default: 'CASH',
    },
    referenceNumber: { type: String, trim: true },
    date: { type: Date, default: Date.now },
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
    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    items: {
      type: [SaleItemSchema],
      validate: {
        validator: (v: ISaleItem[]) => v && v.length > 0,
        message: 'A sale must have at least one line item',
      },
    },
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
    payments: [SalePaymentSchema],
    estimateId: {
      type: Schema.Types.ObjectId,
      ref: 'Estimate',
    },
    autoStockDeduction: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
      index: true,
    },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    notes: { type: String, trim: true },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
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

// Compound index for date-sorted customer sale history
SaleSchema.index({ customerId: 1, saleDate: -1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
