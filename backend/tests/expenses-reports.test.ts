import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Expense } from '../src/modules/expenses/expense.model.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

async function runExpensesReportsTests() {
  console.log('🚀 Starting Phase 10 Business Expenses & Financial Reports Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5010, resolve));
  const baseUrl = 'http://localhost:5010/api';

  const testUser = await User.create({
    name: 'Reports Tester Admin',
    email: `reports_tester_${Date.now()}@dipukhata.com`,
    passwordHash: 'dummy_hash',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  let customerId = '';
  let materialId = '';
  let saleId = '';
  let expenseId1 = '';
  let expenseId2 = '';

  try {
    // Use an isolated future date range for deterministic P&L and Cash Flow assertions
    const testDate = new Date('2026-12-15T10:00:00.000Z');
    const dateStart = '2026-12-15';
    const dateEnd = '2026-12-15';

    // 1. Create Material & Customer
    console.log('1. Setting up test customer & material...');
    const cust = await Customer.create({
      name: 'Vikash Construction',
      mobile: '9835088888',
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 0,
    });
    customerId = cust._id.toString();

    const mat = await Material.create({
      name: `Cement P&L Test ${Date.now()}`,
      categoryName: 'Cement',
      defaultUnit: 'BAG',
      purchaseRate: 30000, // ₹300
      sellingRate: 38000, // ₹380
      currentStock: 100,
      minimumStockAlert: 10,
    });
    materialId = mat._id.toString();

    // 2. Create Sale (10 Bags @ ₹380 = ₹3,800, Paid ₹2,000 Cash)
    console.log('2. Recording test sale on isolated test date...');
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        saleDate: testDate.toISOString(),
        items: [{ materialId, quantity: 10, unit: 'BAG', rate: 38000 }],
        payments: [{ amount: 200000, method: 'CASH' }],
      }),
    });
    const saleData = await saleRes.json();
    if (saleRes.status !== 201) {
      throw new Error(`Sale creation failed: ${JSON.stringify(saleData)}`);
    }
    saleId = saleData.data._id;
    console.log(`✅ Sale #${saleData.data.invoiceNumber} created: ₹3,800 total, ₹2,000 cash paid`);

    // 3. Record Business Expenses
    console.log('\n3. Testing Expense Creation (FUEL ₹500 CASH + LABOUR ₹800 UPI)...');
    const exp1Res = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'FUEL',
        amount: 50000, // ₹500
        date: testDate.toISOString(),
        paymentMethod: 'CASH',
        paidTo: 'IndianOil Pump',
        notes: 'Tractor diesel refill',
      }),
    });
    const exp1Data = await exp1Res.json();
    if (exp1Res.status !== 201) {
      throw new Error(`Expense 1 failed: ${JSON.stringify(exp1Data)}`);
    }
    expenseId1 = exp1Data.data._id;

    const exp2Res = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'LABOUR',
        amount: 80000, // ₹800
        date: testDate.toISOString(),
        paymentMethod: 'UPI',
        paidTo: 'Ramesh Labour Group',
        notes: 'Unloading cement bags',
      }),
    });
    const exp2Data = await exp2Res.json();
    if (exp2Res.status !== 201) {
      throw new Error(`Expense 2 failed: ${JSON.stringify(exp2Data)}`);
    }
    expenseId2 = exp2Data.data._id;
    console.log(`✅ Expenses logged: #${exp1Data.data.expenseNumber} & #${exp2Data.data.expenseNumber}`);

    // 4. Verify Expenses List & Summary
    console.log('\n4. Testing Expenses List & Summary...');
    const expListRes = await fetch(
      `${baseUrl}/expenses?startDate=${dateStart}T00:00:00.000Z&endDate=${dateEnd}T23:59:59.999Z`,
      { headers: authHeaders }
    );
    const expListData = await expListRes.json();
    const expSummary = expListData.data.summary;
    if (expSummary.totalExpenses !== 130000 || expSummary.cashExpenses !== 50000 || expSummary.digitalExpenses !== 80000) {
      throw new Error(`Expense summary mismatch: ${JSON.stringify(expSummary)}`);
    }
    console.log(`✅ Expenses summary verified: Total ₹1,300 (Cash ₹500, Digital ₹800)`);

    // 5. Verify Cash Book deducts Cash Expenses
    console.log('\n5. Testing Cash Book Expense Deduction...');
    const cbRes = await fetch(`${baseUrl}/accounting/cash-book?date=${dateStart}`, {
      headers: authHeaders,
    });
    const cbData = await cbRes.json();
    const cashBook = cbData.data;
    // Cash inflow = ₹2,000, Cash expense = ₹500 -> Net Cash In Drawer = ₹1,500 (150000 paise)
    if (cashBook.cashDrawer.cashExpenses !== 50000 || cashBook.cashDrawer.netCashInDrawer !== 150000) {
      throw new Error(`Cash book net cash mismatch: ${JSON.stringify(cashBook.cashDrawer)}`);
    }
    console.log(`✅ Cash Book reconciled: Inflow ₹2,000 - Expense ₹500 = Net Cash ₹1,500`);

    // 6. Verify Profit & Loss Report
    console.log('\n6. Testing Profit & Loss Report...');
    const plRes = await fetch(
      `${baseUrl}/reports/profit-loss?startDate=${dateStart}&endDate=${dateEnd}`,
      { headers: authHeaders }
    );
    const plData = await plRes.json();
    const pl = plData.data;
    // Revenue = ₹3,800 (380000), COGS = 10 * ₹300 = ₹3,000 (300000), Gross Profit = ₹800 (80000)
    // Expenses = ₹1,300 (130000), Net Profit = -₹500 (-50000)
    if (
      pl.revenue.totalRevenue !== 380000 ||
      pl.cogs.totalCogs !== 300000 ||
      pl.grossProfit !== 80000 ||
      pl.operatingExpenses.totalOperatingExpenses !== 130000 ||
      pl.netProfit !== -50000
    ) {
      throw new Error(`P&L mismatch: ${JSON.stringify(pl)}`);
    }
    console.log(`✅ P&L verified: Revenue ₹3,800 - COGS ₹3,000 = Gross ₹800; Net Profit -₹500`);

    // 7. Verify Sales Summary, Cash Flow & Stock Valuation
    console.log('\n7. Testing Sales Summary, Cash Flow & Stock Valuation Reports...');
    const [salesSumRes, cashFlowRes, stockValRes] = await Promise.all([
      fetch(`${baseUrl}/reports/sales-summary?startDate=${dateStart}&endDate=${dateEnd}`, { headers: authHeaders }),
      fetch(`${baseUrl}/reports/cash-flow?startDate=${dateStart}&endDate=${dateEnd}`, { headers: authHeaders }),
      fetch(`${baseUrl}/reports/stock-valuation`, { headers: authHeaders }),
    ]);

    const salesSum = (await salesSumRes.json()).data;
    const cashFlow = (await cashFlowRes.json()).data;
    const stockVal = (await stockValRes.json()).data;

    if (salesSum.summary.totalRevenue !== 380000 || salesSum.materialBreakdown[0].totalQuantity !== 10) {
      throw new Error(`Sales summary mismatch: ${JSON.stringify(salesSum)}`);
    }
    if (cashFlow.inflows.totalInflow !== 200000 || cashFlow.outflows.totalOutflow !== 130000 || cashFlow.netCashFlow !== 70000) {
      throw new Error(`Cash flow mismatch: ${JSON.stringify(cashFlow)}`);
    }
    if (stockVal.summary.totalCostValue <= 0 || stockVal.summary.totalRetailValue <= 0) {
      throw new Error(`Stock valuation mismatch: ${JSON.stringify(stockVal.summary)}`);
    }
    console.log(`✅ Sales Summary, Cash Flow (Net +₹700), & Stock Valuation reports verified`);

    console.log('\n🎉 ALL PHASE 10 EXPENSES & FINANCIAL REPORTS TESTS PASSED 100%!\n');
  } finally {
    console.log('Cleaning up test data...');
    if (customerId) {
      await Customer.findByIdAndDelete(customerId);
      await LedgerEntry.deleteMany({ customerId });
    }
    if (materialId) await Material.findByIdAndDelete(materialId);
    if (saleId) await Sale.findByIdAndDelete(saleId);
    if (expenseId1) await Expense.findByIdAndDelete(expenseId1);
    if (expenseId2) await Expense.findByIdAndDelete(expenseId2);
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runExpensesReportsTests().catch((err) => {
  console.error('❌ Phase 10 Test Failed:', err);
  process.exit(1);
});
