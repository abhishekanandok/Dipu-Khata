import mongoose from 'mongoose';
import { Expense, IExpense } from './expense.model.js';
import { getNextDocumentNumber } from '../sales/documentSequence.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import { CreateExpenseInput, ExpenseQueryParams } from './expense.schema.js';

export class ExpenseService {
  static async createExpense(input: CreateExpenseInput, userId?: string): Promise<IExpense> {
    const expenseNumber = await getNextDocumentNumber('EXPENSE', 'EXP');

    const expense = new Expense({
      expenseNumber,
      category: input.category,
      amount: Math.round(input.amount),
      date: input.date ? new Date(input.date) : new Date(),
      paymentMethod: input.paymentMethod,
      paidTo: input.paidTo,
      notes: input.notes,
      receiptUrl: input.receiptUrl,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await expense.save();
    return expense;
  }

  static async getExpenses(query: ExpenseQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = { isCancelled: false };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { expenseNumber: searchRegex },
        { paidTo: searchRegex },
        { notes: searchRegex },
      ];
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.paymentMethod) {
      filter.paymentMethod = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = new Date(query.startDate);
      if (query.endDate) filter.date.$lte = new Date(query.endDate);
    }

    const [expenses, totalCount, summaryAgg, categoryAgg] = await Promise.all([
      Expense.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let totalExpenses = 0;
    let cashExpenses = 0;
    let digitalExpenses = 0;

    for (const s of summaryAgg) {
      totalExpenses += s.total;
      if (s._id === 'CASH') cashExpenses += s.total;
      else digitalExpenses += s.total;
    }

    return {
      expenses,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      summary: {
        totalExpenses,
        cashExpenses,
        digitalExpenses,
        byCategory: categoryAgg.map((c) => ({
          category: c._id,
          total: c.total,
          count: c.count,
        })),
      },
    };
  }

  static async cancelExpense(id: string): Promise<IExpense> {
    const expense = await Expense.findById(id);
    if (!expense) {
      throw new AppError('Expense not found', 404);
    }
    if (expense.isCancelled) {
      throw new AppError('Expense is already cancelled', 400);
    }
    expense.isCancelled = true;
    await expense.save();
    return expense;
  }
}
