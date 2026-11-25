import { Sale } from '../sales/sale.model.js';
import { Payment } from '../payments/payment.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { Expense } from '../expenses/expense.model.js';
import { Material } from '../materials/material.model.js';
import { ReportQueryParams } from './report.schema.js';

function buildDateFilter(query: ReportQueryParams, fieldName: string) {
  if (!query.startDate && !query.endDate) return {};
  const range: any = {};
  if (query.startDate) {
    const start = new Date(query.startDate);
    start.setHours(0, 0, 0, 0);
    range.$gte = start;
  }
  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [fieldName]: range };
}

export class ReportService {
  /**
   * Sales summary & material-wise sales volume breakdown.
   */
  static async getSalesSummary(query: ReportQueryParams) {
    const dateFilter = buildDateFilter(query, 'saleDate');
    const sales = await Sale.find({ isCancelled: false, ...dateFilter }).lean();

    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTransport = 0;
    let totalCollected = 0;
    let totalDue = 0;

    const materialMap = new Map<
      string,
      {
        materialId: string;
        materialName: string;
        unit: string;
        totalQuantity: number;
        totalRevenue: number;
        billCount: number;
      }
    >();

    for (const sale of sales) {
      totalRevenue += sale.grandTotal;
      totalSubtotal += sale.subtotal;
      totalDiscount += sale.discount || 0;
      totalTransport += sale.transportCharges || 0;
      totalCollected += sale.amountPaid;
      totalDue += sale.balanceDue;

      for (const item of sale.items || []) {
        const key = `${item.materialId.toString()}_${item.unit}`;
        const existing = materialMap.get(key);
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalRevenue += item.lineTotal;
          existing.billCount += 1;
        } else {
          materialMap.set(key, {
            materialId: item.materialId.toString(),
            materialName: item.materialName,
            unit: item.unit,
            totalQuantity: item.quantity,
            totalRevenue: item.lineTotal,
            billCount: 1,
          });
        }
      }
    }

    const materialBreakdown = Array.from(materialMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    return {
      summary: {
        totalBills: sales.length,
        totalSubtotal,
        totalDiscount,
        totalTransport,
        totalRevenue,
        totalCollected,
        totalDue,
      },
      materialBreakdown,
    };
  }

  /**
   * Cash Flow report: inflows (sales + recoveries) vs outflows (purchases + expenses).
   */
  static async getCashFlow(query: ReportQueryParams) {
    const saleDateFilter = buildDateFilter(query, 'saleDate');
    const paymentDateFilter = buildDateFilter(query, 'paymentDate');
    const purchaseDateFilter = buildDateFilter(query, 'purchaseDate');
    const expenseDateFilter = buildDateFilter(query, 'date');

    const [sales, payments, purchases, expenses] = await Promise.all([
      Sale.find({ isCancelled: false, ...saleDateFilter }).lean(),
      Payment.find(paymentDateFilter).lean(),
      Purchase.find(purchaseDateFilter).lean(),
      Expense.find({ isCancelled: false, ...expenseDateFilter }).lean(),
    ]);

    let cashInflow = 0;
    let digitalInflow = 0;

    for (const s of sales) {
      for (const p of s.payments || []) {
        if (p.method === 'CASH') cashInflow += p.amount;
        else digitalInflow += p.amount;
      }
    }

    for (const p of payments) {
      if (p.paymentMethod === 'CASH') cashInflow += p.amount;
      else digitalInflow += p.amount;
    }

    let cashOutflow = 0;
    let digitalOutflow = 0;
    let purchaseOutflow = 0;
    let expenseOutflow = 0;

    for (const pur of purchases) {
      const paid = pur.amountPaid || 0;
      purchaseOutflow += paid;
      if (pur.paymentMethod === 'CASH') cashOutflow += paid;
      else if (pur.paymentMethod !== 'CREDIT') digitalOutflow += paid;
    }

    for (const exp of expenses) {
      expenseOutflow += exp.amount;
      if (exp.paymentMethod === 'CASH') cashOutflow += exp.amount;
      else digitalOutflow += exp.amount;
    }

    const totalInflow = cashInflow + digitalInflow;
    const totalOutflow = cashOutflow + digitalOutflow;

    return {
      inflows: {
        cashInflow,
        digitalInflow,
        totalInflow,
      },
      outflows: {
        purchaseOutflow,
        expenseOutflow,
        cashOutflow,
        digitalOutflow,
        totalOutflow,
      },
      netCashFlow: totalInflow - totalOutflow,
      netCashInHand: cashInflow - cashOutflow,
      netDigitalFlow: digitalInflow - digitalOutflow,
    };
  }

