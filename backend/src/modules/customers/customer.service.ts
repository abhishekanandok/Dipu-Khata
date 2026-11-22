import mongoose from 'mongoose';
import { Customer, ICustomer } from './customer.model.js';
import { LedgerEntry, ILedgerEntry } from '../ledger/ledger.model.js';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  LedgerQueryParams,
  CreateAdjustmentInput,
} from './customer.schema.js';

export class CustomerService {
  static async createCustomer(
    input: CreateCustomerInput,
    userId?: string
  ): Promise<{ customer: ICustomer; initialEntry?: ILedgerEntry }> {
    const openingBalance = Math.round(input.openingBalance || 0);
    const isReceivable = input.openingBalanceType === 'RECEIVABLE';
    const initialBalance = isReceivable ? openingBalance : -openingBalance;

    const customer = new Customer({
      name: input.name,
      mobile: input.mobile,
      village: input.village,
      address: input.address,
      notes: input.notes,
      openingBalance,
      openingBalanceType: input.openingBalanceType,
      currentBalance: initialBalance,
      lastTransactionDate: new Date(),
    });

    await customer.save();

    let initialEntry: ILedgerEntry | undefined;

    // If there is an opening balance, create the initial immutable ledger entry
    if (openingBalance > 0) {
      initialEntry = new LedgerEntry({
        customerId: customer._id,
        date: new Date(),
        entryType: 'OPENING_BALANCE',
        referenceType: 'MANUAL',
        description: isReceivable
          ? 'Opening Balance / पुरानी बाकी (Receivable)'
          : 'Opening Advance / पुराना जमा (Payable)',
        debit: isReceivable ? openingBalance : 0,
        credit: isReceivable ? 0 : openingBalance,
        runningBalance: initialBalance,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });

      await initialEntry.save();
    }

    return { customer, initialEntry };
  }

  static async getCustomers(query: CustomerQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const filterConditions: any = { isActive: true };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filterConditions.$or = [
        { name: searchRegex },
        { mobile: searchRegex },
        { village: searchRegex },
      ];
    }

    if (query.village) {
      filterConditions.village = new RegExp(query.village.trim(), 'i');
    }

    if (query.filter === 'with_dues') {
      filterConditions.currentBalance = { $gt: 0 };
    } else if (query.filter === 'zero_balance') {
      filterConditions.currentBalance = 0;
    } else if (query.filter === 'advance') {
      filterConditions.currentBalance = { $lt: 0 };
    }

    const [customers, total] = await Promise.all([
      Customer.find(filterConditions)
        .sort({ currentBalance: -1, lastTransactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filterConditions),
    ]);

    // Aggregate summary for all active customers
    const balanceAgg = await Customer.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalReceivables: {
            $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0] },
          },
          totalPayables: {
            $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, '$currentBalance', 0] },
          },
          duesCount: {
            $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = balanceAgg[0] || {
      totalReceivables: 0,
      totalPayables: 0,
      duesCount: 0,
    };

    return {
      customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalReceivables: summary.totalReceivables,
        totalPayables: Math.abs(summary.totalPayables),
        customersWithDuesCount: summary.duesCount,
      },
    };
  }

  static async getCustomerById(id: string): Promise<ICustomer> {
    const customer = await Customer.findById(id);
    if (!customer || !customer.isActive) {
      const error = new Error('Customer not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return customer;
  }

  static async updateCustomer(id: string, input: UpdateCustomerInput): Promise<ICustomer> {
    const customer = await this.getCustomerById(id);

    if (input.name) customer.name = input.name;
    if (input.mobile) customer.mobile = input.mobile;
    if (input.village !== undefined) customer.village = input.village;
    if (input.address !== undefined) customer.address = input.address;
    if (input.notes !== undefined) customer.notes = input.notes;

    await customer.save();
    return customer;
  }

  static async getCustomerLedger(id: string, query: LedgerQueryParams) {
    await this.getCustomerById(id); // Ensure customer exists

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const match: any = { customerId: new mongoose.Types.ObjectId(id) };

    if (query.startDate || query.endDate) {
      match.date = {};
      if (query.startDate) match.date.$gte = new Date(query.startDate);
      if (query.endDate) match.date.$lte = new Date(query.endDate);
    }

    const [entries, total] = await Promise.all([
      LedgerEntry.find(match)
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LedgerEntry.countDocuments(match),
    ]);

    return {
      entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCustomerSummary(id: string) {
    const customer = await this.getCustomerById(id);
    const customerObjectId = new mongoose.Types.ObjectId(id);

    const agg = await LedgerEntry.aggregate([
      { $match: { customerId: customerObjectId } },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
          totalSales: {
            $sum: { $cond: [{ $eq: ['$entryType', 'SALE'] }, '$debit', 0] },
          },
          totalPayments: {
            $sum: { $cond: [{ $eq: ['$entryType', 'PAYMENT'] }, '$credit', 0] },
          },
        },
      },
    ]);

    const stats = agg[0] || {
      totalDebit: 0,
      totalCredit: 0,
      totalSales: 0,
      totalPayments: 0,
    };

    return {
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        mobile: customer.mobile,
        village: customer.village,
        address: customer.address,
        openingBalance: customer.openingBalance,
        openingBalanceType: customer.openingBalanceType,
        currentBalance: customer.currentBalance,
      },
      financials: {
        currentBalance: customer.currentBalance,
        totalSales: stats.totalSales,
        totalPaymentsReceived: stats.totalPayments,
        totalDebit: stats.totalDebit,
        totalCredit: stats.totalCredit,
      },
    };
  }

  static async addAdjustment(
    customerId: string,
    input: CreateAdjustmentInput,
    userId?: string
  ): Promise<ILedgerEntry> {
    const customer = await this.getCustomerById(customerId);
    const amount = Math.round(input.amount);
    const isDebit = input.type === 'DEBIT';

    // Calculate new running balance
    const newRunningBalance = isDebit
      ? customer.currentBalance + amount
      : customer.currentBalance - amount;

    // Create immutable ledger entry
    const entry = new LedgerEntry({
      customerId: customer._id,
      date: new Date(),
      entryType: 'ADJUSTMENT',
      referenceType: 'MANUAL',
      description: `Adjustment: ${input.description}`,
      debit: isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      runningBalance: newRunningBalance,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await entry.save();

    // Update customer current balance
    customer.currentBalance = newRunningBalance;
    customer.lastTransactionDate = new Date();
    await customer.save();

    return entry;
  }
}
