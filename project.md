I recommend building **Dipu Khata & Trade** as a production-ready, offline-capable retail business management application, rather than a simple CRUD-based CRM.

We'll use a phased development approach so your AI coding agent (Cursor, Claude Code, Codex, etc.) can implement, test and verify each module before moving forward.

# **Dipu Khata & Trade — Complete Development Prompt**

# **Technology stack**

**Mobile:** React Native + Expo + TypeScript

**Backend:** Node.js + Express.js + TypeScript

**Database:** MongoDB + Mongoose

**Authentication:** Email + Password + JWT

**Design:** Apple-inspired Liquid Glass / Glassmorphism

**Deployment:** AWS-ready backend architecture

## **Development roadmap**

| Phase | Development scope                           |
| ----- | ------------------------------------------- |
| 0     | Project architecture and setup              |
| 1     | Authentication and app foundation           |
| 2     | Dashboard and navigation                    |
| 3     | Customer management and Khata               |
| 4     | Materials, categories and pricing           |
| 5     | Purchases and inventory                     |
| 6     | Estimates and sales billing                 |
| 7     | Payments and accounting                     |
| 8     | Cash memo, invoices and PDFs                |
| 9     | Drivers, vehicles and delivery challans     |
| 10    | Expenses and financial reports              |
| 11    | Offline support and synchronization         |
| 12    | Testing, security and production deployment |

**Important:** Complete each phase before starting the next one. Keep the codebase running throughout development.

## **Master development prompt**

Use this first to establish the project's architecture, engineering standards and design direction.

# Project: Dipu Khata & Trade

Act as a Senior Full-Stack Architect, React Native Engineer, Backend Engineer, UI/UX Designer and QA Engineer.

Build a production-ready mobile application named **Dipu Khata & Trade**, designed for a retail construction-material business.

The business sells materials such as:

- Balu (बालू)
- Char (छर)
- Gitti (गिट्टी)
- Cement (ACC Gold, F2R and other brands)
- Steel rods (8mm, 10mm, 12mm, etc.)
- Other configurable construction materials.

The application will replace handwritten customer ledgers, sales registers, stock books, cash memos and delivery challans.

## 1. Technology stack

### Frontend

- React Native
- Expo (latest stable SDK)
- TypeScript
- Expo Router
- React Query / TanStack Query
- Zustand for global state
- React Hook Form
- Zod validation
- NativeWind or a consistent styling system
- Expo SecureStore for sensitive credentials
- Expo SQLite for local offline data

### Backend

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Zod request validation
- REST APIs

### Architecture

Use a modular monolith architecture with clear separation between:

- Authentication
- Users
- Customers
- Products
- Inventory
- Purchases
- Estimates
- Sales
- Payments
- Customer Ledger
- Drivers
- Vehicles
- Deliveries
- Expenses
- Reports

## 2. UI/UX design direction

Create a premium Apple-inspired Liquid Glass interface.

Visual characteristics:

- Translucent glass cards.
- Subtle background blur.
- Floating navigation elements.
- Soft shadows and layered surfaces.
- Rounded corners.
- Subtle gradients.
- Clean typography.
- Minimal visual clutter.
- Smooth transitions and micro-interactions.

Use glass effects selectively. Do not sacrifice readability or performance.

The application must work beautifully on Android devices, including budget smartphones.

### Design system

- Background: soft neutral surfaces.
- Primary: deep charcoal / elegant dark accent.
- Accent: subtle blue or teal.
- Success: green.
- Warning: amber.
- Error: red.
- Typography: clear, readable and consistent.
- Support Hindi and English labels.

Create reusable components:

- GlassCard
- GlassButton
- GlassInput
- GlassHeader
- GlassBottomNavigation
- GlassModal
- GlassBottomSheet
- TransactionCard
- AmountDisplay
- StatusBadge
- EmptyState
- LoadingState
- ConfirmationDialog

All components must have consistent spacing, sizing and typography.

## 3. Core business rules

