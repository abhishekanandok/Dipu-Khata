import mongoose, { Document, Schema } from 'mongoose';

export type BalanceType = 'RECEIVABLE' | 'PAYABLE';

export interface ICustomer extends Document {
  name: string;
  mobile: string;
  village?: string;
  address?: string;
  notes?: string;
  openingBalance: number; // In paise
  openingBalanceType: BalanceType;
  currentBalance: number; // In paise (Positive = Customer owes business, Negative = Business owes customer)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    village: {
      type: String,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    openingBalanceType: {
      type: String,
      enum: ['RECEIVABLE', 'PAYABLE'],
      default: 'RECEIVABLE',
    },
    currentBalance: {
      type: Number,
      default: 0,
      index: true,
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

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
