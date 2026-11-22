import { Sale } from '../sales/sale.model.js';
import { Payment } from '../payments/payment.model.js';
import { Customer } from '../customers/customer.model.js';
import { Material } from '../materials/material.model.js';
import { Delivery } from '../deliveries/delivery.model.js';
import { DashboardSummaryQuery } from './dashboard.schema.js';

export interface DashboardMetrics {
  period: {
    filter: string;
    startDate: string;
    endDate: string;
  };
  sales: {
    totalSales: number; // In paise
    salesCount: number;
    creditSales: number; // In paise
  };
  collections: {
    totalCollections: number; // In paise
    cashAmount: number; // In paise
    upiAmount: number; // In paise
    paymentsCount: number;
  };
  outstanding: {
    totalReceivable: number; // In paise
    customersWithDuesCount: number;
  };
  inventory: {
    totalAssetValue: number; // In paise
    lowStockCount: number;
    lowStockMaterials: Array<{
      id: string;
      name: string;
      hindiName?: string;
      currentStock: number;
      unit: string;
      minAlert: number;
    }>;
  };
  deliveries: {
    pendingCount: number;
  };
  recentTransactions: Array<{
    id: string;
    type: 'SALE' | 'PAYMENT';
    title: string;
    description: string;
    amount: number; // In paise
    date: string;
    status?: string;
  }>;
  recentCustomers: Array<{
    id: string;
    name: string;
    mobile: string;
    village?: string;
    currentBalance: number;
  }>;
}

export class DashboardService {
  static getDateRange(query: DashboardSummaryQuery): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (query.filter) {
      case 'yesterday': {
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month': {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'custom': {
        if (query.startDate) {
          start.setTime(new Date(query.startDate).getTime());
        } else {
          start.setHours(0, 0, 0, 0);
        }
        if (query.endDate) {
          end.setTime(new Date(query.endDate).getTime());
        } else {
          end.setHours(23, 59, 59, 999);
        }
        break;
      }
      case 'today':
      default: {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }

    return { start, end };
  }

  static async getSummary(query: DashboardSummaryQuery): Promise<DashboardMetrics> {
    const { start, end } = this.getDateRange(query);

    // 1. Sales Aggregation within Date Range
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          creditSales: { $sum: '$balanceDue' },
          count: { $sum: 1 },
        },
      },
    ]);

    const salesMetrics = salesAgg[0] || { totalSales: 0, creditSales: 0, count: 0 };

    // 2. Collections Aggregation within Date Range
    const collectionsAgg = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: '$amount' },
          cashAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'CASH'] }, '$amount', 0],
            },
          },
          upiAmount: {
            $sum: {
              $cond: [
                { $in: ['$paymentMethod', ['UPI', 'BANK', 'CHEQUE']] },
                '$amount',
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const collectionsMetrics = collectionsAgg[0] || {
      totalCollections: 0,
      cashAmount: 0,
      upiAmount: 0,
      count: 0,
    };

    // 3. Outstanding Customer Balance (Overall)
    const outstandingAgg = await Customer.aggregate([
      {
        $match: {
          isActive: true,
          currentBalance: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalReceivable: { $sum: '$currentBalance' },
          customersCount: { $sum: 1 },
        },
      },
    ]);

    const outstandingMetrics = outstandingAgg[0] || {
      totalReceivable: 0,
      customersCount: 0,
    };

    // 4. Inventory Value & Low-Stock Alerts
    const inventoryAgg = await Material.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: null,
          totalAssetValue: {
            $sum: { $multiply: ['$currentStock', '$purchaseRate'] },
          },
        },
      },
    ]);

    const lowStockMaterials = await Material.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minimumStockAlert'] },
    })
      .select('name hindiName currentStock defaultUnit minimumStockAlert')
      .limit(10)
      .lean();

    const lowStockCount = await Material.countDocuments({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minimumStockAlert'] },
    });

    // 5. Deliveries (Pending)
    const pendingDeliveriesCount = await Delivery.countDocuments({
      status: { $in: ['PENDING', 'ASSIGNED', 'DISPATCHED'] },
    });

    // 6. Recent Transactions (Latest 5 Sales + Latest 5 Payments)
    const recentSales = await Sale.find()
      .populate('customerId', 'name')
      .sort({ saleDate: -1 })
      .limit(5)
      .lean();

    const recentPayments = await Payment.find()
      .populate('customerId', 'name')
      .sort({ paymentDate: -1 })
      .limit(5)
      .lean();

    const transactions: DashboardMetrics['recentTransactions'] = [
      ...recentSales.map((s: any) => ({
        id: s._id.toString(),
        type: 'SALE' as const,
        title: `Bill #${s.invoiceNumber}`,
        description: s.customerId?.name || 'Customer Sale',
        amount: s.grandTotal,
        date: s.saleDate.toISOString(),
        status: s.paymentStatus,
      })),
      ...recentPayments.map((p: any) => ({
        id: p._id.toString(),
        type: 'PAYMENT' as const,
        title: `Payment #${p.paymentNumber}`,
        description: `${p.paymentMethod} • ${p.customerId?.name || 'Customer'}`,
        amount: p.amount,
        date: p.paymentDate.toISOString(),
        status: p.paymentMethod,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    // 7. Recent Customers
    const recentCustomers = await Customer.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name mobile village currentBalance')
      .lean();

    return {
      period: {
        filter: query.filter,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      sales: {
        totalSales: salesMetrics.totalSales,
        salesCount: salesMetrics.count,
        creditSales: salesMetrics.creditSales,
      },
      collections: {
        totalCollections: collectionsMetrics.totalCollections,
        cashAmount: collectionsMetrics.cashAmount,
        upiAmount: collectionsMetrics.upiAmount,
        paymentsCount: collectionsMetrics.count,
      },
      outstanding: {
        totalReceivable: outstandingMetrics.totalReceivable,
        customersWithDuesCount: outstandingMetrics.customersCount,
      },
      inventory: {
        totalAssetValue: inventoryAgg[0]?.totalAssetValue || 0,
        lowStockCount,
        lowStockMaterials: lowStockMaterials.map((m: any) => ({
          id: m._id.toString(),
          name: m.name,
          hindiName: m.hindiName,
          currentStock: m.currentStock,
          unit: m.defaultUnit,
          minAlert: m.minimumStockAlert,
        })),
      },
      deliveries: {
        pendingCount: pendingDeliveriesCount,
      },
      recentTransactions: transactions,
      recentCustomers: recentCustomers.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        mobile: c.mobile,
        village: c.village,
        currentBalance: c.currentBalance,
      })),
    };
  }
}