1. This is a retail-only business management application.
2. Support both cash and credit sales.
3. Support partial and full payments.
4. Every customer must have an individual Khata ledger.
5. Every material must have a configurable unit.
6. Support CFT, Ton, KG, Bag, Piece and other custom units.
7. Material rates must be configurable.
8. Stock must increase when purchases are recorded.
9. Stock must decrease when sales are fulfilled.
10. Every financial transaction must be traceable.
11. Every sale must generate a unique bill number.
12. Every delivery must have a unique challan number.
13. Never silently modify historical financial transactions.
14. Use transaction reversals and adjustment entries for corrections.
15. Support opening balances when migrating old handwritten customer records.

## 4. Authentication

Keep authentication simple:

- Email and password signup.
- Email and password login.
- Secure password hashing.
- JWT access token.
- Refresh token.
- Logout.
- Change password.
- Forgot password flow.

Do not implement Google login, social login or phone OTP authentication.

## 5. Important accounting rules

Customer balance:

Closing Balance = Opening Balance + Sales + Debit Adjustments - Payments - Returns/Credit Adjustments.

Inventory:

Closing Stock = Opening Stock + Purchases + Stock Increases - Sales Delivered - Stock Reductions.

Use decimal-safe monetary calculations. Store amounts in integer paise wherever practical.

A sale must not be counted as a second payment when its payment is collected.

Use database transactions for operations that simultaneously affect sales, stock and customer accounts.

## 6. Engineering standards

- Use TypeScript throughout.
- Follow clean code and modular architecture.
- Use reusable components.
- Keep frontend and backend separate.
- Never hardcode business data.
- Keep environment variables outside source code.
- Implement centralized API error handling.
- Implement pagination, filtering and searching.
- Add loading, empty and error states.
- Add proper validation on frontend and backend.
- Add meaningful logging.
- Write unit and integration tests.
- Protect all business APIs with authentication.
- Use consistent API response formats.
- Add MongoDB indexes for frequently queried fields.

## 7. Development rules

Build the application phase by phase.

Before each phase:

1. Inspect the existing repository.
2. Understand completed functionality.
3. Identify dependencies.
4. Prepare an implementation plan.

During implementation:

1. Write working code, not pseudocode.
2. Follow the established architecture.
3. Avoid unnecessary dependencies.
4. Do not duplicate existing components.
5. Keep existing functionality working.

After implementation:

1. Run TypeScript checks.
2. Run linting.
3. Run relevant tests.
4. Test the API endpoints.
5. Verify the mobile screens.
6. Fix errors before declaring the phase complete.
7. Document completed functionality and remaining work.

Never claim a feature is complete without verifying it.

Do not jump to future phases without completing the current phase.

## 8. Expected outcome

Build a complete, reliable and easy-to-use construction-material retail management application that replaces the existing handwritten business records.

Prioritize accounting accuracy, simple workflows, fast data entry, offline reliability and an excellent mobile experience.

## **Phase-by-phase implementation prompts**

These are the individual prompts to give your coding agent in order. Each prompt assumes the master architecture has already been established.

### **Phase 0 — Project setup and architecture**

Foundation

Implement Phase 0: Project Initialization and Architecture for Dipu Khata & Trade.

### Objectives

Create the complete development environment for the React Native Expo application and Node.js backend.

### Tasks

1. Create a monorepo or clearly separated frontend and backend directories.

Suggested structure:

dipu-khata-trade/\
mobile/\
app/\
components/\
features/\
hooks/\
services/\
store/\
database/\
constants/\
assets/\
types/\
backend/\
src/\
config/\
modules/\
middleware/\
utils/\
types/\
routes/\
database/\
tests/\
docs/

2. Configure Expo, React Native and TypeScript.
3. Configure Expo Router.
4. Configure Express.js and TypeScript.
5. Connect MongoDB using Mongoose.
6. Configure environment variables.
7. Create centralized API response and error-handling utilities.
8. Configure ESLint and Prettier.
9. Configure frontend API client and environment-specific API URLs.
10. Create a health-check API endpoint.
11. Configure development scripts.
12. Add README with setup instructions.

### Design foundation

Establish the Liquid Glass design tokens, typography, spacing, radii, shadows and reusable component conventions.

### Deliverables

- Running Expo application.
- Running Express backend.
- Successful MongoDB connection.
- Working API health check.
- Complete folder structure.
- Environment configuration examples.
- README documentation.

### Verification

