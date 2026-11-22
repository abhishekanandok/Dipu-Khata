import mongoose from 'mongoose';
import { Sale, ISale } from './sale.model.js';
import { Estimate, IEstimate } from './estimate.model.js';
import { getNextDocumentNumber } from './documentSequence.model.js';
import { Customer } from '../customers/customer.model.js';
import { LedgerEntry } from '../ledger/ledger.model.js';
import { Material } from '../materials/material.model.js';
import { StockMovement } from '../inventory/stockMovement.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  CreateSaleInput,
  SaleQueryParams,
  CreateEstimateInput,
  ConvertEstimateInput,
  EstimateQueryParams,
} from './sale.schema.js';

export class SaleService {
  /**
   * Creates a retail sale bill with atomic customer ledger debiting and payment credit.
   */
  static async createSale(input: CreateSaleInput, userId?: string): Promise<ISale> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingSale = await Sale.findOne({ idempotencyKey: input.idempotencyKey });
      if (existingSale) {
        return existingSale;
      }
    }

    // 2. Validate Customer
    const customer = await Customer.findById(input.customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // 3. Validate & Resolve Materials
    const materialIds = input.items.map((i) => i.materialId);
    const materials = await Material.find({ _id: { $in: materialIds } });
    const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));

    for (const item of input.items) {
      if (!materialMap.has(item.materialId)) {
        throw new AppError(`Material with ID ${item.materialId} not found`, 404);
      }
    }

    // 4. Calculate Item Totals
    const resolvedItems = input.items.map((item) => {
      const mat = materialMap.get(item.materialId)!;
      const rate = Math.round(item.rate);
      const lineTotal = Math.round(item.quantity * rate);
      return {
        materialId: mat._id as mongoose.Types.ObjectId,
        materialName: mat.name,
        quantity: item.quantity,
        unit: item.unit || mat.defaultUnit,
        rate,
        lineTotal,
      };
    });

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.round(input.discount || 0);
    const transportCharges = Math.round(input.transportCharges || 0);
    const grandTotal = Math.max(0, subtotal - discount + transportCharges);

    // 5. Calculate Payments & Outstanding Balance
    const payments = (input.payments || []).map((p) => ({
      amount: Math.round(p.amount),
      method: p.method,
      referenceNumber: p.referenceNumber?.trim(),
      date: new Date(),
    }));

    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, grandTotal - amountPaid);

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
    if (balanceDue === 0 && grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }

    // 6. Generate Sequential Invoice Number (e.g. DK-2611-0001)
    const invoiceNumber = await getNextDocumentNumber('SALE', 'DK');

    // 7. Create Sale Document
    const sale = new Sale({
      invoiceNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      saleDate: input.saleDate ? new Date(input.saleDate) : new Date(),
      items: resolvedItems,
      subtotal,
      discount,
      transportCharges,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentStatus,
      deliveryStatus: 'PENDING',
      payments,
      estimateId: input.estimateId ? new mongoose.Types.ObjectId(input.estimateId) : undefined,
      autoStockDeduction: !!input.autoStockDeduction,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await sale.save();

    // 8. Update Customer Ledger & Outstanding Balance
    const itemsSummary = resolvedItems.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(', ');

    // (a) Debit Customer for Grand Total of the bill
    customer.currentBalance += grandTotal;
    const debitEntry = new LedgerEntry({
      customerId: customer._id,
      date: sale.saleDate,
      entryType: 'SALE',
      referenceType: 'SALE',
      referenceId: invoiceNumber,
      description: `Bill #${invoiceNumber} • ${itemsSummary.slice(0, 150)}`,
      debit: grandTotal,
      credit: 0,
      runningBalance: customer.currentBalance,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });
    await debitEntry.save();

    // (b) If payments were made at billing time, credit customer account
    if (amountPaid > 0) {
      customer.currentBalance -= amountPaid;
      const paymentMethods = payments.map((p) => p.method).join(' + ');
      const creditEntry = new LedgerEntry({
        customerId: customer._id,
        date: sale.saleDate,
        entryType: 'PAYMENT',
        referenceType: 'SALE',
        referenceId: invoiceNumber,
        description: `Payment against #${invoiceNumber} (${paymentMethods})`,
        debit: 0,
        credit: amountPaid,
        runningBalance: customer.currentBalance,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
      await creditEntry.save();
    }

    customer.lastTransactionDate = sale.saleDate;
    await customer.save();

    // 9. Optional Immediate Stock Deduction
    if (input.autoStockDeduction) {
      for (const item of resolvedItems) {
        const mat = materialMap.get(item.materialId.toString())!;
        const prevStock = mat.currentStock;
        mat.currentStock = Math.round((mat.currentStock - item.quantity) * 100) / 100;
        await mat.save();

        const movement = new StockMovement({
          materialId: mat._id,
          materialName: mat.name,
          date: sale.saleDate,
          movementType: 'SALE_DISPATCH',
          quantity: item.quantity,
          unit: item.unit,
          referenceType: 'SALE',
          referenceId: invoiceNumber,
          previousStock: prevStock,
          newStock: mat.currentStock,
          reason: `Billed & Dispatched #${invoiceNumber}`,
          createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        });
        await movement.save();
      }
    }

    // 10. If converted from an Estimate, update the estimate's status
    if (input.estimateId) {
      await Estimate.findByIdAndUpdate(input.estimateId, {
        status: 'CONVERTED',
        convertedSaleId: sale._id,
        convertedAt: new Date(),
      });
    }

    return sale;
  }

  /**
   * Retrieves sales list with date filtering, status filtering, and overall sales metrics.
   */
  static async getSales(query: SaleQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = { isCancelled: false };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
      ];
    }

    if (query.customerId) {
      filter.customerId = new mongoose.Types.ObjectId(query.customerId);
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.deliveryStatus) {
      filter.deliveryStatus = query.deliveryStatus;
    }

    if (query.startDate || query.endDate) {
      filter.saleDate = {};
      if (query.startDate) filter.saleDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.saleDate.$lte = new Date(query.endDate);
    }

    const [sales, totalCount, summaryAgg] = await Promise.all([
      Sale.find(filter)
        .sort({ saleDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(filter),
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalGrandTotal: { $sum: '$grandTotal' },
            totalAmountPaid: { $sum: '$amountPaid' },
            totalBalanceDue: { $sum: '$balanceDue' },
          },
        },
      ]),
    ]);

    const summary = summaryAgg[0] || {
      totalGrandTotal: 0,
      totalAmountPaid: 0,
      totalBalanceDue: 0,
    };

    return {
      sales,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      summary: {
        totalInvoiced: summary.totalGrandTotal,
        totalPaid: summary.totalAmountPaid,
        totalDue: summary.totalBalanceDue,
      },
    };
  }

  /**
   * Retrieves single sale with full details.
   */
  static async getSaleById(id: string): Promise<ISale> {
    const sale = await Sale.findById(id).populate('customerId', 'name mobile village address currentBalance');
    if (!sale) {
      throw new AppError('Sale record not found', 404);
    }
    return sale;
  }

  /**
   * Cancels a sale and safely reverses the customer ledger entry.
   */
  static async cancelSale(id: string, reason: string, userId?: string): Promise<ISale> {
    const sale = await Sale.findById(id);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }
    if (sale.isCancelled) {
      throw new AppError('Sale is already cancelled', 400);
    }

    const customer = await Customer.findById(sale.customerId);
    if (!customer) {
      throw new AppError('Customer for this sale not found', 404);
    }

    // Ledger Reversal:
    // When sale was recorded: customer was debited grandTotal and credited amountPaid.
    // Net customer balance increase was balanceDue (grandTotal - amountPaid).
    // To cleanly cancel, we credit the customer for balanceDue (if positive) or create a comprehensive adjustment entry.
    if (sale.balanceDue > 0) {
      customer.currentBalance -= sale.balanceDue;
      const reversalEntry = new LedgerEntry({
        customerId: customer._id,
        date: new Date(),
        entryType: 'ADJUSTMENT',
        referenceType: 'SALE',
        referenceId: sale.invoiceNumber,
        description: `Cancel Bill #${sale.invoiceNumber} • ${reason}`,
        debit: 0,
        credit: sale.balanceDue,
        runningBalance: customer.currentBalance,
        notes: `Cancellation of invoice #${sale.invoiceNumber}. Reason: ${reason}`,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
      await reversalEntry.save();
      customer.lastTransactionDate = new Date();
      await customer.save();
    }

    // If stock was automatically deducted, restore it
    if (sale.autoStockDeduction) {
      for (const item of sale.items) {
        const mat = await Material.findById(item.materialId);
        if (mat) {
          const prevStock = mat.currentStock;
          mat.currentStock = Math.round((mat.currentStock + item.quantity) * 100) / 100;
          await mat.save();

          const movement = new StockMovement({
            materialId: mat._id,
            materialName: mat.name,
            date: new Date(),
            movementType: 'SALE_RETURN',
            quantity: item.quantity,
            unit: item.unit,
            referenceType: 'SALE',
            referenceId: sale.invoiceNumber,
            previousStock: prevStock,
            newStock: mat.currentStock,
            reason: `Restored from cancelled Bill #${sale.invoiceNumber}: ${reason}`,
            createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          });
          await movement.save();
        }
      }
    }

    sale.isCancelled = true;
    sale.cancelledAt = new Date();
    sale.cancelReason = reason;
    await sale.save();

    return sale;
  }
}

