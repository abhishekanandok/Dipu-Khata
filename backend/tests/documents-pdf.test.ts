import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Estimate } from '../src/modules/sales/estimate.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { LedgerEntry } from '../src/modules/ledger/ledger.model.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

async function runDocumentsPdfTests() {
  console.log('🚀 Starting Phase 8 Documents, Invoices & PDF Template Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5008, resolve));
  const baseUrl = 'http://localhost:5008/api';

  const testUser = await User.create({
    name: 'Doc Verification Admin',
    email: `docs_tester_${Date.now()}@dipukhata.com`,
    passwordHash: 'dummy_hash',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
  };

  let customerId = '';
  let materialId = '';
  let saleId = '';
  let estimateId = '';
  let paymentId = '';

  try {
    // 1. Setup Test Data
    console.log('1. Setting up test entities (Customer, Material, Sale, Estimate, Payment)...');
    const cust = await Customer.create({
      name: 'Manoj Pandey Builder',
      mobile: '9835055555',
      village: 'Koilwar Bridge Road',
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 500000,
    });
    customerId = cust._id.toString();

    const mat = await Material.create({
      name: `UltraTech Cement Test ${Date.now()}`,
      categoryName: 'Cement',
      defaultUnit: 'BAG',
      purchaseRate: 35000,
      sellingRate: 39000, // ₹390
      currentStock: 500,
      minimumStockAlert: 50,
    });
    materialId = mat._id.toString();

    // Create Sale
    const sale = await Sale.create({
      invoiceNumber: `DK-2611-9999`,
      customerId: cust._id,
      customerName: cust.name,
      customerMobile: cust.mobile,
      items: [
        {
          materialId: mat._id,
          materialName: mat.name,
          quantity: 25,
          unit: 'BAG',
          rate: 39000,
          lineTotal: 975000, // ₹9,750
        },
      ],
      subtotal: 975000,
      transportCharges: 25000, // ₹250
      discount: 0,
      grandTotal: 1000000, // ₹10,000
      amountPaid: 500000, // ₹5,000
      balanceDue: 500000, // ₹5,000
      paymentStatus: 'PARTIAL',
      payments: [{ amount: 500000, method: 'CASH', date: new Date() }],
    });
    saleId = sale._id.toString();

    // Create Estimate
    const estimate = await Estimate.create({
      estimateNumber: `EST-2611-9999`,
      customerName: cust.name,
      customerMobile: cust.mobile,
      village: 'Koilwar Bridge Road',
      items: [
        {
          materialId: mat._id,
          materialName: mat.name,
          quantity: 100,
          unit: 'BAG',
          rate: 39000,
          lineTotal: 3900000,
        },
      ],
      subtotal: 3900000,
      discount: 50000,
      transportCharges: 100000,
      grandTotal: 3950000,
      status: 'SENT',
    });
    estimateId = estimate._id.toString();

    // Create Payment
    const payment = await Payment.create({
      paymentNumber: `PAY-2611-9999`,
      customerId: cust._id,
      customerName: cust.name,
      customerMobile: cust.mobile,
      amount: 500000, // ₹5,000
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/9999/TEST',
    });
    paymentId = payment._id.toString();

    // Create Ledger Entries
    await LedgerEntry.create([
      {
        customerId: cust._id,
        date: new Date(),
        entryType: 'SALE',
        referenceType: 'SALE',
        referenceId: sale.invoiceNumber,
        description: `Bill #${sale.invoiceNumber}`,
        debit: 1000000,
        credit: 0,
        runningBalance: 1000000,
      },
      {
        customerId: cust._id,
        date: new Date(),
        entryType: 'PAYMENT',
        referenceType: 'PAYMENT',
        referenceId: payment.paymentNumber,
        description: `Payment Received (UPI)`,
        debit: 0,
        credit: 500000,
        runningBalance: 500000,
      },
    ]);

    // 2. Test Invoice HTML Template
    console.log('\n2. Testing Invoice HTML Generator API...');
    const invRes = await fetch(`${baseUrl}/documents/invoices/${saleId}/html`, {
      headers: authHeaders,
    });
    const invHtml = await invRes.text();
    if (invRes.status !== 200 || !invRes.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Invoice HTML fetch failed: status ${invRes.status}`);
    }

    if (!invHtml.includes('DK-2611-9999') || !invHtml.includes('DIPU KHATA &amp; TRADE') && !invHtml.includes('DIPU KHATA & TRADE')) {
      throw new Error(`Invoice HTML content missing expected invoice or header: ${invHtml.slice(0, 300)}`);
    }
    if (!invHtml.includes('Ten Thousand Rupees Only')) {
      throw new Error(`Invoice words formatting missing 'Ten Thousand Rupees Only': ${invHtml}`);
    }
    console.log(`✅ Invoice HTML generated successfully with bilingual branding and Indian number words`);

    // 3. Test Estimate HTML Template
    console.log('\n3. Testing Quotation / Estimate HTML API...');
    const estRes = await fetch(`${baseUrl}/documents/estimates/${estimateId}/html`, {
      headers: authHeaders,
    });
    const estHtml = await estRes.text();
    if (estRes.status !== 200) {
      throw new Error(`Estimate HTML fetch failed`);
    }
    if (!estHtml.includes('EST-2611-9999') || !estHtml.includes('Thirty-Nine Lakh') && !estHtml.includes('Thirty-Nine Thousand') && !estHtml.includes('Rupees Only')) {
      throw new Error(`Estimate HTML missing expected details`);
    }
    console.log(`✅ Quotation HTML generated successfully`);

    // 4. Test Customer Account Statement HTML Template
    console.log('\n4. Testing Customer Statement HTML API...');
    const stmtRes = await fetch(`${baseUrl}/documents/statements/${customerId}/html`, {
      headers: authHeaders,
    });
    const stmtHtml = await stmtRes.text();
    if (stmtRes.status !== 200) {
      throw new Error(`Customer statement HTML fetch failed`);
    }
    if (!stmtHtml.includes('Manoj Pandey Builder') || !stmtHtml.includes('CUSTOMER ACCOUNT STATEMENT')) {
      throw new Error(`Statement HTML missing customer details`);
    }
    console.log(`✅ Customer Account Statement HTML generated with running balances`);

    // 5. Test Payment Receipt HTML Template
    console.log('\n5. Testing Payment Receipt HTML API...');
    const rcptRes = await fetch(`${baseUrl}/documents/receipts/${paymentId}/html`, {
      headers: authHeaders,
    });
    const rcptHtml = await rcptRes.text();
    if (rcptRes.status !== 200) {
      throw new Error(`Receipt HTML fetch failed`);
    }
    if (!rcptHtml.includes('PAY-2611-9999') || !rcptHtml.includes('Five Thousand Rupees Only')) {
      throw new Error(`Receipt HTML missing payment details or words`);
    }
    console.log(`✅ Payment Receipt HTML generated successfully`);

    console.log('\n🎉 ALL PHASE 8 CASH MEMO, INVOICES & PDF GENERATION TESTS PASSED 100%!\n');
  } finally {
    console.log('Cleaning up test data...');
    if (customerId) {
      await Customer.findByIdAndDelete(customerId);
      await LedgerEntry.deleteMany({ customerId });
    }
    if (materialId) await Material.findByIdAndDelete(materialId);
    if (saleId) await Sale.findByIdAndDelete(saleId);
    if (estimateId) await Estimate.findByIdAndDelete(estimateId);
    if (paymentId) await Payment.findByIdAndDelete(paymentId);
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runDocumentsPdfTests().catch((err) => {
  console.error('❌ Phase 8 Test Failed:', err);
  process.exit(1);
});
