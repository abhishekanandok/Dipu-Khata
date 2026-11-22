import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { StockMovement } from '../src/modules/inventory/stockMovement.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Estimate } from '../src/modules/sales/estimate.model.js';
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

async function runSalesTests() {
  console.log('🚀 Starting Phase 6 Estimates & Sales Billing Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5006, resolve));
  const baseUrl = 'http://localhost:5006/api';

  // 0. Setup Mock Admin User
  const testUser = await User.create({
    name: 'Sales Verification Admin',
    email: `sales_tester_${Date.now()}@dipukhata.com`,
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
  let baluId = '';
  let cementId = '';
  let estimateId = '';
  let convertedSaleId = '';
  let directSaleId = '';

  try {
    // 1. Create Test Customer
    console.log('1. Setting up test customer...');
    const cust = await Customer.create({
      name: 'Ramesh Singh (Thekedar)',
      mobile: '9835012345',
      village: 'Bikrampur',
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 0,
    });
    customerId = cust._id.toString();
    console.log(`✅ Customer created: ${cust.name} (Balance: ₹${cust.currentBalance / 100})`);

    // 2. Create Test Materials
    console.log('2. Setting up test materials with stock...');
    const balu = await Material.create({
      name: `Balu Sand Test ${Date.now()}`,
      categoryName: 'Balu',
      defaultUnit: 'CFT',
      purchaseRate: 3500, // ₹35
      sellingRate: 4500,  // ₹45
      currentStock: 1000,
      minimumStockAlert: 100,
    });
    baluId = balu._id.toString();

    const cement = await Material.create({
      name: `Cement ACC Test ${Date.now()}`,
      categoryName: 'Cement',
      defaultUnit: 'BAG',
      purchaseRate: 34000, // ₹340
      sellingRate: 38000,  // ₹380
      currentStock: 200,
      minimumStockAlert: 20,
    });
    cementId = cement._id.toString();
    console.log(`✅ Materials created: Balu (${balu.currentStock} CFT) & Cement (${cement.currentStock} Bags)`);

    // 3. Test Estimate Creation
    console.log('\n3. Testing Estimate Creation...');
    const estimateRes = await fetch(`${baseUrl}/estimates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        customerName: cust.name,
        customerMobile: cust.mobile,
        village: 'Bikrampur',
        items: [
          { materialId: baluId, quantity: 100, unit: 'CFT', rate: 4500 }, // 450,000 paise (₹4500)
          { materialId: cementId, quantity: 20, unit: 'BAG', rate: 38000 }, // 760,000 paise (₹7600)
        ],
        transportCharges: 50000, // ₹500
        discount: 10000,        // ₹100
        notes: 'Quote for house slab construction',
      }),
    });

    const estimateData = await estimateRes.json();
    if (estimateRes.status !== 201) {
      throw new Error(`Estimate creation failed: ${JSON.stringify(estimateData)}`);
    }

    const createdEstimate = estimateData.data;
    estimateId = createdEstimate._id;
    console.log(`✅ Estimate created: #${createdEstimate.estimateNumber}`);
    console.log(`   Subtotal: ₹${createdEstimate.subtotal / 100}, Grand Total: ₹${createdEstimate.grandTotal / 100}`);

    if (!createdEstimate.estimateNumber.startsWith('EST-')) {
      throw new Error(`Estimate number format invalid: ${createdEstimate.estimateNumber}`);
    }
    if (createdEstimate.grandTotal !== 1250000) { // 4500 + 7600 + 500 - 100 = 12500
      throw new Error(`Estimate grandTotal mismatch: expected 1250000, got ${createdEstimate.grandTotal}`);
    }

    // 4. Test Converting Estimate to Active Retail Sale (with Split Payment & Stock Deduction)
    console.log('\n4. Testing Convert Estimate to Sale (Split Payment: Cash + UPI + Khata)...');
    const convertRes = await fetch(`${baseUrl}/estimates/${estimateId}/convert`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        payments: [
          { amount: 500000, method: 'CASH' }, // ₹5,000 cash
          { amount: 250000, method: 'UPI', referenceNumber: 'UPI/611299/RAMESH' }, // ₹2,500 UPI
        ],
        autoStockDeduction: true,
      }),
    });

    const convertData = await convertRes.json();
    if (convertRes.status !== 200) {
      throw new Error(`Estimate conversion failed: ${JSON.stringify(convertData)}`);
    }

    const saleFromEst = convertData.data.sale;
    convertedSaleId = saleFromEst._id;
    console.log(`✅ Converted into Invoice: #${saleFromEst.invoiceNumber}`);
    console.log(`   Grand Total: ₹${saleFromEst.grandTotal / 100}`);
    console.log(`   Paid: ₹${saleFromEst.amountPaid / 100} (Status: ${saleFromEst.paymentStatus})`);
    console.log(`   Remaining Khata Due: ₹${saleFromEst.balanceDue / 100}`);

    if (!saleFromEst.invoiceNumber.startsWith('DK-')) {
      throw new Error(`Invoice number format invalid: ${saleFromEst.invoiceNumber}`);
    }
    if (saleFromEst.paymentStatus !== 'PARTIAL') {
      throw new Error(`Expected PARTIAL payment status, got ${saleFromEst.paymentStatus}`);
    }
    if (saleFromEst.balanceDue !== 500000) { // ₹5,000
      throw new Error(`Expected balanceDue 500000, got ${saleFromEst.balanceDue}`);
    }

    // Check customer ledger & balance
    const updatedCustomer1 = await Customer.findById(customerId);
    console.log(`   Customer Current Balance in DB: ₹${updatedCustomer1!.currentBalance / 100}`);
    if (updatedCustomer1!.currentBalance !== 500000) {
      throw new Error(`Customer currentBalance expected 500000 (₹5,000), got ${updatedCustomer1!.currentBalance}`);
    }

    // Verify ledger entries created for customer
    const ledgerEntries = await LedgerEntry.find({ customerId }).sort({ createdAt: 1 });
    console.log(`   Ledger Entries Count: ${ledgerEntries.length}`);
    const saleDebit = ledgerEntries.find((e) => e.entryType === 'SALE');
    const paymentCredit = ledgerEntries.find((e) => e.entryType === 'PAYMENT');

    if (!saleDebit || saleDebit.debit !== 1250000) {
      throw new Error(`Sale debit entry missing or incorrect: ${JSON.stringify(saleDebit)}`);
    }
    if (!paymentCredit || paymentCredit.credit !== 750000) {
      throw new Error(`Payment credit entry missing or incorrect: ${JSON.stringify(paymentCredit)}`);
    }
    console.log(`✅ Customer Ledger correctly updated: Debit ₹${saleDebit.debit / 100}, Credit ₹${paymentCredit.credit / 100}`);

    // Verify stock decrement & stock movements
    const updatedBalu = await Material.findById(baluId);
    const updatedCement = await Material.findById(cementId);
    console.log(`   Stock: Balu = ${updatedBalu!.currentStock} (was 1000), Cement = ${updatedCement!.currentStock} (was 200)`);
    if (updatedBalu!.currentStock !== 900) {
      throw new Error(`Balu stock mismatch: expected 900, got ${updatedBalu!.currentStock}`);
    }
    if (updatedCement!.currentStock !== 180) {
      throw new Error(`Cement stock mismatch: expected 180, got ${updatedCement!.currentStock}`);
    }

    const movements = await StockMovement.find({ referenceId: saleFromEst.invoiceNumber });
    if (movements.length !== 2) {
      throw new Error(`Expected 2 StockMovement entries, found ${movements.length}`);
    }
    console.log(`✅ Stock and Outward movements logged correctly`);

    // 5. Test Direct Counter Sale (Fully Unpaid / Udhar)
    console.log('\n5. Testing Direct Counter Sale (Full Credit / Udhar)...');
    const directSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        items: [
          { materialId: cementId, quantity: 50, unit: 'BAG', rate: 38000 }, // 50 * 380 = ₹19,000 (1,900,000 paise)
        ],
        discount: 0,
        transportCharges: 0,
        payments: [],
        autoStockDeduction: true,
      }),
    });

    const directSaleData = await directSaleRes.json();
    if (directSaleRes.status !== 201) {
      throw new Error(`Direct sale creation failed: ${JSON.stringify(directSaleData)}`);
    }

    const directSale = directSaleData.data;
    directSaleId = directSale._id;
    console.log(`✅ Direct Sale created: #${directSale.invoiceNumber}`);
    console.log(`   Grand Total: ₹${directSale.grandTotal / 100}, Payment Status: ${directSale.paymentStatus}`);

    if (directSale.paymentStatus !== 'UNPAID') {
      throw new Error(`Expected UNPAID, got ${directSale.paymentStatus}`);
    }

    const updatedCustomer2 = await Customer.findById(customerId);
    console.log(`   Customer Current Balance in DB: ₹${updatedCustomer2!.currentBalance / 100}`);
    // ₹5,000 (from previous) + ₹19,000 = ₹24,000
    if (updatedCustomer2!.currentBalance !== 2400000) {
      throw new Error(`Customer currentBalance expected 2400000, got ${updatedCustomer2!.currentBalance}`);
    }
    console.log(`✅ Customer Khata Due properly accumulated to ₹24,000`);

    // 6. Test Idempotency Key Handling
    console.log('\n6. Testing Idempotency Key duplicate request protection...');
    const idemCustomer = await Customer.create({
      name: 'Idempotency Tester',
      mobile: '9835099999',
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 0,
    });

    const idemKey = `IDEM-TEST-${Date.now()}`;
    const firstCall = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idemKey },
      body: JSON.stringify({
        customerId: idemCustomer._id.toString(),
        items: [{ materialId: baluId, quantity: 10, unit: 'CFT', rate: 4500 }],
        payments: [],
      }),
    });
    const firstCallData = await firstCall.json();
    const firstInvoice = firstCallData.data.invoiceNumber;

    const secondCall = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idemKey },
      body: JSON.stringify({
        customerId: idemCustomer._id.toString(),
        items: [{ materialId: baluId, quantity: 10, unit: 'CFT', rate: 4500 }],
        payments: [],
      }),
    });
    const secondCallData = await secondCall.json();
    const secondInvoice = secondCallData.data.invoiceNumber;

    if (firstInvoice !== secondInvoice) {
      throw new Error(`Idempotency failed: generated different invoices (${firstInvoice} vs ${secondInvoice})`);
    }
    console.log(`✅ Idempotency verified: duplicate submission returned identical invoice #${firstInvoice}`);
    await Customer.findByIdAndDelete(idemCustomer._id);
    await LedgerEntry.deleteMany({ customerId: idemCustomer._id });
    await Sale.deleteOne({ invoiceNumber: firstInvoice });

    // 7. Test Sale Cancellation with Ledger & Stock Reversal
    console.log('\n7. Testing Sale Cancellation with Ledger & Stock Reversal...');
    const cancelRes = await fetch(`${baseUrl}/sales/${directSaleId}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        reason: 'Customer cancelled order before unloading',
      }),
    });

    const cancelData = await cancelRes.json();
    if (cancelRes.status !== 200) {
      throw new Error(`Sale cancellation failed: ${JSON.stringify(cancelData)}`);
    }

    const cancelledSale = cancelData.data;
    if (!cancelledSale.isCancelled) {
      throw new Error(`Sale isCancelled should be true`);
    }

    const updatedCustomer3 = await Customer.findById(customerId);
    console.log(`   Customer Current Balance after cancellation: ₹${updatedCustomer3!.currentBalance / 100}`);
    // Should be restored back to ₹5,000 (after subtracting the cancelled ₹19,000)
    if (updatedCustomer3!.currentBalance !== 500000) {
      throw new Error(`Expected balance restored to 500000, got ${updatedCustomer3!.currentBalance}`);
    }

    // Verify cement stock was restored by 50 bags
    const restoredCement = await Material.findById(cementId);
    console.log(`   Cement stock after cancellation reversal: ${restoredCement!.currentStock} (was 130)`);
    if (restoredCement!.currentStock !== 180) {
      throw new Error(`Cement stock not restored: expected 180, got ${restoredCement!.currentStock}`);
    }
    console.log(`✅ Sale cancellation successfully reversed customer ledger and restored material stock`);

    // 8. Test Sales Listing & Analytics Summary
    console.log('\n8. Testing Sales List & Summary API...');
    const listRes = await fetch(`${baseUrl}/sales`, {
      method: 'GET',
      headers: authHeaders,
    });
    const listData = await listRes.json();
    if (listRes.status !== 200) {
      throw new Error(`Sales list failed: ${JSON.stringify(listData)}`);
    }

    console.log(`   Fetched ${listData.data.sales.length} active sales.`);
    console.log(`   Summary Totals -> Invoiced: ₹${listData.data.summary.totalInvoiced / 100}, Paid: ₹${listData.data.summary.totalPaid / 100}, Due: ₹${listData.data.summary.totalDue / 100}`);
    if (listData.data.summary.totalInvoiced <= 0) {
      throw new Error(`Expected positive totalInvoiced`);
    }
    console.log(`✅ Sales queries and real-time aggregations verified`);

    console.log('\n🎉 ALL PHASE 6 ESTIMATES & SALES BILLING TESTS PASSED 100%!\n');
  } finally {
    // Cleanup test records
    console.log('Cleaning up test data...');
    if (customerId) {
      await Customer.findByIdAndDelete(customerId);
      await LedgerEntry.deleteMany({ customerId });
    }
    if (baluId) await Material.findByIdAndDelete(baluId);
    if (cementId) await Material.findByIdAndDelete(cementId);
    if (estimateId) await Estimate.findByIdAndDelete(estimateId);
    if (convertedSaleId) await Sale.findByIdAndDelete(convertedSaleId);
    if (directSaleId) await Sale.findByIdAndDelete(directSaleId);
    await StockMovement.deleteMany({ reason: { $regex: /Billed|Restored/i } });
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runSalesTests().catch((err) => {
  console.error('❌ Phase 6 Test Failed:', err);
  process.exit(1);
});
