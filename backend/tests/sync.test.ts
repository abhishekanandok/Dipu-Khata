import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { Expense } from '../src/modules/expenses/expense.model.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

async function runSyncTests() {
  console.log('🚀 Starting Phase 11 Offline Sync Batch & Delta Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5011, resolve));
  const baseUrl = 'http://localhost:5011/api';

  const testUser = await User.create({
    name: 'Sync Tester Admin',
    email: `sync_tester_${Date.now()}@dipukhata.com`,
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

  let materialId = '';
  let syncedCustomerId = '';
  let syncedSaleId = '';
  let syncedPaymentId = '';
  let syncedExpenseId = '';

  try {
    // 1. Create Material in catalog
    console.log('1. Setting up catalog material...');
    const mat = await Material.create({
      name: `Sync Balu Test ${Date.now()}`,
      categoryName: 'Balu',
      defaultUnit: 'CFT',
      purchaseRate: 3500,
      sellingRate: 4500,
      currentStock: 1000,
      minimumStockAlert: 50,
    });
    materialId = mat._id.toString();

    // 2. Simulate Offline Batch Sync (Customer -> Sale -> Payment -> Expense)
    const localCustId = `local-cust-${Date.now()}`;
    const localSaleId = `local-sale-${Date.now()}`;
    const localPayId = `local-pay-${Date.now()}`;
    const localExpId = `local-exp-${Date.now()}`;

    const custMobile = `9835${Math.floor(100000 + Math.random() * 899999)}`;
    const batchPayload = {
      operations: [
        {
          localId: localCustId,
          idempotencyKey: `idem-${localCustId}`,
          action: 'CREATE_CUSTOMER',
          payload: {
            name: 'Offline Synced Builder',
            mobile: custMobile,
            village: 'Bihta Godown',
            openingBalance: 0,
            openingBalanceType: 'RECEIVABLE',
          },
        },
        {
          localId: localSaleId,
          idempotencyKey: `idem-${localSaleId}`,
          action: 'CREATE_SALE',
          payload: {
            customerId: localCustId, // References offline customer created in op #1!
            items: [{ materialId, quantity: 100, unit: 'CFT', rate: 4500 }], // ₹4,500
            payments: [{ amount: 150000, method: 'CASH' }], // ₹1,500 paid -> ₹3,000 due
            autoStockDeduction: true,
          },
        },
        {
          localId: localPayId,
          idempotencyKey: `idem-${localPayId}`,
          action: 'CREATE_PAYMENT',
          payload: {
            customerId: localCustId,
            relatedSaleId: localSaleId, // References offline sale created in op #2!
            amount: 100000, // ₹1,000 -> remaining due ₹2,000
            paymentMethod: 'UPI',
            referenceNumber: 'UPI/OFFLINE/9911',
          },
        },
        {
          localId: localExpId,
          idempotencyKey: `idem-${localExpId}`,
          action: 'CREATE_EXPENSE',
          payload: {
            category: 'FUEL',
            amount: 30000, // ₹300
            paymentMethod: 'CASH',
            notes: 'Offline diesel entry',
          },
        },
      ],
    };

    console.log('2. Sending FIFO offline batch sync (4 operations)...');
    const syncRes = await fetch(`${baseUrl}/sync/batch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(batchPayload),
    });
    const syncData = await syncRes.json();
    if (syncRes.status !== 200) {
      throw new Error(`Batch sync failed: ${JSON.stringify(syncData)}`);
    }

    const { results, syncedCount, failedCount } = syncData.data;
    if (syncedCount !== 4 || failedCount !== 0) {
      throw new Error(`Expected 4 synced, 0 failed; got ${JSON.stringify(syncData.data)}`);
    }

    syncedCustomerId = results[0].serverId;
    syncedSaleId = results[1].serverId;
    syncedPaymentId = results[2].serverId;
    syncedExpenseId = results[3].serverId;

    console.log(`✅ All 4 offline operations synced FIFO:`);
    console.log(`   Customer ID: ${syncedCustomerId}`);
    console.log(`   Sale: #${results[1].serverNumber}, Payment: #${results[2].serverNumber}, Expense: #${results[3].serverNumber}`);

    // Verify customer balance: ₹4,500 - ₹1,500 - ₹1,000 = ₹2,000 (200000 paise)
    const custInDb = await Customer.findById(syncedCustomerId);
    if (!custInDb || custInDb.currentBalance !== 200000) {
      throw new Error(`Expected customer balance 200000, got ${custInDb?.currentBalance}`);
    }
    console.log(`✅ Customer balance accurately computed via FIFO sync: ₹2,000`);

    // 3. Test Idempotent Retry of the exact same batch
    console.log('\n3. Testing Idempotent Retry of identical offline batch...');
    const retryRes = await fetch(`${baseUrl}/sync/batch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(batchPayload),
    });
    const retryData = await retryRes.json();
    const retryResults = retryData.data.results;

    if (
      retryResults[1].serverNumber !== results[1].serverNumber ||
      retryResults[2].serverNumber !== results[2].serverNumber
    ) {
      throw new Error(`Idempotency failed on retry: ${JSON.stringify(retryResults)}`);
    }

    const custAfterRetry = await Customer.findById(syncedCustomerId);
    if (custAfterRetry!.currentBalance !== 200000) {
      throw new Error(`Balance changed after idempotent retry: ${custAfterRetry!.currentBalance}`);
    }
    console.log(`✅ Idempotent retry returned identical invoice #${retryResults[1].serverNumber} & payment #${retryResults[2].serverNumber} with zero duplication`);

    // 4. Test Offline Cache Delta Pull
    console.log('\n4. Testing GET /api/sync/pull for SQLite cache...');
    const pullRes = await fetch(`${baseUrl}/sync/pull`, {
      headers: authHeaders,
    });
    const pullData = await pullRes.json();
    if (pullRes.status !== 200 || !pullData.data.serverTimestamp) {
      throw new Error(`Delta pull failed: ${JSON.stringify(pullData)}`);
    }
    console.log(
      `✅ Delta pull returned ${pullData.data.customers.length} customers, ${pullData.data.materials.length} materials, ${pullData.data.sales.length} sales`
    );

    console.log('\n🎉 ALL PHASE 11 OFFLINE SYNC TESTS PASSED 100%!\n');
  } finally {
    console.log('Cleaning up test data...');
    if (syncedCustomerId) {
      await Customer.findByIdAndDelete(syncedCustomerId);
      await LedgerEntry.deleteMany({ customerId: syncedCustomerId });
    }
    if (materialId) await Material.findByIdAndDelete(materialId);
    if (syncedSaleId) await Sale.findByIdAndDelete(syncedSaleId);
    if (syncedPaymentId) await Payment.findByIdAndDelete(syncedPaymentId);
    if (syncedExpenseId) await Expense.findByIdAndDelete(syncedExpenseId);
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runSyncTests().catch((err) => {
  console.error('❌ Phase 11 Test Failed:', err);
  process.exit(1);
});
