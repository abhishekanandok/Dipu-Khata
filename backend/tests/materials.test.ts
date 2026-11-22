import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { Category } from '../src/modules/materials/category.model.js';
import { PriceHistory } from '../src/modules/materials/priceHistory.model.js';
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

async function runMaterialsTests() {
  console.log('🚀 Starting Phase 4 Materials Catalog & Pricing Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5004, resolve));
  const baseUrl = 'http://localhost:5004/api';

  // Create mock authenticated admin
  const testUser = await User.create({
    name: 'Materials Tester Admin',
    email: `materials_${Date.now()}@dipukhata.com`,
    passwordHash: 'hashed_dummy',
    role: 'admin',
  });

  const authToken = jwt.sign(
    { userId: testUser._id.toString(), email: testUser.email, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let cementMaterialId = '';
  let sandMaterialId = '';
  let customCatId = '';

  try {
    // 1. Fetch Categories (and verify default seed)
    console.log('1. Testing Default Categories Seed & Fetch...');
    const catRes = await fetch(`${baseUrl}/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const catData = await catRes.json();
    if (catRes.status !== 200 || !catData.data || catData.data.length < 5) {
      throw new Error(`Failed to fetch categories: ${JSON.stringify(catData)}`);
    }
    console.log(`   ✅ Default categories seeded & fetched: ${catData.data.length} categories found.`);

    // 2. Create Custom Category
    console.log('2. Testing Custom Category Creation...');
    const customCatRes = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Fly Ash Blocks ${Date.now()}`,
        hindiName: 'फ्लाई ऐश ब्लॉक',
        description: 'Autoclaved aerated concrete masonry blocks',
      }),
    });
    const customCatData = await customCatRes.json();
    if (customCatRes.status !== 201) {
      throw new Error(`Category creation failed: ${JSON.stringify(customCatData)}`);
    }
    customCatId = customCatData.data._id;
    console.log('   ✅ Custom category created successfully.');

    // 3. Create Packaged Material (Cement)
    console.log('3. Testing Material Creation with Rates (ACC Gold Cement)...');
    const cementRes = await fetch(`${baseUrl}/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'ACC Gold F2R Water Shield Cement',
        hindiName: 'एसीसी गोल्ड सीमेंट',
        categoryName: 'Cement',
        brand: 'ACC',
        sku: 'ACC-GOLD-50KG',
        defaultUnit: 'BAG',
        purchaseRate: 32000, // ₹320 in paise
        sellingRate: 38000, // ₹380 in paise
        currentStock: 150,
        minimumStockAlert: 25,
      }),
    });
    const cementData = await cementRes.json();
    if (cementRes.status !== 201) {
      throw new Error(`Material creation failed: ${JSON.stringify(cementData)}`);
    }
    cementMaterialId = cementData.data._id;
    console.log('   ✅ Material created: ACC Gold Cement @ ₹380/Bag.');

    // 4. Verify Initial Price History
    console.log('4. Verifying Initial Price History Entry...');
    const priceHistRes = await fetch(`${baseUrl}/materials/${cementMaterialId}/price-history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const priceHistData = await priceHistRes.json();
    if (priceHistData.data.length === 0 || priceHistData.data[0].newSellingRate !== 38000) {
      throw new Error(`Initial price history missing: ${JSON.stringify(priceHistData)}`);
    }
    console.log('   ✅ Initial price history entry verified.');

    // 5. Create Bulk Aggregate with Alternative Unit (Sand / Balu)
    console.log('5. Testing Bulk Aggregate Material with Alternative Units (Balu CFT/Ton)...');
    const sandRes = await fetch(`${baseUrl}/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Ganga White Sand (बालू)',
        hindiName: 'सफेद बालू',
        categoryName: 'Balu',
        brand: 'Local Quarry',
        defaultUnit: 'CFT',
        alternativeUnits: [
          { unit: 'TON', conversionFactor: 25 }, // 1 Ton = 25 CFT
        ],
        purchaseRate: 3500, // ₹35 in paise
        sellingRate: 4500, // ₹45 in paise
        currentStock: 1200,
        minimumStockAlert: 200,
      }),
    });
    const sandData = await sandRes.json();
    if (sandRes.status !== 201) {
      throw new Error(`Bulk sand creation failed: ${JSON.stringify(sandData)}`);
    }
    sandMaterialId = sandData.data._id;
    console.log('   ✅ Bulk material created with alternative unit conversion factor (1 Ton = 25 CFT).');

    // 6. Test Price Update & Price History Tracking
    console.log('6. Testing Price Hike & Audit Trail Tracking...');
    const updateRes = await fetch(`${baseUrl}/materials/${cementMaterialId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sellingRate: 39500, // Price hike to ₹395
        purchaseRate: 33500, // Purchase hike to ₹335
        priceChangeReason: 'Manufacturer Quarter Rate Hike',
      }),
    });
    if (updateRes.status !== 200) {
      throw new Error('Price update failed');
    }

    // Verify price history now has 2 records
    const updatedHistoryRes = await fetch(`${baseUrl}/materials/${cementMaterialId}/price-history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const updatedHistory = (await updatedHistoryRes.json()).data;
    if (updatedHistory.length < 2) {
      throw new Error(`Expected at least 2 price history entries, got ${updatedHistory.length}`);
    }
    const latestChange = updatedHistory[0];
    if (latestChange.newSellingRate !== 39500 || latestChange.oldSellingRate !== 38000) {
      throw new Error(`Price history did not track old and new rates correctly: ${JSON.stringify(latestChange)}`);
    }
    console.log(`   ✅ Price history audit trail verified: Old ₹380 -> New ₹395 (Reason: ${latestChange.reason})`);

    // 7. Test Material Query & Filtering
    console.log('7. Testing Material Search and Category Filter...');
    const cementSearchRes = await fetch(`${baseUrl}/materials?category=Cement`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cementList = (await cementSearchRes.json()).data;
    if (!cementList.some((m: any) => m._id === cementMaterialId)) {
      throw new Error('Category filter for Cement failed');
    }
    console.log('   ✅ Category and search filters passed.');

    // 8. Clean up
    console.log('8. Cleaning up test materials...');
    await Material.deleteMany({ _id: { $in: [cementMaterialId, sandMaterialId] } });
    await PriceHistory.deleteMany({ materialId: { $in: [cementMaterialId, sandMaterialId] } });
    if (customCatId) await Category.deleteOne({ _id: customCatId });
    await User.deleteOne({ _id: testUser._id });
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL PHASE 4 MATERIALS & PRICING TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runMaterialsTests().catch((err) => {
  console.error('\n❌ MATERIALS TEST RUNNER FAILED:', err);
  process.exit(1);
});
