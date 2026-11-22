import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

async function runPaymentsCashBookTests() {
  console.log('🚀 Starting Phase 7 Payment Collection & Cash Book Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5007, resolve));
  const baseUrl = 'http://localhost:5007/api';

  // 0. Setup Mock Admin User
  const testUser = await User.create({
    name: 'Payments Tester Admin',
    email: `payments_tester_${Date.now()}@dipukhata.com`,
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
  let paymentId1 = '';
  let paymentId2 = '';
  let saleId = '';
  let materialId = '';

  try {
    // 1. Create Customer with ₹10,000 Opening Due
    console.log('1. Setting up test customer with ₹10,000 due...');
    const cust = await Customer.create({
      name: 'Sunil Verma Contractor',
      mobile: '9835044444',
      village: 'Maner',
      openingBalance: 1000000, // ₹10,000
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 1000000,
    });
    customerId = cust._id.toString();
    console.log(`✅ Customer created: ${cust.name} (Balance: ₹${cust.currentBalance / 100})`);

    // 2. Record Standalone Cash Payment of ₹4,000 (400,000 paise)
    console.log('\n2. Testing Standalone Cash Collection (₹4,000)...');
    const cashPayRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        amount: 400000, // ₹4,000
        paymentMethod: 'CASH',
        notes: 'Cash handed at counter by Sunil',
      }),
    });

    const cashPayData = await cashPayRes.json();
    if (cashPayRes.status !== 201) {
      throw new Error(`Cash payment failed: ${JSON.stringify(cashPayData)}`);
    }

    const payment1 = cashPayData.data;
    paymentId1 = payment1._id;
    console.log(`✅ Payment recorded: #${payment1.paymentNumber}`);
    console.log(`   Amount: ₹${payment1.amount / 100}, Method: ${payment1.paymentMethod}`);

    if (!payment1.paymentNumber.startsWith('PAY-')) {
      throw new Error(`Payment number format invalid: ${payment1.paymentNumber}`);
    }

    // Check Customer Balance in DB
    const updatedCust1 = await Customer.findById(customerId);
    console.log(`   Customer Balance in DB: ₹${updatedCust1!.currentBalance / 100}`);
    if (updatedCust1!.currentBalance !== 600000) { // 10000 - 4000 = 6000
      throw new Error(`Customer balance expected 600000 (₹6,000), got ${updatedCust1!.currentBalance}`);
    }

    // Verify Ledger Entry
    const ledger1 = await LedgerEntry.findOne({ referenceId: payment1.paymentNumber });
    if (!ledger1 || ledger1.credit !== 400000) {
      throw new Error(`Ledger entry missing or incorrect: ${JSON.stringify(ledger1)}`);
    }
    console.log(`✅ Customer Ledger updated: Credit ₹${ledger1.credit / 100}, Running Balance: ₹${ledger1.runningBalance / 100}`);

    // 3. Record UPI Payment of ₹3,000 (300,000 paise) with UTR Ref
    console.log('\n3. Testing UPI Online Payment Collection (₹3,000)...');
    const upiPayRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        amount: 300000, // ₹3,000
        paymentMethod: 'UPI',
        referenceNumber: 'UPI/98350/SUNIL123',
        notes: 'Google Pay to shop QR',
      }),
    });

    const upiPayData = await upiPayRes.json();
    if (upiPayRes.status !== 201) {
      throw new Error(`UPI payment failed: ${JSON.stringify(upiPayData)}`);
    }

    const payment2 = upiPayData.data;
    paymentId2 = payment2._id;
    console.log(`✅ UPI Payment recorded: #${payment2.paymentNumber}`);

    const updatedCust2 = await Customer.findById(customerId);
    console.log(`   Customer Balance in DB: ₹${updatedCust2!.currentBalance / 100}`);
    if (updatedCust2!.currentBalance !== 300000) { // 6000 - 3000 = 3000
      throw new Error(`Customer balance expected 300000 (₹3,000), got ${updatedCust2!.currentBalance}`);
    }
    console.log(`✅ Customer Balance dropped accurately to ₹3,000`);

    // 4. Test Payment Linked to a Sale Invoice
    console.log('\n4. Testing Payment linked to an Invoice...');
    const testMat = await Material.create({
      name: `Test Bricks ${Date.now()}`,
      categoryName: 'Bricks',
      defaultUnit: 'PIECE',
      purchaseRate: 800,
      sellingRate: 1000, // ₹10/brick
      currentStock: 5000,
      minimumStockAlert: 100,
    });
    materialId = testMat._id.toString();

    // Create a bill for ₹5,000 (500 bricks @ ₹10), unpaid
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        items: [{ materialId, quantity: 500, unit: 'PIECE', rate: 1000 }],
        payments: [],
      }),
    });
    const saleData = await saleRes.json();
    const testSale = saleData.data;
    saleId = testSale._id;
    console.log(`   Created Sale #${testSale.invoiceNumber}: Grand Total ₹${testSale.grandTotal / 100}, Balance Due ₹${testSale.balanceDue / 100}`);

    // Now record ₹2,000 payment specifically against this sale
    const linkedPayRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        amount: 200000, // ₹2,000
        paymentMethod: 'CASH',
        relatedSaleId: saleId,
        notes: 'Partial settlement for brick bill',
      }),
    });
    const linkedPayData = await linkedPayRes.json();
    if (linkedPayRes.status !== 201) {
      throw new Error(`Linked payment failed: ${JSON.stringify(linkedPayData)}`);
    }

    // Verify Sale document updated
    const updatedSale = await Sale.findById(saleId);
    console.log(`   Sale updated: Paid ₹${updatedSale!.amountPaid / 100}, Remaining Due ₹${updatedSale!.balanceDue / 100}, Status: ${updatedSale!.paymentStatus}`);
    if (updatedSale!.amountPaid !== 200000 || updatedSale!.balanceDue !== 300000 || updatedSale!.paymentStatus !== 'PARTIAL') {
      throw new Error(`Sale document not updated correctly by linked payment`);
    }
    console.log(`✅ Invoice status and remaining balance automatically synchronized`);

    // 5. Test Idempotency Key Handling
    console.log('\n5. Testing Payment Idempotency Protection...');
    const idemKey = `PAY-IDEM-${Date.now()}`;
    const call1 = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idemKey },
      body: JSON.stringify({
        customerId,
        amount: 100000,
        paymentMethod: 'CASH',
      }),
    });
    const d1 = await call1.json();

    const call2 = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idemKey },
      body: JSON.stringify({
        customerId,
        amount: 100000,
        paymentMethod: 'CASH',
      }),
    });
    const d2 = await call2.json();

    if (d1.data.paymentNumber !== d2.data.paymentNumber) {
      throw new Error(`Idempotency failed: generated different payments (${d1.data.paymentNumber} vs ${d2.data.paymentNumber})`);
    }
    console.log(`✅ Idempotency verified: duplicate submission returned identical #${d1.data.paymentNumber}`);
    await Payment.findByIdAndDelete(d1.data._id);
    await LedgerEntry.deleteMany({ referenceId: d1.data.paymentNumber });

    // 6. Test Cash Book Daily Reconciliation API
    console.log('\n6. Testing Cash Book Daily Reconciliation API...');
    const cbRes = await fetch(`${baseUrl}/accounting/cash-book`, {
      method: 'GET',
      headers: authHeaders,
    });
    const cbData = await cbRes.json();
    if (cbRes.status !== 200) {
      throw new Error(`Cash book query failed: ${JSON.stringify(cbData)}`);
    }

    const cashBook = cbData.data;
    console.log(`   Cash Drawer -> Inflow: ₹${cashBook.cashDrawer.totalCashInflow / 100} (Sales: ₹${cashBook.cashDrawer.cashSales / 100}, Collections: ₹${cashBook.cashDrawer.cashCollections / 100})`);
    console.log(`   Digital Bank/UPI -> Inflow: ₹${cashBook.digitalAccounts.totalDigitalInflow / 100}`);
    console.log(`   Grand Total Inflow: ₹${cashBook.summary.totalInflow / 100} (${cashBook.summary.transactionsCount} txns)`);

    if (cashBook.cashDrawer.totalCashInflow <= 0) {
      throw new Error(`Expected positive cash drawer inflow`);
    }
    if (cashBook.digitalAccounts.totalDigitalInflow <= 0) {
      throw new Error(`Expected positive digital inflow`);
    }
    console.log(`✅ Daily Cash Book segregation verified`);

    // 7. Test Outstanding Aged Receivables API
    console.log('\n7. Testing Outstanding Aged Receivables API...');
    const outRes = await fetch(`${baseUrl}/accounting/outstanding`, {
      method: 'GET',
      headers: authHeaders,
    });
    const outData = await outRes.json();
    if (outRes.status !== 200) {
      throw new Error(`Outstanding query failed: ${JSON.stringify(outData)}`);
    }

    const outstanding = outData.data;
    console.log(`   Total Market Dues: ₹${outstanding.summary.totalOutstanding / 100}`);
    console.log(`   Customers with Dues: ${outstanding.summary.totalCustomersWithDues}`);
    console.log(`   Aging Brackets: 0-30 Days: ₹${outstanding.summary.agingBrackets.bracket0To30 / 100}, 31-60 Days: ₹${outstanding.summary.agingBrackets.bracket31To60 / 100}, 61+ Days: ₹${outstanding.summary.agingBrackets.bracket61Plus / 100}`);

    if (outstanding.summary.totalOutstanding <= 0) {
      throw new Error(`Expected positive total outstanding`);
    }
    console.log(`✅ Outstanding aged receivables report verified`);

    console.log('\n🎉 ALL PHASE 7 PAYMENT & CASH BOOK TESTS PASSED 100%!\n');
  } finally {
    console.log('Cleaning up test data...');
    if (customerId) {
      await Customer.findByIdAndDelete(customerId);
      await LedgerEntry.deleteMany({ customerId });
    }
    if (materialId) await Material.findByIdAndDelete(materialId);
    if (saleId) await Sale.findByIdAndDelete(saleId);
    if (paymentId1) await Payment.findByIdAndDelete(paymentId1);
    if (paymentId2) await Payment.findByIdAndDelete(paymentId2);
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runPaymentsCashBookTests().catch((err) => {
  console.error('❌ Phase 7 Test Failed:', err);
  process.exit(1);
});