Run the mobile app and backend independently. Verify database connectivity and TypeScript compilation.

Do not implement business features yet.

### **Phase 1 — Authentication and app foundation**

Implement Phase 1: Authentication and Application Foundation.

### Authentication screens

1. Splash screen.
2. Login screen.
3. Signup screen.
4. Forgot password screen.
5. Reset password screen.
6. Change password screen.

### Login requirements

- Email address.
- Password.
- Show/hide password.
- Remember session.
- Login button.
- Validation errors.
- Loading state.

### Backend APIs

POST /api/auth/register\
POST /api/auth/login\
POST /api/auth/refresh\
POST /api/auth/logout\
POST /api/auth/forgot-password\
POST /api/auth/reset-password\
POST /api/auth/change-password\
GET /api/auth/me

### Database

Create User model:

- name
- email
- passwordHash
- role
- isActive
- createdAt
- updatedAt

Add unique email indexing.

### Security

- Hash passwords using bcrypt.
- Never return password hashes.
- Implement JWT access and refresh tokens.
- Securely store tokens on the mobile device.
- Add authentication middleware.
- Add login rate limiting.
- Implement secure logout and token revocation.

### UI

Use the Apple-inspired Liquid Glass design system.

### Deliverables

Working registration, login, logout, session persistence, protected routes and password recovery.

### Verification

Test successful login, invalid credentials, duplicate email, expired tokens, refresh tokens and logout.

### **Phase 2 — Dashboard and navigation**

Implement Phase 2: Main Dashboard and Navigation.

Create the main application experience after login.

### Bottom navigation

1. Home
2. Sales
3. Khata
4. Stock
5. More

### Dashboard

Display:

- Today's total sales.
- Today's cash collection.
- Today's credit sales.
- Total outstanding customer balance.
- Total inventory value.
- Low-stock alerts.
- Recent transactions.
- Recent customers.
- Pending deliveries.

### Quick actions

- New Sale.
- Add Customer.
- Receive Payment.
- Create Estimate.
- Add Stock.
- Create Chalan.

### Date filters

- Today.
- Yesterday.
- This week.
- This month.
- Custom date range.

### Backend

Create dashboard summary APIs using actual database records.

Do not hardcode dashboard values.

### UI

Use translucent glass summary cards, clear financial figures, compact lists and floating quick-action controls.

Make the dashboard usable with one hand.

### Deliverables

Fully working navigation, dashboard and quick actions.

All dashboard totals must be calculated from actual business transactions.

### **Phase 3 — Customer management and Khata**

Critical business module

Implement Phase 3: Customer Management and Digital Khata.

This module must replicate the existing handwritten customer ledger.

### Customer management

Create customer screens:

- Customer list.
- Add customer.
- Edit customer.
- Customer details.
- Customer ledger.

### Customer fields

- Full name.
- Mobile number.
- Village.
- Address.
- Optional notes.
- Opening balance.
- Opening balance type: Receivable or Payable.
- Created date.

### Customer list

Show:

- Customer name.
- Mobile number.
- Village.
- Outstanding amount.
- Last transaction date.

Add search by name, mobile and village.

Filters:

- All customers.
- Customers with dues.
- Customers with zero balance.
- Customers with credit balance.

### Customer Khata screen

Display:

- Customer information.
- Current balance.
- Total sales.
- Total payments received.
- Opening balance.

Transaction history columns:

- Date.
- Description.
- Debit.
- Credit.
- Running balance.

Transaction types:

- Opening balance.
- Sale.
- Payment.
- Sales return.
- Adjustment.

### Customer ledger logic

Maintain immutable financial ledger entries.

Every sale creates a debit entry.\
Every received payment creates a credit entry.\
Every return or adjustment creates the appropriate reversal entry.

Calculate running balances accurately.

### APIs

GET /api/customers\
POST /api/customers\
GET /api/customers/:id\
PUT /api/customers/:id\
GET /api/customers/:id/ledger\
GET /api/customers/:id/summary

### Additional functionality

- Call customer.
- Share customer statement.
- Receive payment.
- Create new sale.
- View previous bills.

### Deliverables

Complete customer management and digital Khata replacing handwritten customer account pages.

### **Phase 4 — Materials and pricing management**

