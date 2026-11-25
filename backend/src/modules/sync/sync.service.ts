import { Customer } from '../customers/customer.model.js';
import { CustomerService } from '../customers/customer.service.js';
import { Material } from '../materials/material.model.js';
import { Sale } from '../sales/sale.model.js';
import { SaleService } from '../sales/sale.service.js';
import { Payment } from '../payments/payment.model.js';
import { PaymentService } from '../payments/payment.service.js';
import { ExpenseService } from '../expenses/expense.service.js';
import { SyncOperationInput } from './sync.schema.js';

export interface SyncOperationResult {
  localId: string;
  idempotencyKey: string;
  action: SyncOperationInput['action'];
  status: 'SYNCED' | 'FAILED';
  serverId?: string;
  serverNumber?: string;
  error?: string;
}

export class SyncService {
  /**
   * Processes offline-queued operations sequentially (FIFO), resolving localId -> serverId
   * references within the batch and enforcing idempotency deduplication.
   */
  static async processBatch(
    operations: SyncOperationInput[],
    userId?: string
  ): Promise<{
    results: SyncOperationResult[];
    syncedCount: number;
    failedCount: number;
  }> {
    const results: SyncOperationResult[] = [];
    const localToServerIdMap = new Map<string, string>();

    let syncedCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        const payload = { ...op.payload };

        // Resolve any offline local customerId or relatedSaleId created earlier in the same batch
        if (payload.customerId && localToServerIdMap.has(payload.customerId)) {
          payload.customerId = localToServerIdMap.get(payload.customerId);
        }
        if (payload.relatedSaleId && localToServerIdMap.has(payload.relatedSaleId)) {
          payload.relatedSaleId = localToServerIdMap.get(payload.relatedSaleId);
        }

        if (op.action === 'CREATE_CUSTOMER') {
          // Deduplicate by mobile if already synced in an earlier retry
          const existing = await Customer.findOne({ mobile: payload.mobile, isActive: true });
          const customer = existing
            ? existing
            : (await CustomerService.createCustomer(payload as any, userId)).customer;

          const serverId = customer._id.toString();
          localToServerIdMap.set(op.localId, serverId);

          results.push({
            localId: op.localId,
            idempotencyKey: op.idempotencyKey,
            action: op.action,
            status: 'SYNCED',
            serverId,
          });
          syncedCount++;
        } else if (op.action === 'CREATE_SALE') {
          const sale = await SaleService.createSale(
            { ...payload, idempotencyKey: op.idempotencyKey } as any,
            userId
          );
          const serverId = sale._id.toString();
          localToServerIdMap.set(op.localId, serverId);

          results.push({
            localId: op.localId,
            idempotencyKey: op.idempotencyKey,
            action: op.action,
            status: 'SYNCED',
            serverId,
            serverNumber: sale.invoiceNumber,
          });
          syncedCount++;
        } else if (op.action === 'CREATE_PAYMENT') {
          const payment = await PaymentService.createPayment(
            { ...payload, idempotencyKey: op.idempotencyKey } as any,
            userId
          );
          const serverId = payment._id.toString();
          localToServerIdMap.set(op.localId, serverId);

          results.push({
            localId: op.localId,
            idempotencyKey: op.idempotencyKey,
            action: op.action,
            status: 'SYNCED',
            serverId,
            serverNumber: payment.paymentNumber,
          });
          syncedCount++;
        } else if (op.action === 'CREATE_EXPENSE') {
          const expense = await ExpenseService.createExpense(payload as any, userId);
          const serverId = expense._id.toString();
          localToServerIdMap.set(op.localId, serverId);

          results.push({
            localId: op.localId,
            idempotencyKey: op.idempotencyKey,
            action: op.action,
            status: 'SYNCED',
            serverId,
            serverNumber: expense.expenseNumber,
          });
          syncedCount++;
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          localId: op.localId,
          idempotencyKey: op.idempotencyKey,
          action: op.action,
          status: 'FAILED',
          error: err.message || 'Operation failed during sync',
        });
      }
    }

    return { results, syncedCount, failedCount };
  }

  /**
   * Pulls delta/snapshot records for local SQLite offline cache.
   */
  static async pullDelta(since?: string) {
    const sinceFilter = since ? { updatedAt: { $gte: new Date(since) } } : {};

    const [customers, materials, sales, payments] = await Promise.all([
      Customer.find({ isActive: true, ...sinceFilter })
        .select('_id name mobile village currentBalance updatedAt')
        .lean(),
      Material.find({ isActive: true, ...sinceFilter })
        .select('_id name categoryName defaultUnit sellingRate purchaseRate currentStock updatedAt')
        .lean(),
      Sale.find({ isCancelled: false, ...sinceFilter })
        .sort({ saleDate: -1 })
        .limit(100)
        .select('_id invoiceNumber customerId customerName grandTotal amountPaid balanceDue paymentStatus saleDate updatedAt')
        .lean(),
      Payment.find(sinceFilter)
        .sort({ paymentDate: -1 })
        .limit(100)
        .select('_id paymentNumber customerId customerName amount paymentMethod paymentDate updatedAt')
        .lean(),
    ]);

    return {
      serverTimestamp: new Date().toISOString(),
      customers,
      materials,
      sales,
      payments,
    };
  }
}
