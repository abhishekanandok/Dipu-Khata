import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export interface IPayment extends Document {
  paymentNumber: string;
  customerId: mongoose.Types.ObjectId;
  paymentDate: Date;
  amount: number; // In paise
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  relatedSaleId?: mongoose.Types.ObjectId;
  notes?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: {
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
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK', 'CHEQUE'],
      default: 'CASH',
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    relatedSaleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
    },
    notes: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