export class EstimateService {
  /**
   * Creates an estimate / quotation.
   */
  static async createEstimate(input: CreateEstimateInput, userId?: string): Promise<IEstimate> {
    const materialIds = input.items.map((i) => i.materialId);
    const materials = await Material.find({ _id: { $in: materialIds } });
    const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));

    const resolvedItems = input.items.map((item) => {
      const mat = materialMap.get(item.materialId);
      const matName = mat ? mat.name : 'Material';
      const defaultUnit = mat ? mat.defaultUnit : item.unit;
      const rate = Math.round(item.rate);
      const lineTotal = Math.round(item.quantity * rate);
      return {
        materialId: new mongoose.Types.ObjectId(item.materialId),
        materialName: matName,
        quantity: item.quantity,
        unit: item.unit || defaultUnit,
        rate,
        lineTotal,
      };
    });

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.round(input.discount || 0);
    const transportCharges = Math.round(input.transportCharges || 0);
    const grandTotal = Math.max(0, subtotal - discount + transportCharges);

    const estimateNumber = await getNextDocumentNumber('ESTIMATE', 'EST');

    const estimate = new Estimate({
      estimateNumber,
      customerId: input.customerId ? new mongoose.Types.ObjectId(input.customerId) : undefined,
      customerName: input.customerName,
      customerMobile: input.customerMobile,
      village: input.village,
      estimateDate: input.estimateDate ? new Date(input.estimateDate) : new Date(),
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      items: resolvedItems,
      subtotal,
      discount,
      transportCharges,
      grandTotal,
      status: 'DRAFT',
      notes: input.notes,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await estimate.save();
    return estimate;
  }

  /**
   * Retrieves estimates list with filtering.
   */
  static async getEstimates(query: EstimateQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { estimateNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
      ];
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.startDate || query.endDate) {
      filter.estimateDate = {};
      if (query.startDate) filter.estimateDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.estimateDate.$lte = new Date(query.endDate);
    }

    const [estimates, totalCount] = await Promise.all([
      Estimate.find(filter).sort({ estimateDate: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Estimate.countDocuments(filter),
    ]);

    return {
      estimates,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Retrieves single estimate.
   */
  static async getEstimateById(id: string): Promise<IEstimate> {
    const estimate = await Estimate.findById(id).populate('customerId', 'name mobile village address');
    if (!estimate) {
      throw new AppError('Estimate not found', 404);
    }
    return estimate;
  }

  /**
   * Converts an estimate directly into an active retail sale bill.
   */
  static async convertEstimate(
    id: string,
    input: ConvertEstimateInput,
    userId?: string
  ): Promise<{ estimate: IEstimate; sale: ISale }> {
    const estimate = await Estimate.findById(id);
    if (!estimate) {
      throw new AppError('Estimate not found', 404);
    }
    if (estimate.status === 'CONVERTED') {
      throw new AppError('This estimate has already been converted into a bill', 400);
    }

    // Determine customer: either existing customerId on estimate or customer passed in conversion input
    const targetCustomerId = input.customerId || estimate.customerId?.toString();
    if (!targetCustomerId) {
      // Find or create customer from estimate customer details
      let customer = await Customer.findOne({ mobile: estimate.customerMobile });
      if (!customer) {
        customer = new Customer({
          name: estimate.customerName,
          mobile: estimate.customerMobile,
          village: estimate.village,
          openingBalance: 0,
          openingBalanceType: 'RECEIVABLE',
          currentBalance: 0,
          lastTransactionDate: new Date(),
        });
        await customer.save();
      }
      estimate.customerId = customer._id as mongoose.Types.ObjectId;
    } else {
      estimate.customerId = new mongoose.Types.ObjectId(targetCustomerId);
    }

    const saleInput: CreateSaleInput = {
      customerId: estimate.customerId.toString(),
      items: estimate.items.map((i) => ({
        materialId: i.materialId.toString(),
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
      })),
      discount: input.discount !== undefined ? input.discount : estimate.discount,
      transportCharges:
        input.transportCharges !== undefined ? input.transportCharges : estimate.transportCharges,
      payments: input.payments || [],
      estimateId: estimate._id.toString(),
      autoStockDeduction: !!input.autoStockDeduction,
      notes: input.notes || estimate.notes,
    };

    const sale = await SaleService.createSale(saleInput, userId);

    estimate.status = 'CONVERTED';
    estimate.convertedSaleId = sale._id as mongoose.Types.ObjectId;
    estimate.convertedAt = new Date();
    await estimate.save();

    return { estimate, sale };
  }
}
