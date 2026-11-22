# Dipu Khata & Trade (दीपु खाता एवं व्यापार)

Production-ready, offline-capable retail business management application for construction materials (Balu, Char, Gitti, Cement, Steel, and custom building supplies). Replaces handwritten customer ledgers, sales registers, stock books, cash memos, and transport challans.

---

## 🛠 Tech Stack

- **Mobile:** React Native + Expo (SDK 52), Expo Router, TypeScript, TanStack Query, Zustand, Expo Blur, Expo SQLite, Expo SecureStore.
- **Backend:** Node.js, Express.js, TypeScript, MongoDB Atlas, Mongoose, JWT, Zod.
- **Design System:** Apple-inspired Liquid Glass (Glassmorphism), high-contrast accessibility for outdoor building yard environments, Hindi & English bilingual UI.

---

## 📁 Repository Structure

```
Dipu Khata/
├── backend/                   # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/            # Env validation, MongoDB Atlas connection & retry
│   │   ├── middleware/        # Error handler, request logger, Zod validator
│   │   ├── modules/
│   │   │   ├── auth/          # User model, JWT rotation, bcrypt, auth routes
│   │   │   ├── dashboard/     # Real-time metrics aggregation & date filters
│   │   │   ├── customers/     # Customer model & ledger foundations
│   │   │   ├── materials/     # Material catalog & stock models
│   │   │   ├── sales/         # Sales & line items model
│   │   │   ├── payments/      # Payments & cash book model
│   │   │   └── deliveries/    # Deliveries & challans model
│   │   ├── routes/            # API routes (Health, Auth, Dashboard...)
│   │   ├── utils/             # Standardized API response format, logger
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Server entry point
│   ├── tests/                 # Integration test suites (auth.test.ts, dashboard.test.ts)
│   ├── .env                   # Environment secrets (MongoDB URI, JWT keys)
│   └── tsconfig.json
├── mobile/                    # React Native + Expo Application
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/            # Login, Register, Forgot Password, Reset Password, Change Password
│   │   ├── (tabs)/            # Bottom Tabs: Home, Sales, Khata, Stock, More
│   │   ├── _layout.tsx        # Auth bootstrapper & session router
│   │   └── index.tsx          # Initial entry router
│   ├── components/            # Liquid Glass Design System
│   │   ├── glass/             # GlassCard, GlassButton, GlassInput, GlassHeader
│   │   └── common/            # AmountDisplay, StatusBadge
│   ├── constants/             # Theme tokens, Glassmorphism styles, Colors
│   ├── services/              # API client (Axios + auto JWT refresh interceptor)
│   ├── store/                 # Zustand stores (authStore.ts with SecureStore persistence)
│   ├── types/                 # Shared TypeScript models
│   └── app.json
├── package.json               # Root monorepo scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

- API Base URL: `http://localhost:5000/api`
- Health check: `http://localhost:5000/api/health`
- Auth tests: `npx tsx tests/auth.test.ts`
- Dashboard tests: `npx tsx tests/dashboard.test.ts`

### 2. Mobile Setup

```bash
cd mobile
npm install
npm start
```

Press `a` for Android Emulator, `w` for Web preview, or scan the QR code with the Expo Go app on a physical device.

---

## 📋 Development Roadmap

- [x] **Phase 0:** Project architecture, monorepo foundation, MongoDB Atlas connection, health check, Liquid Glass tokens.
- [x] **Phase 1:** Authentication, session persistence, role guards, user management.
- [x] **Phase 2:** Main dashboard, glass navigation, real-time KPI metrics.
- [ ] **Phase 3:** Customer management & digital Khata (opening balances, immutable ledger).
- [ ] **Phase 4:** Material catalog, multi-units (CFT, Ton, Bag, KG), price history.
- [ ] **Phase 5:** Supplier purchases & append-only stock movement ledger.
- [ ] **Phase 6:** Estimates & sales billing (cash, UPI, Khata credit split).
- [ ] **Phase 7:** Payment collection & daily cash book reconciliation.
- [ ] **Phase 8:** Document generation (Cash Memos, PDFs, WhatsApp sharing).
- [ ] **Phase 9:** Drivers, vehicles, and multi-trip delivery challans.
- [ ] **Phase 10:** Daily business expenses & financial profit reports.
- [ ] **Phase 11:** Offline-first SQLite persistence & background sync queue.
- [ ] **Phase 12:** End-to-end financial integrity testing, EAS build, AWS production deployment.
