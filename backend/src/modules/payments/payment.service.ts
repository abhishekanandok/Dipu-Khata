import mongoose from 'mongoose';
import { Payment, IPayment } from './payment.model.js';
import { Customer } from '../customers/customer.model.js';
import { LedgerEntry } from '../ledger/ledger.model.js';
import { Sale } from '../sales/sale.model.js';
import { Expense } from '../expenses/expense.model.js';
import { getNextDocumentNumber } from '../sales/documentSequence.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  CreatePaymentInput,
  PaymentQueryParams,
  CashBookQueryParams,
} from './payment.schema.js';

export class PaymentService {
  /**
   * Records a standalone customer payment, credits the customer's ledger, and optionally updates related sale.
   */
  static async createPayment(input: CreatePaymentInput, userId?: string): Promise<IPayment> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) {
        return existing;
      }
    }

    // 2. Validate Customer
    const customer = await Customer.findById(input.customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const paymentAmount = Math.round(input.amount);
    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

    // 3. Generate Sequential Payment Number (e.g. PAY-2611-0001)
    const paymentNumber = await getNextDocumentNumber('PAYMENT', 'PAY');

    // 4. Create and Save Payment Document
    const payment = new Payment({
      paymentNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      paymentDate,
      amount: paymentAmount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber?.trim(),
      relatedSaleId: input.relatedSaleId ? new mongoose.Types.ObjectId(input.relatedSaleId) : undefined,
      notes: input.notes?.trim(),
      idempotencyKey: input.idempotencyKey,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await payment.save();

    // 5. Update Customer Ledger & Balance
    customer.currentBalance -= paymentAmount;
    customer.lastTransactionDate = paymentDate;

    const refInfo = input.referenceNumber ? `• Ref: ${input.referenceNumber}` : '';
    const description = `Payment Received (${input.paymentMethod}) ${refInfo}`.trim();

    const ledgerEntry = new LedgerEntry({
      customerId: customer._id,
      date: paymentDate,
      entryType: 'PAYMENT',
      referenceType: 'PAYMENT',
      referenceId: paymentNumber,
      description,
      debit: 0,
      credit: paymentAmount,
      runningBalance: customer.currentBalance,
      notes: input.notes,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await ledgerEntry.save();
    await customer.save();

    // 6. If linked to a specific Sale invoice, update the sale's payment tracking
    if (input.relatedSaleId) {
      const sale = await Sale.findById(input.relatedSaleId);
      if (sale) {
        sale.amountPaid += paymentAmount;
        sale.balanceDue = Math.max(0, sale.grandTotal - sale.amountPaid);
        if (sale.balanceDue === 0 && sale.grandTotal > 0) {
          sale.paymentStatus = 'PAID';
        } else if (sale.amountPaid > 0) {
          sale.paymentStatus = 'PARTIAL';
        }

        sale.payments.push({
          amount: paymentAmount,
          method: (input.paymentMethod === 'CHEQUE' ? 'BANK' : input.paymentMethod) as 'CASH' | 'UPI' | 'BANK',
          referenceNumber: input.referenceNumber,
          date: paymentDate,
        });

        await sale.save();
      }
    }

    return payment;
  }

  /**
   * Retrieves paginated payments list with method filters and financial aggregation summary.
   */
  static async getPayments(query: PaymentQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { paymentNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
        { referenceNumber: searchRegex },
      ];
    }

    if (query.customerId) {
      filter.customerId = new mongoose.Types.ObjectId(query.customerId);
    }

    if (query.paymentMethod) {
      filter.paymentMethod = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      filter.paymentDate = {};
      if (query.startDate) filter.paymentDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.paymentDate.$lte = new Date(query.endDate);
    }

    const [payments, totalCount, summaryAgg] = await Promise.all([
      Payment.find(filter).sort({ paymentDate: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    let totalCollected = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let bankCollected = 0;

    for (const item of summaryAgg) {
      totalCollected += item.total;
      if (item._id === 'CASH') cashCollected += item.total;
      else if (item._id === 'UPI') upiCollected += item.total;
      else if (item._id === 'BANK' || item._id === 'CHEQUE') bankCollected += item.total;
    }

    return {
      payments,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      summary: {
        totalCollected,
        cashCollected,
        upiCollected,
        bankCollected,
      },
    };
  }

  /**
   * Retrieves single payment details.
   */
  static async getPaymentById(id: string): Promise<IPayment> {
    const payment = await Payment.findById(id)
      .populate('customerId', 'name mobile village currentBalance')
      .populate('relatedSaleId', 'invoiceNumber grandTotal amountPaid balanceDue');

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    return payment;
  }

  /**
   * Reconciles daily cash book: segregates physical cash in drawer from bank/UPI collections.
   */
  static async getCashBook(query: CashBookQueryParams) {
    let start: Date;
    let end: Date;

    if (query.startDate && query.endDate) {
      start = new Date(query.startDate);
      end = new Date(query.endDate);
    } else if (query.date) {
      start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      end = new Date(query.date);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // 1. Inflow from Sales payments during this period
    const sales = await Sale.find({
      saleDate: { $gte: start, $lte: end },
      isCancelled: false,
    }).lean();

    let cashSalesTotal = 0;
    let upiSalesTotal = 0;
    let bankSalesTotal = 0;
    const saleTransactions: any[] = [];

    for (const sale of sales) {
      for (const p of sale.payments || []) {
        if (p.method === 'CASH') {
          cashSalesTotal += p.amount;
        } else if (p.method === 'UPI') {
          upiSalesTotal += p.amount;
        } else if (p.method === 'BANK') {
          bankSalesTotal += p.amount;
        }

        saleTransactions.push({
          type: 'SALE_PAYMENT',
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName,
          method: p.method,
          amount: p.amount,
          date: p.date || sale.saleDate,
        });
      }
    }

    // 2. Inflow from Standalone Debt Collections / Payments during this period
    const payments = await Payment.find({
      paymentDate: { $gte: start, $lte: end },
    }).lean();

    let cashCollectionsTotal = 0;
    let upiCollectionsTotal = 0;
    let bankCollectionsTotal = 0;
    const paymentTransactions: any[] = [];

    for (const p of payments) {
      if (p.paymentMethod === 'CASH') {
        cashCollectionsTotal += p.amount;
      } else if (p.paymentMethod === 'UPI') {
        upiCollectionsTotal += p.amount;
      } else if (p.paymentMethod === 'BANK' || p.paymentMethod === 'CHEQUE') {
        bankCollectionsTotal += p.amount;
      }

      paymentTransactions.push({
        type: 'COLLECTION_PAYMENT',
        paymentNumber: p.paymentNumber,
        customerName: p.customerName,
        method: p.paymentMethod,
        amount: p.amount,
        referenceNumber: p.referenceNumber,
        date: p.paymentDate,
      });
    }

    // 3. Outflow from Business Expenses during this period
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end },
      isCancelled: false,
    }).lean();

    let cashExpensesTotal = 0;
    let digitalExpensesTotal = 0;
    const expenseTransactions: any[] = [];

    for (const exp of expenses) {
      if (exp.paymentMethod === 'CASH') {
        cashExpensesTotal += exp.amount;
      } else {
        digitalExpensesTotal += exp.amount;
      }

      expenseTransactions.push({
        type: 'EXPENSE_OUTFLOW',
        expenseNumber: exp.expenseNumber,
        customerName: `${exp.category}${exp.paidTo ? ` (${exp.paidTo})` : ''}`,
        method: exp.paymentMethod,
        amount: -exp.amount,
        date: exp.date,
      });
    }

    const totalCashInflow = cashSalesTotal + cashCollectionsTotal;
    const totalDigitalInflow = upiSalesTotal + upiCollectionsTotal + bankSalesTotal + bankCollectionsTotal;
    const totalInflow = totalCashInflow + totalDigitalInflow;
    const totalExpenses = cashExpensesTotal + digitalExpensesTotal;
    const netCashInDrawer = totalCashInflow - cashExpensesTotal;
    const netDigitalBalance = totalDigitalInflow - digitalExpensesTotal;
    const netCashFlow = totalInflow - totalExpenses;

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      cashDrawer: {
        cashSales: cashSalesTotal,
        cashCollections: cashCollectionsTotal,
        totalCashInflow,
        cashExpenses: cashExpensesTotal,
        netCashInDrawer,
      },
      digitalAccounts: {
        upiSales: upiSalesTotal,
        upiCollections: upiCollectionsTotal,
        bankSales: bankSalesTotal,
        bankCollections: bankCollectionsTotal,
        totalDigitalInflow,
        digitalExpenses: digitalExpensesTotal,
        netDigitalBalance,
      },
      summary: {
        totalCashInflow,
        totalDigitalInflow,
        totalInflow,
        totalExpenses,
        netCashFlow,
        transactionsCount:
          saleTransactions.length + paymentTransactions.length + expenseTransactions.length,
      },
      transactions: [...saleTransactions, ...paymentTransactions, ...expenseTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }

  /**
   * Returns aged outstanding receivables grouped by customer and age brackets (0-30, 31-60, 61+ days).
   */
  static async getOutstandingDues() {
    const customersWithDues = await Customer.find({
      isActive: true,
      currentBalance: { $gt: 0 },
    })
      .sort({ currentBalance: -1 })
      .lean();

    const now = new Date();
    let totalOutstanding = 0;
    let total0To30 = 0;
    let total31To60 = 0;
    let total61Plus = 0;

    const customers = customersWithDues.map((c) => {
      const balance = c.currentBalance;
      totalOutstanding += balance;

      const lastTxDate = c.lastTransactionDate ? new Date(c.lastTransactionDate) : new Date(c.createdAt);
      const diffMs = now.getTime() - lastTxDate.getTime();
      const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let bracket: '0-30' | '31-60' | '61+';
      if (ageDays <= 30) {
        bracket = '0-30';
        total0To30 += balance;
      } else if (ageDays <= 60) {
        bracket = '31-60';
        total31To60 += balance;
      } else {
        bracket = '61+';
        total61Plus += balance;
      }

      return {
        _id: c._id,
        name: c.name,
        mobile: c.mobile,
        village: c.village,
        currentBalance: balance,
        ageDays,
        bracket,
        lastTransactionDate: lastTxDate,
      };
    });

    return {
      summary: {
        totalOutstanding,
        totalCustomersWithDues: customers.length,
        agingBrackets: {
          bracket0To30: total0To30,
          bracket31To60: total31To60,
          bracket61Plus: total61Plus,
        },
      },
      customers,
    };
  }
}
