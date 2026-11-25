import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory =
  | 'TRANSPORT'
  | 'FUEL'
  | 'LABOUR'
  | 'MAINTENANCE'
  | 'SHOP'
  | 'MISC';

export type ExpensePaymentMethod = 'CASH' | 'UPI' | 'BANK';

export interface IExpense extends Document {
  expenseNumber: string;
  category: ExpenseCategory;
  amount: number; // In paise
  date: Date;
  paymentMethod: ExpensePaymentMethod;
  paidTo?: string;
  notes?: string;
  receiptUrl?: string;
  isCancelled: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['TRANSPORT', 'FUEL', 'LABOUR', 'MAINTENANCE', 'SHOP', 'MISC'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1, // In paise
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK'],
      default: 'CASH',
      index: true,
    },
    paidTo: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    isCancelled: {
      type: Boolean,
      default: false,
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

ExpenseSchema.index({ date: -1, category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