Implement Phase 4: Material Catalog and Price Management.

### Material categories

Allow configurable categories such as:

- Balu.
- Char.
- Gitti.
- Cement.
- Steel.
- Other construction materials.

### Material management

Fields:

- Material name.
- Category.
- SKU.
- Description.
- Brand.
- Default unit.
- Alternative units.
- Purchase price.
- Selling price.
- Minimum stock alert.
- Is active.

### Units

Support:

- CFT.
- Ton.
- KG.
- Bag.
- Piece.
- Trip.
- Custom units.

Allow configurable unit conversions where applicable.

Do not assume that all units are interchangeable. For example, CFT-to-ton conversion requires a configured material-specific conversion factor.

### Pricing

Implement:

- Purchase rate.
- Selling rate.
- Default retail rate.
- Customer-specific rate (optional).
- Rate history.
- Effective date.
- Manual price override during billing.

### Screens

- Material list.
- Category list.
- Add material.
- Edit material.
- Material details.
- Price history.

### APIs

GET /api/materials\
POST /api/materials\
GET /api/materials/:id\
PUT /api/materials/:id\
GET /api/categories\
POST /api/categories\
GET /api/materials/:id/price-history

### Deliverables

A configurable material catalog and price master that supports all current and future construction materials.

### **Phase 5 — Purchases and inventory**

Critical business module

Implement Phase 5: Purchase Management and Inventory.

### Purchase management

Create purchase screens:

- Purchase list.
- New purchase.
- Purchase details.
- Purchase return.

Purchase fields:

- Supplier name.
- Purchase date.
- Invoice number.
- Materials.
- Quantity.
- Unit.
- Purchase rate.
- Additional charges.
- Total amount.
- Payment status.
- Amount paid.
- Outstanding supplier balance.

### Inventory management

Maintain stock for every material.

Stock movements:

- Opening stock.
- Purchase received.
- Sale dispatched.
- Purchase return.
- Sales return.
- Stock adjustment.
- Damage or wastage.

### Inventory screens

1. Stock overview.
2. Material-wise stock.
3. Stock movement history.
4. Add opening stock.
5. Stock adjustment.
6. Low-stock alerts.

### Stock rules

Purchase received increases stock.

Sales dispatched decrease stock.

Sales returns increase stock only when returned material is accepted back into inventory.

Do not reduce stock merely because an estimate is created.

For orders with multiple deliveries, decrease stock for the actual delivered quantity.

Prevent negative stock by default, with controlled override permission if needed.

### APIs

GET /api/purchases\
POST /api/purchases\
GET /api/inventory\
GET /api/inventory/:materialId\
GET /api/inventory/movements\
POST /api/inventory/adjustments

### Deliverables

Accurate purchase records, stock balance, stock movement history and low-stock alerts.

### **Phase 6 — Estimates and sales billing**

Core revenue module

Implement Phase 6: Price Estimates and Sales Billing.

This is one of the most important workflows in Dipu Khata & Trade.

### A. Estimate creation

Create an estimate screen with:

1. Select existing customer or add new customer.
2. Select materials.
3. Enter quantities.
4. Select units.
5. Fetch current selling rates.
6. Allow manual rate adjustment.
7. Calculate line-item totals.
8. Add transportation charges.
9. Add discount.
10. Add applicable taxes if configured.
11. Calculate grand total.

Estimate fields:

- Estimate number.
- Customer.
- Date.
- Valid until.
- Material items.
- Quantity.
- Rate.
- Subtotal.
- Discount.
- Transportation.
- Tax.
- Grand total.
- Notes.
- Status.

Estimate statuses:

- Draft.
- Sent.
- Accepted.
- Rejected.
- Converted to sale.
- Expired.

An estimate must not create a financial ledger entry or reduce stock.

### B. Sales billing

Create a complete billing experience.

Workflow:

Select Customer → Add Materials → Enter Quantity → Calculate Price → Apply Discount → Add Transport → Select Payment Type → Confirm Sale → Generate Bill.

### Payment types

- Cash.
- UPI.
- Bank transfer.
- Credit.
- Mixed payment.

Allow partial payment.

