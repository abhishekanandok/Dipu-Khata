import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Supplier } from '../src/modules/purchases/supplier.model.js';
import { Purchase } from '../src/modules/purchases/purchase.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { StockMovement } from '../src/modules/inventory/stockMovement.model.js';
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

async function runPurchasesInventoryTests() {
  console.log('🚀 Starting Phase 5 Purchases & Stock Inventory Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5005, resolve));
  const baseUrl = 'http://localhost:5005/api';

  // Create mock authenticated admin
  const testUser = await User.create({
    name: 'Purchase Tester Admin',
    email: `purchase_${Date.now()}@dipukhata.com`,
    passwordHash: 'hashed_dummy',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let supplierId = '';
  let materialId = '';
  let purchaseId = '';

  try {
    // 1. Create Supplier
    console.log('1. Testing Supplier Creation...');
    const suppRes = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Sharma Cement Distributors',
        companyName: 'UltraTech Authorized Stockist',
        mobile: '9876543333',
        address: 'Transport Nagar Depot',
      }),
    });
    const suppData = await suppRes.json();
    if (suppRes.status !== 201) {
      throw new Error(`Supplier creation failed: ${JSON.stringify(suppData)}`);
    }
    supplierId = suppData.data._id;
    console.log('   ✅ Supplier created successfully.');

    // 2. Create Material with Initial Stock of 20
    console.log('2. Creating Test Material with Initial Stock = 20 Bags...');
    const mat = await Material.create({
      name: `UltraTech PPC Cement ${Date.now()}`,
      categoryName: 'Cement',
      defaultUnit: 'BAG',
      sellingRate: 38000,
      purchaseRate: 31000,
      currentStock: 20,
      minimumStockAlert: 15,
    });
    materialId = mat._id.toString();
    console.log(`   ✅ Material initialized. Current stock = ${mat.currentStock}`);

    // 3. Create Inward Purchase Bill (100 Bags @ ₹310)
    console.log('3. Testing Inward Purchase Entry (100 Bags @ ₹310)...');
    const purchaseRes = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: `PUR-INV-${Date.now()}`,
        supplierId,
        items: [
          {
            materialId,
            quantity: 100,
            unit: 'BAG',
            rate: 31000, // ₹310 in paise
          },
        ],
        transportCharges: 100000, // ₹1,000 transport in paise
        amountPaid: 1000000, // ₹10,000 paid
        paymentMethod: 'BANK',
      }),
    });
    const purchaseData = await purchaseRes.json();
    if (purchaseRes.status !== 201) {
      throw new Error(`Purchase failed: ${JSON.stringify(purchaseData)}`);
    }
    purchaseId = purchaseData.data._id;
    console.log('   ✅ Purchase bill recorded.');

    // 4. Verify Stock Increment: 20 + 100 = 120 Bags
    console.log('4. Verifying Automatic Stock Increment in Material Record...');
    const updatedMat = await Material.findById(materialId);
    if (!updatedMat || updatedMat.currentStock !== 120) {
      throw new Error(`Expected stock 120, got ${updatedMat?.currentStock}`);
    }
    console.log(`   ✅ Stock accurately incremented: 20 + 100 = ${updatedMat.currentStock} Bags.`);

    // 5. Verify Stock Movement Ledger Record
    console.log('5. Verifying Append-Only Stock Movement Ledger Entry...');
    const movementsRes = await fetch(`${baseUrl}/inventory/movements?materialId=${materialId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const movementsData = await movementsRes.json();
    const movements = movementsData.data;

    if (movements.length === 0) {
      throw new Error('Stock movement record missing!');
    }
    const lastMovement = movements[0];
    if (
      lastMovement.movementType !== 'PURCHASE' ||
      lastMovement.previousStock !== 20 ||
      lastMovement.newStock !== 120 ||
      lastMovement.quantity !== 100
    ) {
      throw new Error(`Invalid stock movement entry: ${JSON.stringify(lastMovement)}`);
    }
    console.log('   ✅ Stock movement audit log verified: Previous 20 -> New 120 (+100).');

    // 6. Verify Supplier Balance
    console.log('6. Verifying Supplier Payable Balance...');
    const updatedSupp = await Supplier.findById(supplierId);
    // Total = 31,000 (materials) + 1,000 (transport) = 32,000. Paid 10,000 -> Due = 22,000 (2,200,000 paise)
    if (!updatedSupp || updatedSupp.currentBalance !== 2200000) {
      throw new Error(`Expected supplier payable balance 2200000 paise, got ${updatedSupp?.currentBalance}`);
    }
    console.log(`   ✅ Supplier payable balance updated to ₹22,000.`);

    // 7. Test Stock Damage / Wastage Adjustment (-5 Bags)
    console.log('7. Testing Stock Damage Adjustment (-5 Bags)...');
    const adjustRes = await fetch(`${baseUrl}/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        materialId,
        type: 'DAMAGE',
        quantity: 5,
        reason: 'Water leakage in warehouse bay 2',
      }),
    });
    const adjustData = await adjustRes.json();
    if (adjustRes.status !== 201) {
      throw new Error(`Stock adjustment failed: ${JSON.stringify(adjustData)}`);
    }

    const postAdjustMat = await Material.findById(materialId);
    if (!postAdjustMat || postAdjustMat.currentStock !== 115) {
      throw new Error(`Expected stock 115 after damage adjustment, got ${postAdjustMat?.currentStock}`);
    }
    console.log(`   ✅ Damage adjustment verified: Stock decreased from 120 to ${postAdjustMat.currentStock} Bags.`);

    // 8. Test Stock Overview
    console.log('8. Testing Stock Overview API...');
    const overviewRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const overviewData = await overviewRes.json();
    if (overviewRes.status !== 200 || overviewData.data.totalValuation <= 0) {
      throw new Error('Stock overview valuation mismatch');
    }
    console.log('   ✅ Stock overview API verified.');

    // 9. Clean up
    console.log('9. Cleaning up test purchases and stock movements...');
    await Purchase.deleteOne({ _id: purchaseId });
    await Supplier.deleteOne({ _id: supplierId });
    await Material.deleteOne({ _id: materialId });
    await StockMovement.deleteMany({ materialId });
    await User.deleteOne({ _id: testUser._id });
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL PHASE 5 PURCHASES & INVENTORY TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runPurchasesInventoryTests().catch((err) => {
  console.error('\n❌ PURCHASES & INVENTORY TEST RUNNER FAILED:', err);
  process.exit(1);
});
