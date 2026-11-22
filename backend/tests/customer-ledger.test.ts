import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

async function runCustomerLedgerTests() {
  console.log('🚀 Starting Phase 3 Customer Management & Digital Khata Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5003, resolve));
  const baseUrl = 'http://localhost:5003/api/customers';

  // Create mock authenticated admin
  const testUser = await User.create({
    name: 'Khata Tester Admin',
    email: `khata_${Date.now()}@dipukhata.com`,
    passwordHash: 'hashed_dummy',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let customer1Id = '';
  let customer2Id = '';

  try {
    // 1. Create Customer with Opening Balance (Receivable / Lena Hai)
    console.log('1. Testing Customer Creation with Opening Balance (Receivable)...');
    const cust1Res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Vikas Construction',
        mobile: '9876543211',
        village: 'Kalyanpur',
        address: 'Near Old Water Tank',
        openingBalance: 2500000, // ₹25,000 in paise
        openingBalanceType: 'RECEIVABLE',
      }),
    });
    const cust1Data = await cust1Res.json();
    if (cust1Res.status !== 201 || !cust1Data.data.customer) {
      throw new Error(`Failed to create customer 1: ${JSON.stringify(cust1Data)}`);
    }
    customer1Id = cust1Data.data.customer._id;

    if (cust1Data.data.customer.currentBalance !== 2500000) {
      throw new Error(`Expected current balance 2500000 paise, got ${cust1Data.data.customer.currentBalance}`);
    }
    console.log('   ✅ Customer created with current balance ₹25,000.');

    // 2. Verify Initial Ledger Entry
    console.log('2. Verifying Automatic Opening Balance Ledger Entry...');
    const ledger1Res = await fetch(`${baseUrl}/${customer1Id}/ledger`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const ledger1Data = await ledger1Res.json();
    const entries = ledger1Data.data;

    if (entries.length !== 1) {
      throw new Error(`Expected 1 ledger entry, got ${entries.length}`);
    }
    const initialEntry = entries[0];
    if (
      initialEntry.entryType !== 'OPENING_BALANCE' ||
      initialEntry.debit !== 2500000 ||
      initialEntry.runningBalance !== 2500000
    ) {
      throw new Error(`Invalid opening ledger entry: ${JSON.stringify(initialEntry)}`);
    }
    console.log('   ✅ Opening balance ledger entry verified: Debit ₹25,000, Running Balance ₹25,000.');

    // 3. Create Customer with Advance / Payable Balance (Dena Hai)
    console.log('3. Testing Customer Creation with Advance Balance (Payable)...');
    const cust2Res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Suresh Mistri',
        mobile: '9876543222',
        village: 'Shivpur',
        openingBalance: 500000, // ₹5,000 in paise
        openingBalanceType: 'PAYABLE',
      }),
    });
    const cust2Data = await cust2Res.json();
    if (cust2Res.status !== 201) {
      throw new Error(`Failed to create customer 2: ${JSON.stringify(cust2Data)}`);
    }
    customer2Id = cust2Data.data.customer._id;
    if (cust2Data.data.customer.currentBalance !== -500000) {
      throw new Error(`Expected negative current balance -500000, got ${cust2Data.data.customer.currentBalance}`);
    }
    console.log('   ✅ Advance customer created with balance -₹5,000.');

    // 4. Test Customer List Filters (with_dues & advance)
    console.log('4. Testing Customer List Filtering...');
    const duesRes = await fetch(`${baseUrl}?filter=with_dues`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const duesData = await duesRes.json();
    const foundDue = duesData.data.some((c: any) => c._id === customer1Id);
    if (!foundDue) {
      throw new Error('Customer 1 was not found in with_dues filter!');
    }

    const advanceRes = await fetch(`${baseUrl}?filter=advance`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const advanceData = await advanceRes.json();
    const foundAdvance = advanceData.data.some((c: any) => c._id === customer2Id);
    if (!foundAdvance) {
      throw new Error('Customer 2 was not found in advance filter!');
    }
    console.log('   ✅ Filters (with_dues, advance) verified successfully.');

    // 5. Test Search by Name & Village
    console.log('5. Testing Search by Name and Village...');
    const searchRes = await fetch(`${baseUrl}?search=Vikas`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const searchData = await searchRes.json();
    if (searchData.data.length === 0 || searchData.data[0]._id !== customer1Id) {
      throw new Error('Search by name failed');
    }
    console.log('   ✅ Search by name passed.');

    // 6. Test Adjustment Entry
    console.log('6. Testing Adjustment Entry (+₹2,000 Loading Charge Debit)...');
    const adjRes = await fetch(`${baseUrl}/${customer1Id}/adjustment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        amount: 200000, // ₹2,000 in paise
        type: 'DEBIT',
        description: 'Tractor Unloading Extra Labour',
      }),
    });
    const adjData = await adjRes.json();
    if (adjRes.status !== 201) {
      throw new Error(`Adjustment failed: ${JSON.stringify(adjData)}`);
    }
    if (adjData.data.runningBalance !== 2700000) {
      throw new Error(`Expected running balance 2700000 paise (₹27,000), got ${adjData.data.runningBalance}`);
    }

    // Verify updated customer balance
    const cust1UpdatedRes = await fetch(`${baseUrl}/${customer1Id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cust1Updated = (await cust1UpdatedRes.json()).data;
    if (cust1Updated.currentBalance !== 2700000) {
      throw new Error(`Expected updated customer balance 2700000, got ${cust1Updated.currentBalance}`);
    }
    console.log('   ✅ Adjustment entry verified: New customer balance is exactly ₹27,000.');

    // 7. Verify Customer Summary
    console.log('7. Testing Customer Financial Summary...');
    const summaryRes = await fetch(`${baseUrl}/${customer1Id}/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const summaryData = (await summaryRes.json()).data;
    if (summaryData.financials.currentBalance !== 2700000) {
      throw new Error('Summary financials currentBalance mismatch');
    }
    console.log('   ✅ Customer financial summary verified.');

    // 8. Clean up
    console.log('8. Cleaning up test customers and ledgers...');
    await Customer.deleteMany({ _id: { $in: [customer1Id, customer2Id] } });
    await LedgerEntry.deleteMany({ customerId: { $in: [customer1Id, customer2Id] } });
    await User.deleteOne({ _id: testUser._id });
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL PHASE 3 CUSTOMER & KHATA TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runCustomerLedgerTests().catch((err) => {
  console.error('\n❌ CUSTOMER LEDGER TEST RUNNER FAILED:', err);
  process.exit(1);
});