Example:\
Bill amount: ₹15,000\
Cash paid: ₹5,000\
UPI paid: ₹2,000\
Credit remaining: ₹8,000.

### Sale statuses

- Draft.
- Confirmed.
- Partially delivered.
- Delivered.
- Cancelled.
- Returned.

### Important business rules

- Every sale receives a unique invoice number.
- Save the selling rate used at the time of sale.
- Do not change old bills when the material price changes.
- Create customer ledger entries atomically.
- Track payment status separately from delivery status.
- Support multiple materials in one sale.
- Support multiple deliveries against one sale.
- Prevent duplicate bill creation.

### APIs

GET /api/estimates\
POST /api/estimates\
POST /api/estimates/:id/convert\
GET /api/sales\
POST /api/sales\
GET /api/sales/:id\
POST /api/sales/:id/cancel

### Deliverables

Fully working estimates and sales billing with accurate totals, customer ledger integration and stock integration.

### **Phase 7 — Payments and accounting**

Implement Phase 7: Payment Collection and Accounting.

### Payment collection

Create a Receive Payment screen.

Fields:

- Customer.
- Payment date.
- Amount.
- Payment method.
- Reference number.
- Notes.
- Related sale (optional).

Payment methods:

- Cash.
- UPI.
- Bank.
- Other.

### Payment functionality

- Full payment.
- Partial payment.
- Advance payment.
- Multiple payments against one sale.
- Customer account settlement.
- Payment history.
- Payment receipt.

### Customer balance

Automatically update the customer balance when payments are successfully recorded.

Example:

Opening balance: ₹10,000\
New sale: ₹8,000\
Cash received: ₹5,000\
UPI received: ₹3,000

Closing balance: ₹10,000.

### Accounting screens

1. Receive payment.
2. Payment history.
3. Customer outstanding list.
4. Customer account statement.
5. Cash book.
6. Payment details.

### Cash book

Track:

- Opening cash.
- Cash sales collections.
- Cash received against credit.
- Cash expenses.
- Cash refunds.
- Cash closing balance.

UPI and bank transactions must remain separate from physical cash.

### APIs

POST /api/payments\
GET /api/payments\
GET /api/payments/:id\
GET /api/accounting/cash-book\
GET /api/accounting/outstanding

### Accounting safety

Never allow a payment to be silently edited or deleted after posting.

Corrections must use reversal entries.

Prevent duplicate payment submissions using idempotency keys.

### Deliverables

Reliable customer payment collection and accurate financial accounting.

### **Phase 8 — Cash memo, invoice and PDF**

Implement Phase 8: Document Generation.

Create professional printable documents matching the simplicity of the existing handwritten and printed business receipts.

### Documents

1. Cash memo.
2. Sales invoice.
3. Estimate quotation.
4. Payment receipt.
5. Customer ledger statement.

### Cash memo fields

- Business name: Dipu Khata & Trade.
- Business address.
- Contact number.
- Invoice number.
- Invoice date.
- Customer name.
- Customer mobile.
- Material description.
- Quantity.
- Unit.
- Rate.
- Amount.
- Discount.
- Transportation charges.
- Grand total.
- Amount received.
- Remaining balance.
- Payment method.
- Authorized signature.

### Requirements

- Generate PDF documents.
- Share through WhatsApp.
- Save and print.
- Support A4 and compact receipt layouts.
- Use Indian currency formatting.
- Support Hindi and English.
- Display quantities and amounts clearly.

Use a consistent professional invoice template.

### APIs

GET /api/documents/sales/:id\
GET /api/documents/estimates/:id\
GET /api/documents/payments/:id\
GET /api/documents/customers/:id/statement

### Deliverables

Production-quality PDFs generated from actual database records.

### **Phase 9 — Drivers, vehicles and delivery challans**

Implement Phase 9: Driver, Vehicle and Delivery Management.

### Driver management

Fields:

- Driver name.
- Mobile number.
- Address.
- Driving licence number (optional).
- Notes.
- Status.

### Vehicle management

Fields:

- Vehicle number.
- Vehicle type.
- Capacity.
- Owner name.
- Owner contact.
- Status.

### Delivery management

Allow a single sale to have multiple deliveries.

Create delivery screen:

