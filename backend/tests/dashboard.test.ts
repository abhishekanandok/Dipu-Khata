import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

async function runDashboardTests() {
  console.log('🚀 Starting Phase 2 Dashboard Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5002, resolve));
  const baseUrl = 'http://localhost:5002/api/dashboard';

  // 1. Create a mock authenticated user & token
  const testUser = await User.create({
    name: 'Dashboard Tester',
    email: `dash_${Date.now()}@dipukhata.com`,
    passwordHash: 'hashed_dummy',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // Test 1: Unauthorized access check
    console.log('1. Testing Unauthorized Request Rejection...');
    const unauthRes = await fetch(`${baseUrl}/summary`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log('   ✅ Unauthorized request correctly rejected with 401.');

    // Test 2: Authenticated request on empty/existing data
    console.log('2. Testing Dashboard Summary on Empty State...');
    const authRes = await fetch(`${baseUrl}/summary?filter=today`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const authData = await authRes.json();
    if (authRes.status !== 200 || !authData.data) {
      throw new Error(`Failed to fetch dashboard: ${JSON.stringify(authData)}`);
    }
    console.log('   ✅ Dashboard summary returned successfully with period:', authData.data.period);

    // Test 3: Insert realistic data and verify real calculations
    console.log('3. Inserting Test Customer, Material, Sale, and Payment...');
    const customer = await Customer.create({
      name: 'Ramesh Balu Trader',
      mobile: '9876543210',
      village: 'Kalyanpur',
      currentBalance: 1500000, // ₹15,000 due
    });

    const material = await Material.create({
      name: 'Balu White Sand',
      category: 'Balu',
      defaultUnit: 'CFT',
      purchaseRate: 3500, // ₹35 / CFT
      sellingRate: 4500, // ₹45 / CFT
      currentStock: 5, // Below alert of 10
      minimumStockAlert: 10,
    });

    const sale = await Sale.create({
      invoiceNumber: `TEST-INV-${Date.now()}`,
      customerId: customer._id,
      saleDate: new Date(),
      items: [
        {
          materialId: material._id,
          materialName: material.name,
          quantity: 100,
          unit: 'CFT',
          rate: 4500,
          lineTotal: 450000,
        },
      ],
      subtotal: 450000,
      grandTotal: 450000, // ₹4,500
      amountPaid: 200000, // ₹2,000 paid
      balanceDue: 250000, // ₹2,500 credit
      paymentStatus: 'PARTIAL',
    });

    const payment = await Payment.create({
      paymentNumber: `TEST-PAY-${Date.now()}`,
      customerId: customer._id,
      paymentDate: new Date(),
      amount: 200000, // ₹2,000 Cash
      paymentMethod: 'CASH',
    });

    // Test 4: Query dashboard and verify live aggregated values
    console.log('4. Verifying Real Calculated Dashboard Values...');
    const summaryRes = await fetch(`${baseUrl}/summary?filter=today`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const summaryData = (await summaryRes.json()).data;

    console.log('   -> Sales Total:', summaryData.sales.totalSales, 'paise (expected: >= 450000)');
    console.log('   -> Cash Collections:', summaryData.collections.cashAmount, 'paise (expected: >= 200000)');
    console.log('   -> Outstanding Receivables:', summaryData.outstanding.totalReceivable, 'paise (expected: >= 1500000)');
    console.log('   -> Low Stock Count:', summaryData.inventory.lowStockCount, '(expected: >= 1)');

    if (summaryData.sales.totalSales < 450000) {
      throw new Error('Sales total was not aggregated accurately!');
    }
    if (summaryData.collections.cashAmount < 200000) {
      throw new Error('Cash collection was not aggregated accurately!');
    }
    if (summaryData.outstanding.totalReceivable < 1500000) {
      throw new Error('Customer dues were not aggregated accurately!');
    }
    if (summaryData.inventory.lowStockCount < 1) {
      throw new Error('Low stock alert was not identified!');
    }

    console.log('   ✅ Live calculations matched actual database records!');

    // Test 5: Verify Date Filters (yesterday, this_week, this_month)
    console.log('5. Testing Date Filter Presets...');
    for (const filter of ['yesterday', 'this_week', 'this_month']) {
      const filterRes = await fetch(`${baseUrl}/summary?filter=${filter}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (filterRes.status !== 200) {
        throw new Error(`Filter ${filter} failed`);
      }
    }
    console.log('   ✅ All date filters tested and working.');

    // Clean up test data
    console.log('6. Cleaning up test data...');
    await Customer.deleteOne({ _id: customer._id });
    await Material.deleteOne({ _id: material._id });
    await Sale.deleteOne({ _id: sale._id });
    await Payment.deleteOne({ _id: payment._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL PHASE 2 DASHBOARD BACKEND TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runDashboardTests().catch((err) => {
  console.error('\n❌ DASHBOARD TEST RUNNER FAILED:', err);
  process.exit(1);
});
