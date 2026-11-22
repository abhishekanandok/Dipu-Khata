import mongoose, { Document, Schema } from 'mongoose';

export type PurchasePaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type PurchasePaymentMethod = 'CASH' | 'BANK' | 'UPI' | 'CREDIT';

export interface IPurchaseItem {
  materialId: mongoose.Types.ObjectId;
  materialName: string;
  quantity: number;
  unit: string;
  rate: number; // In paise
  lineTotal: number; // In paise
}

export interface IPurchase extends Document {
  invoiceNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  purchaseDate: Date;
  items: IPurchaseItem[];
  subtotal: number; // In paise
  transportCharges: number; // In paise
  otherCharges: number; // In paise
  totalAmount: number; // In paise
  amountPaid: number; // In paise
  balanceDue: number; // In paise
  paymentStatus: PurchasePaymentStatus;
  paymentMethod: PurchasePaymentMethod;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    items: [PurchaseItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    transportCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'UNPAID'],
      default: 'UNPAID',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK', 'UPI', 'CREDIT'],
      default: 'CREDIT',
    },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

PurchaseSchema.index({ purchaseDate: -1, _id: -1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