- Select sale.
- Select customer.
- Delivery address.
- Select driver.
- Select vehicle.
- Material.
- Quantity.
- Unit.
- Delivery date.
- Transport charges.
- Notes.

### Chalan generation

Generate a unique delivery challan number.

Chalan must contain:

- Business details.
- Chalan number.
- Date.
- Customer details.
- Driver details.
- Vehicle number.
- Material description.
- Quantity.
- Unit.
- Delivery address.
- Receiver signature.
- Driver signature.

### Delivery statuses

- Pending.
- Assigned.
- Dispatched.
- Delivered.
- Failed.
- Cancelled.

### Important logic

A sale can have multiple challans.

Every challan must be linked to its parent sale.

Stock must decrease according to actual dispatched or delivered quantities, following one clearly defined stock policy.

Never deduct stock twice when a delivery status changes.

Track delivered and pending quantities separately.

### APIs

GET /api/drivers\
POST /api/drivers\
GET /api/vehicles\
POST /api/vehicles\
GET /api/deliveries\
POST /api/deliveries\
GET /api/deliveries/:id/challan

### Deliverables

Complete driver assignment, vehicle management, delivery tracking and printable challans.

### **Phase 10 — Expenses and reports**

Implement Phase 10: Business Expenses and Financial Reports.

### Expense management

Categories:

- Transportation.
- Fuel.
- Labour.
- Loading/unloading.
- Vehicle maintenance.
- Shop expenses.
- Miscellaneous.

Expense fields:

- Category.
- Amount.
- Date.
- Payment method.
- Description.
- Receipt attachment (optional).

### Reports

Create the following reports:

1. Daily sales report.
2. Weekly sales report.
3. Monthly sales report.
4. Cash collection report.
5. Credit sales report.
6. Outstanding customer report.
7. Customer-wise sales report.
8. Material-wise sales report.
9. Purchase report.
10. Stock report.
11. Expense report.
12. Profit estimate report.
13. Delivery and trip report.

### Dashboard analytics

Show:

- Total sales.
- Total collections.
- Credit outstanding.
- Total purchases.
- Total expenses.
- Stock valuation.
- Gross profit estimate.

Clearly distinguish cash flow, revenue and profit.

Calculate cost of goods sold using an appropriate inventory costing method, initially weighted average cost.

Do not treat credit sales as cash collections.

### Filters

- Date range.
- Customer.
- Material.
- Payment method.
- Transaction status.

### Export

- PDF.
- CSV.
- Excel.

### Deliverables

A useful business reporting system with accurate, filterable and exportable reports.

### **Phase 11 — Offline-first functionality**

Important for real-world usage

Implement Phase 11: Offline Support and Data Synchronization.

The application must remain useful when the shop has poor or no internet connectivity.

### Local database

Use Expo SQLite for local persistence.

Cache:

- Customers.
- Materials.
- Price lists.
- Stock snapshots.
- Recent sales.
- Customer ledger snapshots.
- Pending transactions.

### Offline operations

Allow users to:

- View previously synchronized customers.
- View cached material prices.
- Create sales.
- Record payments.
- Create estimates.
- Save delivery records.

### Synchronization

Implement:

- Pending sync queue.
- Automatic sync when connectivity returns.
- Manual sync button.
- Sync status indicator.
- Retry mechanism.
- Duplicate prevention.
- Conflict detection.
- Failed sync notifications.

### Important financial safety

Never silently overwrite a financial transaction.

Use globally unique client-generated transaction IDs and idempotency keys.

Use server-authoritative transaction validation.

Do not assume a locally recorded payment is fully committed until the server confirms synchronization.

Show clear labels:

- Synced.
- Pending sync.
- Sync failed.

### Deliverables

Reliable offline data entry and synchronization without duplicate sales, payments or stock movements.

### **Phase 12 — Final testing and production deployment**

Implement Phase 12: Final QA, Security and Production Deployment.

### Frontend testing

Test:

- Login and logout.
- Navigation.
- Customer creation.
- Khata calculations.
- Material creation.
- Purchase entry.
- Stock calculations.
- Estimate creation.
- Sales billing.
- Partial payments.
- Cash memo generation.
- Driver assignment.
- Delivery challan generation.
- Reports.
- Offline functionality.

