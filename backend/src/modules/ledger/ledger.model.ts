import mongoose, { Document, Schema } from 'mongoose';

export type LedgerEntryType =
  | 'OPENING_BALANCE'
  | 'SALE'
  | 'PAYMENT'
  | 'SALES_RETURN'
  | 'ADJUSTMENT';

export type LedgerReferenceType = 'SALE' | 'PAYMENT' | 'RETURN' | 'MANUAL';

export interface ILedgerEntry extends Document {
  customerId: mongoose.Types.ObjectId;
  date: Date;
  entryType: LedgerEntryType;
  referenceType: LedgerReferenceType;
  referenceId?: string;
  description: string;
  debit: number; // In paise (Amount customer owes the business)
  credit: number; // In paise (Amount customer paid to the business)
  runningBalance: number; // In paise (Net balance after this transaction)
  isReversed: boolean;
  reversalOf?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    entryType: {
      type: String,
      enum: ['OPENING_BALANCE', 'SALE', 'PAYMENT', 'SALES_RETURN', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    referenceType: {
      type: String,
      enum: ['SALE', 'PAYMENT', 'RETURN', 'MANUAL'],
      default: 'MANUAL',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    debit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    runningBalance: {
      type: Number,
      required: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalOf: {
      type: Schema.Types.ObjectId,
      ref: 'LedgerEntry',
    },
    notes: {
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

// Compound index for chronological ledger queries per customer
LedgerEntrySchema.index({ customerId: 1, date: -1, _id: -1 });

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