  /**
   * Profit & Loss report: Revenue - COGS (weighted average purchase cost) - Operating Expenses.
   */
  static async getProfitLoss(query: ReportQueryParams) {
    const saleDateFilter = buildDateFilter(query, 'saleDate');
    const expenseDateFilter = buildDateFilter(query, 'date');

    const [sales, expenses, materials, purchases] = await Promise.all([
      Sale.find({ isCancelled: false, ...saleDateFilter }).lean(),
      Expense.find({ isCancelled: false, ...expenseDateFilter }).lean(),
      Material.find().lean(),
      Purchase.find().lean(),
    ]);

    // Compute weighted average purchase rate per material (fallback to material.purchaseRate)
    const purchaseCostAgg = new Map<string, { totalCost: number; totalQty: number }>();
    for (const pur of purchases) {
      for (const item of pur.items || []) {
        const key = item.materialId.toString();
        const curr = purchaseCostAgg.get(key) || { totalCost: 0, totalQty: 0 };
        curr.totalCost += item.lineTotal;
        curr.totalQty += item.quantity;
        purchaseCostAgg.set(key, curr);
      }
    }

    const materialCostMap = new Map<string, number>();
    for (const mat of materials) {
      const id = mat._id.toString();
      const agg = purchaseCostAgg.get(id);
      if (agg && agg.totalQty > 0) {
        materialCostMap.set(id, Math.round(agg.totalCost / agg.totalQty));
      } else {
        materialCostMap.set(id, mat.purchaseRate || 0);
      }
    }

    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalTransportCharged = 0;
    let totalDiscountGiven = 0;
    let totalCogs = 0;

    for (const sale of sales) {
      totalRevenue += sale.grandTotal;
      totalSubtotal += sale.subtotal;
      totalTransportCharged += sale.transportCharges || 0;
      totalDiscountGiven += sale.discount || 0;

      for (const item of sale.items || []) {
        const unitCost = materialCostMap.get(item.materialId.toString()) || 0;
        totalCogs += Math.round(item.quantity * unitCost);
      }
    }

    const expenseByCategory = new Map<string, number>();
    let totalOperatingExpenses = 0;

    for (const exp of expenses) {
      totalOperatingExpenses += exp.amount;
      expenseByCategory.set(
        exp.category,
        (expenseByCategory.get(exp.category) || 0) + exp.amount
      );
    }

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalOperatingExpenses;
    const grossMarginPercent =
      totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
    const netMarginPercent =
      totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

    return {
      revenue: {
        totalRevenue,
        materialSalesSubtotal: totalSubtotal,
        transportCharged: totalTransportCharged,
        discountGiven: totalDiscountGiven,
        billsCount: sales.length,
      },
      cogs: {
        totalCogs,
      },
      grossProfit,
      grossMarginPercent,
      operatingExpenses: {
        totalOperatingExpenses,
        byCategory: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      netProfit,
      netMarginPercent,
    };
  }

  /**
   * Current Stock Valuation Report.
   */
  static async getStockValuation() {
    const materials = await Material.find({ isActive: true }).sort({ categoryName: 1, name: 1 }).lean();

    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    const categoryMap = new Map<
      string,
      { category: string; itemCount: number; costValue: number; retailValue: number }
    >();

    const items = materials.map((mat) => {
      const stock = Math.max(0, mat.currentStock || 0);
      const costValue = Math.round(stock * (mat.purchaseRate || 0));
      const retailValue = Math.round(stock * (mat.sellingRate || 0));
      const isLowStock = (mat.currentStock || 0) <= (mat.minimumStockAlert || 0);

      totalCostValue += costValue;
      totalRetailValue += retailValue;
      if (isLowStock) lowStockCount += 1;

      const catKey = mat.categoryName || 'General';
      const catEntry = categoryMap.get(catKey) || {
        category: catKey,
        itemCount: 0,
        costValue: 0,
        retailValue: 0,
      };
      catEntry.itemCount += 1;
      catEntry.costValue += costValue;
      catEntry.retailValue += retailValue;
      categoryMap.set(catKey, catEntry);

      return {
        _id: mat._id,
        name: mat.name,
        categoryName: mat.categoryName,
        defaultUnit: mat.defaultUnit,
        currentStock: mat.currentStock,
        purchaseRate: mat.purchaseRate,
        sellingRate: mat.sellingRate,
        costValue,
        retailValue,
        isLowStock,
      };
    });

    return {
      summary: {
        totalMaterials: materials.length,
        lowStockCount,
        totalCostValue,
        totalRetailValue,
        projectedProfit: totalRetailValue - totalCostValue,
      },
      byCategory: Array.from(categoryMap.values()),
      items,
    };
  }
}
