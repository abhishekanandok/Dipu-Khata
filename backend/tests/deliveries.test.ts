import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { Material } from '../src/modules/materials/material.model.js';
import { StockMovement } from '../src/modules/inventory/stockMovement.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { Driver } from '../src/modules/deliveries/driver.model.js';
import { Vehicle } from '../src/modules/deliveries/vehicle.model.js';
import { Delivery } from '../src/modules/deliveries/delivery.model.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

async function runDeliveriesTests() {
  console.log('🚀 Starting Phase 9 Drivers, Vehicles & Delivery Challan Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5009, resolve));
  const baseUrl = 'http://localhost:5009/api';

  const testUser = await User.create({
    name: 'Deliveries Tester Admin',
    email: `deliveries_tester_${Date.now()}@dipukhata.com`,
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

  let driverId = '';
  let vehicleId = '';
  let customerId = '';
  let materialId = '';
  let saleId = '';
  let challanId1 = '';
  let challanId2 = '';

  try {
    // 1. Create Driver
    console.log('1. Testing Driver Creation...');
    const driverRes = await fetch(`${baseUrl}/drivers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Ramu Yadav Driver',
        mobile: '9835066666',
        licenseNumber: 'BR-01-DL-2022-9988',
        address: 'Bikrampur Village',
      }),
    });
    const driverData = await driverRes.json();
    if (driverRes.status !== 201) {
      throw new Error(`Driver creation failed: ${JSON.stringify(driverData)}`);
    }
    driverId = driverData.data._id;
    console.log(`✅ Driver registered: ${driverData.data.name} (License: ${driverData.data.licenseNumber})`);

    // 2. Create Vehicle
    console.log('\n2. Testing Vehicle Registration...');
    const vehicleRes = await fetch(`${baseUrl}/vehicles`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicleNumber: `BR 01 TR ${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleType: 'TRACTOR',
        capacity: '150 CFT',
        notes: 'Mahindra 575 DI Tractor with Hydraulic Trolley',
      }),
    });
    const vehicleData = await vehicleRes.json();
    if (vehicleRes.status !== 201) {
      throw new Error(`Vehicle registration failed: ${JSON.stringify(vehicleData)}`);
    }
    vehicleId = vehicleData.data._id;
    console.log(`✅ Vehicle registered: ${vehicleData.data.vehicleNumber} (${vehicleData.data.vehicleType})`);

    // 3. Setup Customer & Material with 500 CFT Balu Sand
    console.log('\n3. Setting up customer and stock (500 CFT Balu)...');
    const cust = await Customer.create({
      name: 'Ashok Singh Site Owner',
      mobile: '9835077777',
      village: 'Kulharia',
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
      currentBalance: 0,
    });
    customerId = cust._id.toString();

    const mat = await Material.create({
      name: `Balu Sand Dispatch Test ${Date.now()}`,
      categoryName: 'Balu',
      defaultUnit: 'CFT',
      purchaseRate: 3500,
      sellingRate: 4500, // ₹45/CFT
      currentStock: 500,
      minimumStockAlert: 50,
    });
    materialId = mat._id.toString();

    // 4. Create Sale of 300 CFT Balu (Delivery pending, autoStockDeduction = false)
    console.log('\n4. Creating Sale Bill for 300 CFT Balu (Decoupled Dispatch)...');
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId,
        items: [{ materialId, quantity: 300, unit: 'CFT', rate: 4500 }],
        autoStockDeduction: false, // Stock will be deducted trip-by-trip on challan dispatch!
      }),
    });
    const saleData = await saleRes.json();
    if (saleRes.status !== 201) {
      throw new Error(`Sale creation failed: ${JSON.stringify(saleData)}`);
    }
    const testSale = saleData.data;
    saleId = testSale._id;
    console.log(`✅ Sale created: #${testSale.invoiceNumber} (Delivery Status: ${testSale.deliveryStatus})`);
    if (testSale.deliveryStatus !== 'PENDING') {
      throw new Error(`Expected PENDING deliveryStatus, got ${testSale.deliveryStatus}`);
    }

    // Verify stock is still 500 CFT (not decremented yet)
    const matBeforeChallan = await Material.findById(materialId);
    if (matBeforeChallan!.currentStock !== 500) {
      throw new Error(`Stock should remain 500 before dispatch, got ${matBeforeChallan!.currentStock}`);
    }
    console.log(`   Inventory confirmed untouched before dispatch: 500 CFT`);

    // 5. Trip 1: Issue Challan #1 for 150 CFT Balu
    console.log('\n5. Testing Trip 1 Dispatch: Challan for 150 CFT...');
    const challanRes1 = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        saleId,
        driverId,
        vehicleId,
        deliveryAddress: 'Kulharia Overbridge, Site #2',
        items: [{ materialId, quantity: 150, unit: 'CFT' }],
        notes: 'First trip unloaded at front gate',
      }),
    });
    const challanData1 = await challanRes1.json();
    if (challanRes1.status !== 201) {
      throw new Error(`Challan 1 creation failed: ${JSON.stringify(challanData1)}`);
    }
    const challan1 = challanData1.data;
    challanId1 = challan1._id;
    console.log(`✅ Challan #1 issued: #${challan1.challanNumber}`);

    // Verify Stock decreased by 150 CFT (500 -> 350)
    const matAfterTrip1 = await Material.findById(materialId);
    console.log(`   Stock after Trip 1: ${matAfterTrip1!.currentStock} CFT (was 500 CFT)`);
    if (matAfterTrip1!.currentStock !== 350) {
      throw new Error(`Expected stock 350, got ${matAfterTrip1!.currentStock}`);
    }

    // Verify StockMovement audit log
    const mvt1 = await StockMovement.findOne({ referenceId: challan1.challanNumber });
    if (!mvt1 || mvt1.quantity !== 150 || mvt1.movementType !== 'SALE_DISPATCH') {
      throw new Error(`Stock movement audit log missing or invalid for Challan 1`);
    }
    console.log(`✅ StockMovement audit log created: -150 CFT (Ref: ${mvt1.referenceId})`);

    // Verify Sale deliveryStatus is now PARTIAL
    const saleAfterTrip1 = await Sale.findById(saleId);
    console.log(`   Sale Delivery Status after Trip 1: ${saleAfterTrip1!.deliveryStatus}`);
    if (saleAfterTrip1!.deliveryStatus !== 'PARTIAL') {
      throw new Error(`Expected PARTIAL deliveryStatus, got ${saleAfterTrip1!.deliveryStatus}`);
    }
    console.log(`✅ Multi-trip tracking verified: Delivery status transitioned to PARTIAL`);

    // 6. Trip 2: Issue Challan #2 for remaining 150 CFT Balu
    console.log('\n6. Testing Trip 2 Dispatch: Challan for remaining 150 CFT...');
    const challanRes2 = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        saleId,
        driverId,
        vehicleId,
        deliveryAddress: 'Kulharia Overbridge, Site #2',
        items: [{ materialId, quantity: 150, unit: 'CFT' }],
        notes: 'Final trip unloaded and verified by customer',
      }),
    });
    const challanData2 = await challanRes2.json();
    if (challanRes2.status !== 201) {
      throw new Error(`Challan 2 creation failed: ${JSON.stringify(challanData2)}`);
    }
    const challan2 = challanData2.data;
    challanId2 = challan2._id;
    console.log(`✅ Challan #2 issued: #${challan2.challanNumber}`);

    // Verify Stock decreased by another 150 CFT (350 -> 200)
    const matAfterTrip2 = await Material.findById(materialId);
    console.log(`   Stock after Trip 2: ${matAfterTrip2!.currentStock} CFT (was 350 CFT)`);
    if (matAfterTrip2!.currentStock !== 200) {
      throw new Error(`Expected stock 200, got ${matAfterTrip2!.currentStock}`);
    }

    // Verify Sale deliveryStatus is now DELIVERED!
    const saleAfterTrip2 = await Sale.findById(saleId);
    console.log(`   Sale Delivery Status after Trip 2: ${saleAfterTrip2!.deliveryStatus}`);
    if (saleAfterTrip2!.deliveryStatus !== 'DELIVERED') {
      throw new Error(`Expected DELIVERED deliveryStatus, got ${saleAfterTrip2!.deliveryStatus}`);
    }
    console.log(`✅ Full multi-trip fulfillment completed: Sale deliveryStatus is now DELIVERED`);

    // 7. Test Challan HTML Document API
    console.log('\n7. Testing Delivery Challan Printable HTML API...');
    const docRes = await fetch(`${baseUrl}/documents/challans/${challanId1}/html`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const docHtml = await docRes.text();
    if (docRes.status !== 200) {
      throw new Error(`Challan HTML fetch failed`);
    }
    if (!docHtml.includes(challan1.challanNumber) || !docHtml.includes('DELIVERY CHALLAN') || !docHtml.includes('Driver Signature')) {
      throw new Error(`Challan HTML missing expected details`);
    }
    console.log(`✅ Delivery Challan HTML document rendered with driver, vehicle, and signature boxes`);

    console.log('\n🎉 ALL PHASE 9 DRIVER, VEHICLE & DELIVERY CHALLAN TESTS PASSED 100%!\n');
  } finally {
    console.log('Cleaning up test data...');
    if (driverId) await Driver.findByIdAndDelete(driverId);
    if (vehicleId) await Vehicle.findByIdAndDelete(vehicleId);
    if (customerId) await Customer.findByIdAndDelete(customerId);
    if (materialId) await Material.findByIdAndDelete(materialId);
    if (saleId) await Sale.findByIdAndDelete(saleId);
    if (challanId1) await Delivery.findByIdAndDelete(challanId1);
    if (challanId2) await Delivery.findByIdAndDelete(challanId2);
    await StockMovement.deleteMany({ reason: { $regex: /Challan/i } });
    await User.findByIdAndDelete(testUser._id);

    server.close();
    await mongoose.disconnect();
  }
}

runDeliveriesTests().catch((err) => {
  console.error('❌ Phase 9 Test Failed:', err);
  process.exit(1);
});
