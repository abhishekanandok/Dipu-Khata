import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/user.model.js';
import mongoose from 'mongoose';
import http from 'http';

const TEST_EMAIL = `test_owner_${Date.now()}@dipukhata.com`;
const TEST_PASSWORD = 'SecurePassword123!';
const NEW_PASSWORD = 'NewPassword456!';

async function runAuthTests() {
  console.log('🚀 Starting Phase 1 Authentication Verification Tests...\n');
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5001, resolve));
  const baseUrl = 'http://localhost:5001/api/auth';

  let accessToken = '';
  let refreshToken = '';

  try {
    // 1. Test Registration
    console.log('1. Testing User Registration...');
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dipu Singh',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'admin',
      }),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.data.tokens.accessToken) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log('   ✅ Registration passed: User created and JWT returned.');

    // Verify password hash is never exposed
    if (regData.data.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: passwordHash was returned in response!');
    }
    console.log('   ✅ Security check passed: passwordHash is not exposed.');

    // 2. Test Duplicate Registration Rejection
    console.log('2. Testing Duplicate Email Rejection...');
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Dipu',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    if (dupRes.status !== 409 && dupRes.status !== 400) {
      throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    }
    console.log('   ✅ Duplicate rejection passed: Rejected duplicate email.');

    // 3. Test Login with invalid credentials
    console.log('3. Testing Invalid Password Rejection...');
    const badLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'WrongPassword',
      }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for bad password, got ${badLoginRes.status}`);
    }
    console.log('   ✅ Invalid password rejected.');

    // 4. Test Valid Login
    console.log('4. Testing Valid Login...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.data.tokens.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    accessToken = loginData.data.tokens.accessToken;
    refreshToken = loginData.data.tokens.refreshToken;
    console.log('   ✅ Valid login passed: Access and refresh tokens received.');

    // 5. Test Protected Route (GET /api/auth/me)
    console.log('5. Testing Protected Route (GET /api/auth/me)...');
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.data.email !== TEST_EMAIL) {
      throw new Error(`Protected route failed: ${JSON.stringify(meData)}`);
    }
    console.log('   ✅ Protected route verified: User profile retrieved.');

    // 6. Test Refresh Token Rotation
    console.log('6. Testing Refresh Token Rotation...');
    const refreshRes = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.status !== 200 || !refreshData.data.accessToken) {
      throw new Error(`Refresh token rotation failed: ${JSON.stringify(refreshData)}`);
    }
    accessToken = refreshData.data.accessToken;
    refreshToken = refreshData.data.refreshToken;
    console.log('   ✅ Token rotation passed: New access & refresh tokens issued.');

    // 7. Test Change Password
    console.log('7. Testing Change Password...');
    const changePassRes = await fetch(`${baseUrl}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: TEST_PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    });
    if (changePassRes.status !== 200) {
      const err = await changePassRes.json();
      throw new Error(`Change password failed: ${JSON.stringify(err)}`);
    }
    console.log('   ✅ Change password passed.');

    // Verify login with new password works
    const newLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: NEW_PASSWORD,
      }),
    });
    const newLoginData = await newLoginRes.json();
    if (newLoginRes.status !== 200) {
      throw new Error(`Login with new password failed: ${JSON.stringify(newLoginData)}`);
    }
    accessToken = newLoginData.data.tokens.accessToken;
    console.log('   ✅ Login with new password succeeded.');

    // 8. Test Logout
    console.log('8. Testing Logout...');
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (logoutRes.status !== 200) {
      throw new Error('Logout failed');
    }
    console.log('   ✅ Logout passed.');

    // Verify old refresh token is now revoked
    const revokedRefreshRes = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (revokedRefreshRes.status !== 401) {
      throw new Error('Revoked refresh token was improperly accepted!');
    }
    console.log('   ✅ Security check passed: Revoked refresh token rejected (401).');

    // Clean up test user
    await User.deleteOne({ email: TEST_EMAIL });
    console.log('   🧹 Test user cleaned up.');

    console.log('\n🎉 ALL PHASE 1 AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