### Backend testing

Test:

- Authentication.
- Authorization.
- Input validation.
- MongoDB transactions.
- Ledger consistency.
- Stock consistency.
- Payment idempotency.
- Invoice numbering.
- API pagination.
- Error handling.

### Financial integrity tests

Test scenarios:

1. Cash sale with full payment.
2. Credit sale without payment.
3. Partial payment.
4. Multiple payments against one bill.
5. Multiple deliveries against one sale.
6. Partial delivery.
7. Sales return.
8. Purchase return.
9. Stock adjustment.
10. Customer opening balance.
11. Transaction reversal.
12. Offline sale synchronization.

Verify that no transaction produces duplicate ledger or stock entries.

### Security

- Validate all incoming requests.
- Protect all private endpoints.
- Use secure password hashing.
- Implement rate limiting.
- Restrict CORS.
- Secure environment variables.
- Validate uploaded files.
- Implement database backup strategy.
- Avoid exposing sensitive customer data.

### Deployment

Prepare:

- Production MongoDB configuration.
- Production Node.js backend.
- AWS deployment configuration.
- Environment variables.
- Expo EAS build configuration.
- Android production build.
- Application icon and splash screen.

### Final deliverables

- Working Android application.
- Production-ready backend.
- MongoDB schemas.
- API documentation.
- Test reports.
- Deployment documentation.
- Backup and recovery instructions.

Do not mark the project production-ready until all critical financial integrity tests pass.

## **6. Recommended database collections**

Your coding agent should use these as the initial data model plan.

| Collection        | Purpose                              |
| ----------------- | ------------------------------------ |
| users             | Login and account information        |
| customers         | Customer profiles                    |
| materials         | Product catalog                      |
| categories        | Material categories                  |
| priceHistories    | Historical rates                     |
| suppliers         | Material suppliers                   |
| purchases         | Purchase bills                       |
| sales             | Customer sales                       |
| estimates         | Customer quotations                  |
| payments          | Money received and paid              |
| ledgerEntries     | Customer financial ledger            |
| stockMovements    | Inventory transactions               |
| drivers           | Driver information                   |
| vehicles          | Vehicle records                      |
| deliveries        | Delivery records                     |
| expenses          | Business expenses                    |
| documentSequences | Bill and challan numbering           |
| auditLogs         | Financial and administrative changes |

## **7. Final mobile app screen structure**

**Dipu Khata & Trade**

App structure

# **₹ Today's Business**

**Sales**

# **₹--**

**Collections**

# **₹--**

**Outstanding**

# **₹--**

**Stock**

# **--**

**Quick actions**

New Sale

Customer

Payment

Estimate

Purchase

Chalan

**Main modules**

- Dashboard
- Customers & Khata
- Sales & Billing
- Estimates
- Materials & Pricing
- Purchases & Inventory
- Payments & Cash Book
- Drivers & Vehicles
- Delivery Challans
- Expenses & Reports

Conceptual navigation layout — not connected to application functionality.

## **8. A few important architectural decisions**

Before development, I would enforce these five decisions:

1. **Single-shop first:** Design for one business account initially, but keep the database architecture ready for multiple shops in the future.
2. **Immutable financial ledger:** Sales, payments and reversals should have an auditable history.
3. **Offline-first:** Use SQLite locally and MongoDB as the server database, with explicit synchronization.
4. **Separate delivery from billing:** A ₹20,000 sale might be fulfilled in multiple truck trips; each trip needs its own challan.
5. **Stock movement ledger:** Never just overwrite a material's stock quantity. Record every purchase, sale, return and adjustment.

## **9. How to execute these prompts**

My suggested workflow:

- Paste the Master Prompt into your coding agent.
- Execute Phase 0 and verify the foundation.
- Give it Phase 1 only after Phase 0 is working.
- Continue sequentially through Phase 12.
- Commit your Git changes after every successful phase.
- Never let the agent implement all 12 phases in one go.

**One additional recommendation:** Since the current business records are handwritten, make customer opening balances and opening stock import part of your first usable release. You don't need to digitize every old transaction immediately; you can start with verified opening balances and preserve old registers for reference.

This approach will give you a maintainable application rather than a collection of disconnected screens.