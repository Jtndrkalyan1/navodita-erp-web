# NavoditaERP Web - Software Architecture

> Complete technical reference for the development team.
> Last updated: February 2026

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project File Tree](#2-project-file-tree)
3. [Architecture Overview](#3-architecture-overview)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Schema (60 Tables)](#6-database-schema-60-tables)
7. [API Reference (33 Endpoints)](#7-api-reference-33-endpoints)
8. [Where to Make Changes (Developer Guide)](#8-where-to-make-changes-developer-guide)
9. [Business Logic Locations](#9-business-logic-locations)
10. [Conventions & Patterns](#10-conventions--patterns)
11. [Build & Deploy](#11-build--deploy)

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.0 |
| **Routing** | React Router | 7.1 |
| **Styling** | Tailwind CSS | 4.0 |
| **Bundler** | Vite | 6.0 |
| **Charts** | Recharts | 2.15 |
| **HTTP Client** | Axios | 1.7 |
| **Icons** | react-icons | 5.4 |
| **Toasts** | react-hot-toast | 2.5 |
| **Backend** | Node.js + Express | 4.21 |
| **Database** | PostgreSQL | 16+ |
| **ORM** | Knex.js | 3.1 |
| **Auth** | JWT (jsonwebtoken) | 9.0 |
| **Validation** | Joi | 17.13 |
| **PDF** | Puppeteer | 24.37 |
| **File Parsing** | PapaParse, SheetJS, pdfjs-dist | - |
| **Process Manager** | PM2 | - |

---

## 2. Project File Tree

```
navodita-erp-web/
│
├── package.json                    # Root workspace (npm workspaces)
├── ecosystem.config.js             # PM2 process manager config
├── .env                            # Environment variables (DO NOT COMMIT)
├── .env.example                    # Environment template
├── .gitignore
├── DEPLOYMENT_GUIDE.md             # How to deploy on all platforms
├── SOFTWARE_ARCHITECTURE.md        # This file
│
├── scripts/
│   ├── setup.sh                    # Full project setup (DB + migrations + seed)
│   ├── start-dev.sh                # Start dev servers (backend:5001 + frontend:3000)
│   ├── start-production.sh         # Start production server
│   ├── build-production.sh         # Build frontend + run migrations
│   └── check-icons.js              # Icon validation utility
│
├── backend/
│   ├── package.json                # Backend dependencies
│   ├── knexfile.js                 # Database connection config (dev + production)
│   │
│   ├── db/
│   │   ├── migrations/             # Database schema (12 migration files)
│   │   │   ├── 20260207_001_core_tables.js          # company, users, settings, audit, currencies, chart_of_accounts
│   │   │   ├── 20260207_002_master_data.js          # customers, vendors, items + addresses
│   │   │   ├── 20260207_003_sales_tables.js         # invoices, quotations, challans, packing, eway, credit notes, payments
│   │   │   ├── 20260207_004_purchase_tables.js      # POs, bills, debit notes, payments made, expenses
│   │   │   ├── 20260207_005_banking_tables.js       # bank_accounts, bank_transactions
│   │   │   ├── 20260207_006_payroll_tables.js       # employees, salary_records, advances
│   │   │   ├── 20260207_007_accounting_tables.js    # journal_entries, journal_lines, currency_adjustments
│   │   │   ├── 20260207_008_compliance_tables.js    # gst_filings, tds_challans, tds_liabilities
│   │   │   ├── 20260207_009_inventory_costing_tables.js # inventory, costing sheets, fabric/trim/packing items
│   │   │   ├── 20260207_010_system_tables.js        # documents
│   │   │   ├── 20260207_011_schema_fixes.js         # customer_code, vendor_code unique indexes
│   │   │   └── 20260207_012_column_alignment.js     # Additional columns (branch, ifsc, place_of_supply, etc.)
│   │   │
│   │   └── seeds/                  # Data seeding
│   │       ├── 001_chart_of_accounts.js    # Default Indian chart of accounts
│   │       ├── 002_default_settings.js     # System settings (number formats, etc.)
│   │       ├── 003_default_admin.js        # Admin user (admin / admin123)
│   │       ├── 003_test_data.js            # Full test dataset (customers, vendors, invoices, etc.)
│   │       └── 004_test_data.js            # Additional test data
│   │
│   ├── src/
│   │   ├── index.js                # EXPRESS APP ENTRY POINT — middleware chain, route registration, static serving
│   │   │
│   │   ├── config/
│   │   │   ├── database.js         # Knex instance + connection test
│   │   │   └── constants.js        # App-wide constants
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authentication + role authorization + token generation
│   │   │   ├── errorHandler.js     # Global error handler (PostgreSQL errors, Joi, JWT)
│   │   │   └── validate.js         # Joi request validation middleware
│   │   │
│   │   ├── routes/                 # API route definitions (33 files)
│   │   │   ├── auth.routes.js              # /api/auth — login, register, refresh, me, password
│   │   │   ├── dashboard.routes.js         # /api/dashboard — summary, charts
│   │   │   ├── customer.routes.js          # /api/customers — CRUD
│   │   │   ├── vendor.routes.js            # /api/vendors — CRUD
│   │   │   ├── item.routes.js              # /api/items — CRUD
│   │   │   ├── invoice.routes.js           # /api/invoices — CRUD
│   │   │   ├── quotation.routes.js         # /api/quotations — CRUD
│   │   │   ├── bill.routes.js              # /api/bills — CRUD
│   │   │   ├── purchaseOrder.routes.js     # /api/purchase-orders — CRUD
│   │   │   ├── deliveryChallan.routes.js   # /api/delivery-challans — CRUD
│   │   │   ├── packingList.routes.js       # /api/packing-lists — CRUD
│   │   │   ├── ewayBill.routes.js          # /api/eway-bills — CRUD
│   │   │   ├── creditNote.routes.js        # /api/credit-notes — CRUD
│   │   │   ├── debitNote.routes.js         # /api/debit-notes — CRUD
│   │   │   ├── paymentReceived.routes.js   # /api/payments-received — CRUD
│   │   │   ├── paymentMade.routes.js       # /api/payments-made — CRUD
│   │   │   ├── expense.routes.js           # /api/expenses — CRUD
│   │   │   ├── employee.routes.js          # /api/employees — CRUD
│   │   │   ├── salary.routes.js            # /api/salary — CRUD + batch generate
│   │   │   ├── bankAccount.routes.js       # /api/bank-accounts — CRUD
│   │   │   ├── bankTransaction.routes.js   # /api/bank-transactions — CRUD + import + preview + categorize
│   │   │   ├── chartOfAccount.routes.js    # /api/chart-of-accounts — CRUD
│   │   │   ├── journalEntry.routes.js      # /api/journal-entries — CRUD
│   │   │   ├── gstFiling.routes.js         # /api/gst-filings — CRUD
│   │   │   ├── tds.routes.js               # /api/tds — combined TDS routes
│   │   │   ├── tdsLiability.routes.js      # /api/tds-liabilities — CRUD
│   │   │   ├── tdsChallan.routes.js        # /api/tds-challans — CRUD
│   │   │   ├── inventory.routes.js         # /api/inventory — CRUD
│   │   │   ├── costing.routes.js           # /api/costing — CRUD
│   │   │   ├── document.routes.js          # /api/documents — CRUD
│   │   │   ├── company.routes.js           # /api/company — get + update
│   │   │   ├── report.routes.js            # /api/reports — P&L, balance sheet, etc.
│   │   │   └── pdf.routes.js               # /api/pdf — generate PDF for any document
│   │   │
│   │   ├── controllers/           # Business logic handlers (20 files)
│   │   │   ├── auth.controller.js          # login, register, refreshToken, getMe, updateMe, changePassword, logout
│   │   │   ├── dashboard.controller.js     # getSummary, getCashFlow, getReceivablesChart, getExpenseBreakdown, getIncomeExpenseChart
│   │   │   ├── customer.controller.js      # list, getById, create, update, remove + generateCustomerCode()
│   │   │   ├── vendor.controller.js        # list, getById, create, update, remove + generateVendorCode()
│   │   │   ├── item.controller.js          # list, getById, create, update, remove
│   │   │   ├── invoice.controller.js       # CRUD + generateDocNumber() + calculateLineItem() [GST split]
│   │   │   ├── quotation.controller.js     # CRUD + generateQuotationNumber() + calculateLineItem()
│   │   │   ├── bill.controller.js          # CRUD + generateBillNumber() + calculateBillLineItem()
│   │   │   ├── purchaseOrder.controller.js # CRUD + generatePONumber() + calculateLineItem()
│   │   │   ├── creditNote.controller.js    # CRUD + generateCreditNoteNumber() + calculateLineItem()
│   │   │   ├── debitNote.controller.js     # CRUD + generateDebitNoteNumber() + calculateLineItem()
│   │   │   ├── expense.controller.js       # CRUD + generateExpenseNumber()
│   │   │   ├── paymentReceived.controller.js # CRUD + generatePaymentReceivedNumber()
│   │   │   ├── paymentMade.controller.js   # CRUD + generatePaymentMadeNumber()
│   │   │   ├── employee.controller.js      # CRUD + generateEmployeeCode()
│   │   │   ├── salary.controller.js        # CRUD + generate() batch + salary calculation
│   │   │   ├── bankAccount.controller.js   # CRUD
│   │   │   ├── bankTransaction.controller.js # CRUD + importFile() + previewFile() + categorize() + getBankFormats()
│   │   │   ├── chartOfAccount.controller.js # CRUD (hierarchical)
│   │   │   ├── company.controller.js       # get, update
│   │   │   └── (routes without dedicated controllers use inline handlers)
│   │   │
│   │   ├── services/              # Shared business logic (11 files)
│   │   │   ├── gst.service.js              # splitGST(), normalizedState() — IGST vs CGST+SGST logic
│   │   │   ├── salary.service.js           # calculateSalary(), PF/ESI/PT/TDS rates, statutory compliance
│   │   │   ├── indianCurrency.service.js   # formatIndianInteger(), currencySymbol() — ₹ lakhs/crores
│   │   │   ├── rounding.service.js         # roundToRupee() — banker's rounding for invoices
│   │   │   ├── invoiceHelper.service.js    # balanceDue(), isOverdue(), daysUntilDue()
│   │   │   ├── duplicatePrevention.service.js # scoreCustomer(), scoreVendor(), scoreItem() — fuzzy matching
│   │   │   ├── currency.service.js         # Exchange rates, multi-currency support
│   │   │   ├── inventoryCosting.service.js # FIFO/LIFO/WAC costing methods
│   │   │   ├── pdf.service.js              # Puppeteer PDF generation — HTML templates for all document types
│   │   │   ├── statementParser.service.js  # Bank statement parsing (CSV, Excel, HTML, PDF, MT940/MT950)
│   │   │   └── bankImport.service.js       # Import orchestration, duplicate detection
│   │   │
│   │   └── utils/
│   │       ├── countryStateData.js         # Indian states, GST state codes, countries
│   │       └── paymentTerms.js             # Standard payment term definitions
│   │
│   └── uploads/                    # File uploads directory
│
└── frontend/
    ├── package.json                # Frontend dependencies
    ├── vite.config.js              # Vite config — dev proxy /api → localhost:5001
    ├── index.html                  # HTML entry point
    │
    └── src/
        ├── main.jsx                # React entry — BrowserRouter + App
        ├── App.jsx                 # ALL route definitions — React.lazy() for code splitting
        │
        ├── styles/
        │   └── global.css          # Tailwind imports + custom CSS variables
        │
        ├── context/
        │   ├── AuthContext.jsx      # Auth state — login(), logout(), user, isAuthenticated
        │   └── NavigationContext.jsx # Navigation mode tracking — LIST/CREATE/EDIT/DETAIL + unsaved changes
        │
        ├── hooks/
        │   └── useUnsavedChanges.js # Form dirty tracking + beforeunload warning
        │
        ├── layouts/
        │   ├── MainLayout.jsx       # Auth guard + TopNav + Sidebar + content area
        │   ├── TopNav.jsx           # Header — logo, 6 module dropdowns, search, user menu
        │   └── Sidebar.jsx          # Module-aware sidebar — auto-detects active module from URL
        │
        ├── api/                     # API client modules (30 files — one per entity)
        │   ├── client.js            # Axios instance — base URL, JWT interceptor, error handling
        │   ├── customer.api.js      # getAll(), getById(), create(), update(), remove()
        │   ├── vendor.api.js
        │   ├── item.api.js
        │   ├── invoice.api.js
        │   ├── quotation.api.js
        │   ├── bill.api.js
        │   ├── purchaseOrder.api.js
        │   ├── deliveryChallan.api.js
        │   ├── packingList.api.js
        │   ├── ewayBill.api.js
        │   ├── creditNote.api.js
        │   ├── debitNote.api.js
        │   ├── paymentReceived.api.js
        │   ├── paymentMade.api.js
        │   ├── expense.api.js
        │   ├── employee.api.js
        │   ├── salary.api.js
        │   ├── bankAccount.api.js
        │   ├── bankTransaction.api.js
        │   ├── chartOfAccount.api.js
        │   ├── journalEntry.api.js
        │   ├── gstFiling.api.js
        │   ├── tdsLiability.api.js
        │   ├── tdsChallan.api.js
        │   ├── costing.api.js
        │   ├── company.api.js
        │   ├── dashboard.api.js
        │   └── document.api.js
        │
        ├── utils/
        │   └── currency.js          # formatINR() — Indian number formatting, amountInWords()
        │
        ├── components/              # Reusable UI components (20 files)
        │   ├── index.js             # Barrel export for all components
        │   ├── data-display/
        │   │   ├── DataTable.jsx    # Sortable table with selection, empty state
        │   │   ├── SummaryCard.jsx  # Dashboard KPI card with icon + trend
        │   │   ├── StatusBadge.jsx  # Color-coded status labels (Draft, Approved, etc.)
        │   │   ├── CurrencyCell.jsx # ₹ formatted table cell
        │   │   ├── DateCell.jsx     # DD/MMM/YYYY table cell
        │   │   └── DetailRow.jsx    # Label-value pair for detail views
        │   ├── forms/
        │   │   ├── FormField.jsx    # Input wrapper with label + error + help text
        │   │   ├── SelectField.jsx  # Dropdown select input
        │   │   ├── DatePicker.jsx   # Calendar date picker
        │   │   └── LineItemEditor.jsx # Line-by-line editor for invoice/bill items
        │   ├── layout/
        │   │   ├── ActionBar.jsx        # Page header with title + action buttons
        │   │   ├── ZohoListHeader.jsx   # List page header
        │   │   ├── ZohoSearchBar.jsx    # Search input with icon
        │   │   ├── ZohoColumnHeader.jsx # Sortable column header
        │   │   ├── ZohoEmptyState.jsx   # Empty state with icon + message
        │   │   └── ZohoPaymentBanner.jsx # Payment status banner
        │   └── feedback/
        │       ├── LoadingSpinner.jsx   # Animated spinner
        │       ├── DeleteConfirmModal.jsx # Delete confirmation dialog
        │       ├── Pagination.jsx       # Page navigation
        │       └── Toast.jsx            # Toast notification
        │
        └── pages/                   # Page components (84 files in 30 folders)
            ├── LoginPage.jsx
            ├── dashboard/
            │   ├── DashboardPage.jsx
            │   └── charts/
            │       ├── CashFlowChart.jsx
            │       ├── IncomeExpenseChart.jsx
            │       ├── ReceivablesDonutChart.jsx
            │       └── ExpenseBreakdownChart.jsx
            ├── customers/
            │   ├── CustomerListPage.jsx
            │   ├── CustomerFormPage.jsx
            │   └── CustomerDetailPage.jsx
            ├── vendors/
            │   ├── VendorListPage.jsx
            │   ├── VendorFormPage.jsx
            │   └── VendorDetailPage.jsx
            ├── items/
            │   ├── ItemListPage.jsx
            │   ├── ItemFormPage.jsx
            │   └── ItemDetailPage.jsx
            ├── invoices/
            │   ├── InvoiceListPage.jsx
            │   ├── InvoiceFormPage.jsx          # ~1150 lines — most complex form
            │   └── InvoiceDetailPage.jsx
            ├── quotations/
            │   ├── QuotationListPage.jsx
            │   ├── QuotationFormPage.jsx
            │   └── QuotationDetailPage.jsx
            ├── bills/
            │   ├── BillListPage.jsx
            │   ├── BillFormPage.jsx
            │   └── BillDetailPage.jsx
            ├── purchaseOrders/
            │   ├── PurchaseOrderListPage.jsx
            │   ├── PurchaseOrderFormPage.jsx
            │   └── PurchaseOrderDetailPage.jsx
            ├── deliveryChallans/
            │   ├── DeliveryChallanListPage.jsx
            │   ├── DeliveryChallanFormPage.jsx
            │   └── DeliveryChallanDetailPage.jsx
            ├── packingLists/
            │   ├── PackingListListPage.jsx
            │   ├── PackingListFormPage.jsx
            │   └── PackingListDetailPage.jsx
            ├── ewayBills/
            │   ├── EWayBillListPage.jsx
            │   ├── EWayBillFormPage.jsx
            │   └── EWayBillDetailPage.jsx
            ├── creditNotes/
            │   ├── CreditNoteListPage.jsx
            │   ├── CreditNoteFormPage.jsx
            │   └── CreditNoteDetailPage.jsx
            ├── debitNotes/
            │   ├── DebitNoteListPage.jsx
            │   ├── DebitNoteFormPage.jsx
            │   └── DebitNoteDetailPage.jsx
            ├── paymentsReceived/
            │   ├── PaymentReceivedListPage.jsx
            │   ├── PaymentReceivedFormPage.jsx
            │   └── PaymentReceivedDetailPage.jsx
            ├── paymentsMade/
            │   ├── PaymentMadeListPage.jsx
            │   ├── PaymentMadeFormPage.jsx
            │   └── PaymentMadeDetailPage.jsx
            ├── expenses/
            │   ├── ExpenseListPage.jsx
            │   ├── ExpenseFormPage.jsx
            │   └── ExpenseDetailPage.jsx
            ├── employees/
            │   ├── EmployeeListPage.jsx
            │   ├── EmployeeFormPage.jsx
            │   └── EmployeeDetailPage.jsx
            ├── payroll/
            │   └── PayrollPage.jsx
            ├── banking/
            │   ├── BankingPage.jsx              # Bank accounts + transactions tab view
            │   └── StatementImport.jsx          # Multi-format statement import wizard
            ├── chartOfAccounts/
            │   └── ChartOfAccountsPage.jsx
            ├── journalEntries/
            │   ├── JournalEntryListPage.jsx
            │   ├── JournalEntryFormPage.jsx
            │   └── JournalEntryDetailPage.jsx
            ├── compliance/
            │   ├── GSTFilingListPage.jsx
            │   ├── GSTFilingFormPage.jsx
            │   ├── GSTFilingDetailPage.jsx
            │   ├── TDSLiabilityListPage.jsx
            │   ├── TDSLiabilityFormPage.jsx
            │   ├── TDSLiabilityDetailPage.jsx
            │   ├── TDSChallanListPage.jsx
            │   ├── TDSChallanFormPage.jsx
            │   └── TDSChallanDetailPage.jsx
            ├── inventory/
            │   └── InventoryPage.jsx
            ├── costing/
            │   ├── CostingListPage.jsx
            │   ├── CostingFormPage.jsx
            │   └── CostingDetailPage.jsx
            ├── company/
            │   └── CompanyPage.jsx
            ├── reports/
            │   └── ReportsPage.jsx
            ├── settings/
            │   └── SettingsPage.jsx
            ├── security/
            │   └── SecurityPage.jsx
            └── documents/
                └── DocumentsPage.jsx
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     BROWSER                          │
│  React 19 + Tailwind CSS + React Router + Recharts  │
│  All pages lazy-loaded via React.lazy()              │
└──────────────────┬──────────────────────────────────┘
                   │ Axios HTTP (JWT Bearer token)
                   │ Proxy: /api → localhost:5001
                   ▼
┌─────────────────────────────────────────────────────┐
│                  EXPRESS SERVER                       │
│                                                      │
│  Middleware Chain:                                    │
│  helmet → cors → morgan → json → urlencoded          │
│                                                      │
│  33 Route Modules → 20 Controllers → 11 Services     │
│                                                      │
│  Production: also serves frontend/dist/ as static    │
└──────────────────┬──────────────────────────────────┘
                   │ Knex.js (SQL query builder)
                   ▼
┌─────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                     │
│            60 tables, 80+ foreign keys               │
│          UUID primary keys throughout                │
└─────────────────────────────────────────────────────┘
```

**Request Flow:**
```
Browser → Axios (client.js)
  → Express Route (routes/*.routes.js)
    → Auth Middleware (middleware/auth.js)
      → Validation Middleware (middleware/validate.js)
        → Controller (controllers/*.controller.js)
          → Service (services/*.service.js) [if needed]
            → Knex Query → PostgreSQL
          ← JSON Response
        ← Error Handler (middleware/errorHandler.js)
```

---

## 4. Backend Architecture

### 4.1 Entry Point (`backend/src/index.js`)

Registers all middleware and routes in this order:
1. `helmet()` — security headers
2. `cors()` — allows localhost:3000 in dev
3. `morgan()` — request logging
4. `express.json({ limit: '10mb' })` — JSON body parser
5. `/uploads` static files
6. `GET /api/health` — health check
7. **33 route modules** (all prefixed `/api/`)
8. Production: `express.static('frontend/dist')` + SPA fallback
9. Global error handler

### 4.2 Middleware

| File | Purpose |
|------|---------|
| `auth.js` | `authenticate` — verifies JWT, attaches `req.user`. `authorize(...roles)` — role check. `generateToken(userId)` — creates JWT. |
| `errorHandler.js` | Catches all errors. Maps PostgreSQL codes (23505→409, 23503→400), Joi errors (→400), JWT errors (→401). |
| `validate.js` | `validate(schema)` — validates `req.body`, `req.query`, `req.params` against Joi schema. |

### 4.3 Controller Pattern

Every controller follows this structure:
```javascript
// controllers/{entity}.controller.js
const list = async (req, res, next) => { ... };     // GET /
const getById = async (req, res, next) => { ... };  // GET /:id
const create = async (req, res, next) => { ... };   // POST /
const update = async (req, res, next) => { ... };   // PUT /:id
const remove = async (req, res, next) => { ... };   // DELETE /:id
module.exports = { list, getById, create, update, remove };
```

**Document controllers** (invoice, bill, quotation, etc.) also have:
- `generateDocNumber()` — auto-increments using `invoice_number_settings` table
- `calculateLineItem()` — computes GST split (IGST vs CGST+SGST)

### 4.4 Services

| Service | Key Functions | Used By |
|---------|--------------|---------|
| `gst.service.js` | `splitGST(totalGST, companyState, customerState, companyGstin, customerGstin)` | invoice, bill, quotation, credit/debit note controllers |
| `salary.service.js` | `calculateSalary()`, `daysInMonth()` — PF/ESI/PT/TDS | salary controller |
| `indianCurrency.service.js` | `formatIndianInteger()`, `currencySymbol()` | PDF service |
| `rounding.service.js` | `roundToRupee()` — banker's rounding | invoice, bill controllers |
| `invoiceHelper.service.js` | `balanceDue()`, `isOverdue()`, `daysUntilDue()` | invoice, bill controllers |
| `duplicatePrevention.service.js` | `scoreCustomer()`, `scoreVendor()`, `scoreItem()` | customer, vendor, item controllers |
| `pdf.service.js` | `generatePDF()` + HTML templates for all documents | PDF routes |
| `statementParser.service.js` | `parseStatement()` — CSV, Excel, HTML, PDF, MT940 | bank transaction controller |
| `bankImport.service.js` | `importStatement()`, `isDuplicate()` | bank transaction controller |
| `inventoryCosting.service.js` | FIFO/LIFO/WAC lot tracking | inventory routes |
| `currency.service.js` | Exchange rates, multi-currency | invoice, bill controllers |

---

## 5. Frontend Architecture

### 5.1 Routing (`App.jsx`)

All routes are lazy-loaded. Pattern per entity:
```
/entity              → EntityListPage.jsx
/entity/new          → EntityFormPage.jsx
/entity/:id          → EntityDetailPage.jsx
/entity/:id/edit     → EntityFormPage.jsx (detects edit mode via :id param)
```

### 5.2 Layout System

```
MainLayout.jsx
├── TopNav.jsx         # Fixed header with 6 module dropdowns
├── Sidebar.jsx        # Module-specific navigation (auto-detects from URL)
└── <Outlet />         # Current page content
```

**Module Detection:** `Sidebar.jsx` has a `SIDEBAR_CONFIG` object per module (books, hr, banking, compliance, inventory, settings). It reads the current URL to determine which sidebar to show.

### 5.3 State Management

No Redux/Zustand — uses React Context:

| Context | State | Methods |
|---------|-------|---------|
| `AuthContext` | `user`, `loading`, `isAuthenticated` | `login()`, `logout()` |
| `NavigationContext` | `currentMode`, `hasUnsavedChanges` | `navigateTo()`, `confirmNavigation()` |

### 5.4 API Client (`api/client.js`)

- Base Axios instance with 30s timeout
- **Request interceptor:** attaches `Authorization: Bearer <token>` from localStorage
- **Response interceptor:** handles 401 (auto-logout), 403, 422, 500 with toast messages
- Each entity has its own `api/{entity}.api.js` with `getAll()`, `getById()`, `create()`, `update()`, `remove()`

### 5.5 Component Library (20 components)

| Category | Components | Import From |
|----------|-----------|-------------|
| **Data Display** | DataTable, SummaryCard, StatusBadge, CurrencyCell, DateCell, DetailRow | `components/data-display/` |
| **Forms** | FormField, SelectField, DatePicker, LineItemEditor | `components/forms/` |
| **Layout** | ActionBar, ZohoListHeader, ZohoSearchBar, ZohoColumnHeader, ZohoEmptyState, ZohoPaymentBanner | `components/layout/` |
| **Feedback** | LoadingSpinner, DeleteConfirmModal, Pagination, Toast | `components/feedback/` |

All exported from `components/index.js` for easy imports.

---

## 6. Database Schema (60 Tables)

### Entity Relationship Diagram (Text)

```
company_profile (standalone)
app_users ←── audit_logs
          ←── bank_transactions.reconciled_by
          ←── journal_entries.created_by / posted_by

chart_of_accounts (self-referential via parent_account_id)
  ←── items.sales_account_id / purchase_account_id
  ←── bank_accounts.chart_account_id
  ←── journal_lines.account_id
  ←── expenses.expense_account_id / paid_from_account_id
  ←── payments_received.deposit_account_id
  ←── payments_made.paid_from_account_id
  ←── bills.overhead_account_id

customers ──→ customer_addresses (CASCADE)
          ──→ quotations → quotation_items
          ──→ invoices → invoice_items
          ──→ delivery_challans → delivery_challan_items
          ──→ packing_lists → packing_list_items → packing_list_sub_items
          ──→ eway_bills → eway_bill_items
          ──→ credit_notes → credit_note_items
          ──→ payments_received → payment_received_allocations ←→ invoices

vendors ──→ vendor_addresses (CASCADE)
        ──→ purchase_orders → purchase_order_items
        ──→ bills → bill_items
        ──→ debit_notes → debit_note_items
        ──→ payments_made → payment_made_allocations ←→ bills
        ──→ expenses

items ←── (all line item tables: invoice_items, bill_items, etc.)
      ──→ inventory_items → inventory_transactions

bank_accounts ──→ bank_transactions
                   ←── payments_received.bank_transaction_id
                   ←── payments_made.bank_transaction_id
                   ←── expenses.bank_transaction_id
                   ←── salary_records.bank_transaction_id

employees (self-referential via reporting_manager_id)
  ──→ salary_records
  ──→ advances → advance_recoveries ←→ salary_records
  ←── departments.head_of_department_id

journal_entries ──→ journal_lines
                ←── currency_adjustments.journal_entry_id

tds_liabilities ←── bills / expenses / salary_records
                ──→ tds_challans

costing_sheets ──→ costing_versions ──→ costing_fabric_items
                                    ──→ costing_trim_items
                                    ──→ costing_packing_items
```

### Complete Table Reference

#### Core Tables (Migration 001)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `company_profile` | company_name, gstin, pan, tan, lut_number, base_currency, financial_year_start | Single row — company settings |
| `app_users` | username, password_hash, role, display_name, email, is_active, failed_login_attempts, locked_until | Roles: Admin, Manager, Accountant, Viewer |
| `app_settings` | setting_key (unique), setting_value, setting_type, category | Key-value config store |
| `audit_logs` | user_id→app_users, action, entity_type, entity_id, old_values, new_values, ip_address | Auto-audit trail |
| `currencies` | code (unique), name, symbol, exchange_rate, decimal_places, is_base_currency | Multi-currency support |
| `chart_of_accounts` | account_code (unique), account_name, account_type, account_sub_type, parent_account_id→self, opening_balance, current_balance | Hierarchical — Asset/Liability/Income/Expense/Equity |
| `departments` | name, description, head_of_department_id→employees | Org structure |
| `invoice_number_settings` | document_type (unique), prefix, separator, next_number, padding_digits, suffix, reset_frequency | Auto-numbering: INV-0001, QTN-0001, etc. |

#### Master Data (Migration 002)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `customers` | customer_code, display_name, company_name, gstin, gst_treatment, pan, email, phone, credit_limit, payment_terms, opening_balance, is_active | GST treatments: Registered, Unregistered, Consumer, SEZ, Overseas |
| `customer_addresses` | customer_id→customers (CASCADE), address_type, line1, line2, city, state, pincode, country, is_default | Billing + Shipping addresses |
| `vendors` | vendor_code, display_name, company_name, gstin, gst_treatment, pan, tds_section, tds_rate, payment_terms, opening_balance | TDS sections: 194C, 194J, etc. |
| `vendor_addresses` | vendor_id→vendors (CASCADE), address_type, line1, line2, city, state, pincode, country, is_default | |
| `items` | name, sku, unit, hsn_code, gst_rate, content, color, selling_price, cost_price, sales_account_id→chart_of_accounts, purchase_account_id→chart_of_accounts | HSN = Indian tariff code |

#### Sales (Migration 003)
| Table | Key Columns | FK |
|-------|------------|-----|
| `quotations` | quotation_number, customer_id, quotation_date, expiry_date, status, sub_total, total_tax, total_amount, place_of_supply | customer_id→customers |
| `quotation_items` | quotation_id, item_id, description, quantity, rate, discount_percent, gst_rate, cgst, sgst, igst, amount | CASCADE on quotation |
| `invoices` | invoice_number, customer_id, invoice_date, due_date, status, sub_total, total_tax, total_amount, amount_paid, balance_due, is_export, lut_applicable, reverse_charge | customer_id→customers, source_quotation_id→quotations |
| `invoice_items` | invoice_id, item_id, quantity, rate, discount_percent, gst_rate, cgst, sgst, igst, cess, amount | CASCADE on invoice |
| `delivery_challans` | challan_number, invoice_id, customer_id, challan_date, challan_type, transporter_name, vehicle_number, lr_number | |
| `delivery_challan_items` | delivery_challan_id, item_id, quantity, rate, amount | CASCADE |
| `packing_lists` | packing_list_number, invoice_id, customer_id, total_cartons, total_gross_weight, total_net_weight | |
| `packing_list_items` | packing_list_id, item_id, quantity, carton_number, gross_weight, net_weight | CASCADE |
| `packing_list_sub_items` | packing_list_item_id, size, color, quantity | CASCADE |
| `eway_bills` | eway_bill_number, invoice_id, customer_id, generation_date, valid_until, status, distance_km | |
| `eway_bill_items` | eway_bill_id, item_id, quantity, taxable_value, gst_rate | CASCADE |
| `credit_notes` | credit_note_number, customer_id, invoice_id, credit_note_date, reason, status, total_amount | |
| `credit_note_items` | credit_note_id, item_id, quantity, rate, gst_rate, amount | CASCADE |
| `payments_received` | payment_number, customer_id, payment_date, amount, payment_mode, deposit_account_id, bank_transaction_id, tds_amount, tds_section | |
| `payment_received_allocations` | payment_received_id, invoice_id, allocated_amount | Links payments to invoices |

#### Purchases (Migration 004)
| Table | Key Columns | FK |
|-------|------------|-----|
| `purchase_orders` | po_number, vendor_id, po_date, expected_delivery_date, status, sub_total, total_amount | vendor_id→vendors |
| `purchase_order_items` | purchase_order_id, item_id, ordered_quantity, received_quantity, rate, amount | CASCADE |
| `bills` | bill_number, vendor_id, purchase_order_id, bill_date, due_date, status, sub_total, tds_amount, tds_section, total_amount, amount_paid, balance_due | vendor_id→vendors |
| `bill_items` | bill_id, item_id, account_id, quantity, rate, discount_percent, gst_rate, amount | CASCADE |
| `debit_notes` | debit_note_number, vendor_id, bill_id, debit_note_date, reason, status, total_amount | |
| `debit_note_items` | debit_note_id, item_id, quantity, rate, gst_rate, amount | CASCADE |
| `payments_made` | payment_number, vendor_id, payment_date, amount, payment_mode, paid_from_account_id, bank_transaction_id, tds_amount | |
| `payment_made_allocations` | payment_made_id, bill_id, allocated_amount | Links payments to bills |
| `expenses` | expense_number, vendor_id, customer_id, expense_date, amount, expense_account_id, paid_from_account_id, bank_transaction_id, status | |

#### Banking (Migration 005)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `bank_accounts` | account_name, account_number, bank_name, ifsc_code, branch, account_type, current_balance, opening_balance, is_primary, is_active, chart_account_id | |
| `bank_transactions` | bank_account_id, transaction_date, value_date, description, reference_number, deposit_amount, withdrawal_amount, balance, category, is_reconciled, reconciled_date, reconciled_by, import_batch_id | Linked to payments/expenses |

#### Payroll (Migration 006)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `employees` | employee_id, first_name, last_name, department_id, designation, date_of_joining, employment_type, employment_status, basic_salary, hra, da, pan_number, aadhar_number, pf_number, esi_number, uan, bank_account_number, bank_ifsc | Full employee master |
| `salary_records` | employee_id, month, year, status, days_present, days_absent, basic_earned, hra_earned, da_earned, gross_earnings, pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, income_tax, total_deductions, net_salary | Monthly payslip |
| `advances` | employee_id, advance_date, amount, balance_amount, recovery_months, status | Salary advance tracking |
| `advance_recoveries` | advance_id, salary_record_id, recovery_date, amount | Monthly EMI recovery |

#### Accounting (Migration 007)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `journal_entries` | journal_number, journal_date, journal_type, status, total_debit, total_credit, source_type, source_id, notes | Status: Draft, Posted, Void |
| `journal_lines` | journal_entry_id, account_id→chart_of_accounts, debit_amount, credit_amount, description, contact_type, contact_id | Each line = one GL entry |
| `currency_adjustments` | adjustment_date, from_currency, to_currency, gain_loss_amount, journal_entry_id | Forex gain/loss tracking |

#### Compliance (Migration 008)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `gst_filings` | filing_type, period, filing_year, filing_month, status, total_taxable_value, total_igst, total_cgst, total_sgst, total_cess, filing_date, acknowledgement_number | Types: GSTR-1, GSTR-3B, GSTR-9, CMP-08 |
| `tds_challans` | challan_number, challan_type, bsr_code, deposit_date, quarter_period, assessment_year, total_tds_deposited, surcharge, education_cess, interest, late_fee | Challan types: 280, 281 |
| `tds_liabilities` | section, deductee_type, deductee_name, deductee_pan, tds_rate, gross_amount, tds_amount, deduction_date, status, linked_bill_id, linked_expense_id, linked_salary_record_id, challan_id | TDS sections: 194C, 194J, etc. |

#### Inventory & Costing (Migration 009)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `inventory_categories` | name, parent_category_id→self, is_active, sort_order | Hierarchical categories |
| `inventory_items` | item_id→items, category_id, quantity_on_hand, reorder_level, reorder_quantity, average_cost, warehouse_location | Stock tracking |
| `inventory_transactions` | inventory_item_id, transaction_type, transaction_date, quantity, unit_cost, total_cost, running_balance, reference_type, reference_id | Types: Purchase, Sale, Adjustment, Transfer, Return, Opening |
| `costing_sheets` | style_number, style_name, customer_id, vendor_id, order_quantity, total_cost, cost_per_piece, status | Garment costing master |
| `costing_versions` | costing_sheet_id, version_number, status, total_fabric_cost, total_trim_cost, total_packing_cost, cmt_cost, overhead_cost, washing_cost, printing_cost, embroidery_cost, testing_cost, freight_cost | Version-controlled costing |
| `costing_fabric_items` | costing_version_id, fabric_name, fabric_type, composition, width, gsm, rate, consumption, wastage_percent, cost | |
| `costing_trim_items` | costing_version_id, trim_name, trim_type, rate, consumption, cost | |
| `costing_packing_items` | costing_version_id, item_name, rate, consumption, cost | |
| `style_costings` | style_name, style_number, item_id, costing_sheet_id, total_cost, cost_per_piece | Summary table |

#### System (Migration 010)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `documents` | file_name, file_path, file_type, file_size, category, entity_type, entity_id, customer_id, vendor_id, uploaded_by | File attachment storage |

---

## 7. API Reference (33 Endpoints)

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → JWT token |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/refresh-token` | Yes | Refresh JWT |
| GET | `/api/auth/me` | Yes | Current user |
| PUT | `/api/auth/me` | Yes | Update profile |
| POST | `/api/auth/change-password` | Yes | Change password |

### Standard CRUD (all require auth)
Each entity has: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

| API Path | Entity | Controller |
|----------|--------|------------|
| `/api/customers` | Customer | customer.controller.js |
| `/api/vendors` | Vendor | vendor.controller.js |
| `/api/items` | Item | item.controller.js |
| `/api/invoices` | Invoice | invoice.controller.js |
| `/api/quotations` | Quotation | quotation.controller.js |
| `/api/bills` | Bill | bill.controller.js |
| `/api/purchase-orders` | Purchase Order | purchaseOrder.controller.js |
| `/api/delivery-challans` | Delivery Challan | (route handler) |
| `/api/packing-lists` | Packing List | (route handler) |
| `/api/eway-bills` | E-Way Bill | (route handler) |
| `/api/credit-notes` | Credit Note | creditNote.controller.js |
| `/api/debit-notes` | Debit Note | debitNote.controller.js |
| `/api/payments-received` | Payment Received | paymentReceived.controller.js |
| `/api/payments-made` | Payment Made | paymentMade.controller.js |
| `/api/expenses` | Expense | expense.controller.js |
| `/api/employees` | Employee | employee.controller.js |
| `/api/bank-accounts` | Bank Account | bankAccount.controller.js |
| `/api/chart-of-accounts` | Chart of Account | chartOfAccount.controller.js |
| `/api/journal-entries` | Journal Entry | (route handler) |
| `/api/gst-filings` | GST Filing | (route handler) |
| `/api/tds-liabilities` | TDS Liability | (route handler) |
| `/api/tds-challans` | TDS Challan | (route handler) |
| `/api/costing` | Costing Sheet | (route handler) |
| `/api/inventory` | Inventory | (route handler) |
| `/api/documents` | Document | (route handler) |

### Specialized Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Financial KPIs |
| GET | `/api/dashboard/charts/cash-flow` | Cash flow data |
| GET | `/api/dashboard/charts/receivables` | Receivables by customer |
| GET | `/api/dashboard/charts/expenses` | Expense breakdown |
| GET | `/api/dashboard/charts/income-expense` | Income vs expense |
| POST | `/api/salary/generate` | Batch generate payslips |
| POST | `/api/bank-transactions/import-file` | Import statement (multipart) |
| POST | `/api/bank-transactions/preview` | Preview before import |
| POST | `/api/bank-transactions/categorize` | Batch categorize |
| GET | `/api/bank-transactions/formats` | List supported bank formats |
| GET | `/api/company` | Get company profile |
| PUT | `/api/company` | Update company profile |
| GET | `/api/pdf/invoice/:id` | Generate invoice PDF |
| GET | `/api/pdf/quotation/:id` | Generate quotation PDF |
| GET | `/api/pdf/bill/:id` | Generate bill PDF |
| GET | `/api/pdf/salary-slip/:id` | Generate salary slip PDF |
| GET | `/api/reports/profit-and-loss` | P&L report |
| GET | `/api/reports/balance-sheet` | Balance sheet |

### Query Parameters (all list endpoints)
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `search` | string | Search across name, email, phone, etc. |
| `sort_by` | string | Column to sort by |
| `sort_order` | 'asc'/'desc' | Sort direction |
| `status` | string | Filter by status |
| `from_date` | YYYY-MM-DD | Date range start |
| `to_date` | YYYY-MM-DD | Date range end |
| `is_active` | boolean | Active/inactive filter |

---

## 8. Where to Make Changes (Developer Guide)

This is the most important section. It tells you which files to touch for every common change.

### 8.1 Adding a New Entity (e.g., "Warehouse")

You need to create/modify **8 files**:

| Step | File to Create/Modify | What to Do |
|------|----------------------|------------|
| 1 | `backend/db/migrations/20260207_013_warehouse.js` | Create new migration with `createTable('warehouses', ...)` |
| 2 | `backend/src/routes/warehouse.routes.js` | Define GET/POST/PUT/DELETE routes |
| 3 | `backend/src/controllers/warehouse.controller.js` | Implement list, getById, create, update, remove |
| 4 | **`backend/src/index.js`** | Add `app.use('/api/warehouses', require('./routes/warehouse.routes'))` |
| 5 | `frontend/src/api/warehouse.api.js` | Create API client with getAll, getById, create, update, remove |
| 6 | `frontend/src/pages/warehouses/WarehouseListPage.jsx` | List page |
| 7 | `frontend/src/pages/warehouses/WarehouseFormPage.jsx` | Create/Edit form |
| 8 | `frontend/src/pages/warehouses/WarehouseDetailPage.jsx` | Detail view |
| 9 | **`frontend/src/App.jsx`** | Add lazy imports + `<Route>` definitions |
| 10 | **`frontend/src/layouts/Sidebar.jsx`** | Add to `SIDEBAR_CONFIG` under appropriate module |
| 11 | **`frontend/src/layouts/TopNav.jsx`** | Add to module dropdown menu |

Run migration: `npm run db:migrate`

### 8.2 Adding a Column to an Existing Table

| Step | File | What to Do |
|------|------|------------|
| 1 | `backend/db/migrations/20260207_013_new_column.js` | New migration: `table.string('new_column')` in `alterTable` |
| 2 | `backend/src/controllers/{entity}.controller.js` | Add column to `create()` and `update()` insert/update objects |
| 3 | `frontend/src/pages/{entity}/{Entity}FormPage.jsx` | Add form field |
| 4 | `frontend/src/pages/{entity}/{Entity}DetailPage.jsx` | Display the field |
| 5 | `frontend/src/pages/{entity}/{Entity}ListPage.jsx` | Add column to table (if needed) |

### 8.3 Changing GST Calculation

| File | What to Change |
|------|---------------|
| **`backend/src/services/gst.service.js`** | `splitGST()` — core logic for IGST vs CGST+SGST |
| `backend/src/controllers/invoice.controller.js` | `calculateLineItem()` — calls splitGST |
| `backend/src/controllers/bill.controller.js` | `calculateBillLineItem()` |
| `backend/src/controllers/quotation.controller.js` | `calculateLineItem()` |
| `backend/src/controllers/creditNote.controller.js` | `calculateLineItem()` |
| `backend/src/controllers/debitNote.controller.js` | `calculateLineItem()` |

**One change in `gst.service.js` affects all documents.**

### 8.4 Changing Salary Calculation

| File | What to Change |
|------|---------------|
| **`backend/src/services/salary.service.js`** | `calculateSalary()` — PF/ESI/PT/TDS rates and formulas |
| `backend/src/controllers/salary.controller.js` | `create()` and `generate()` — calls calculateSalary |
| `frontend/src/pages/payroll/PayrollPage.jsx` | UI display of salary components |

**One change in `salary.service.js` affects all payroll processing.**

### 8.5 Changing PDF Template

| File | What to Change |
|------|---------------|
| **`backend/src/services/pdf.service.js`** | HTML templates: `generateInvoiceHTML()`, `generateQuotationHTML()`, `generateBillHTML()`, `generateSalarySlipHTML()` |

All templates are in one file. Each function returns an HTML string that Puppeteer converts to PDF.

### 8.6 Changing Currency Formatting

| File | What to Change |
|------|---------------|
| **`backend/src/services/indianCurrency.service.js`** | Backend formatting (for PDFs, reports) |
| **`frontend/src/utils/currency.js`** | Frontend formatting — `formatINR()`, `amountInWords()` |
| `frontend/src/components/data-display/CurrencyCell.jsx` | Table cell display |

### 8.7 Changing Authentication

| File | What to Change |
|------|---------------|
| `backend/src/middleware/auth.js` | JWT verification, token generation, role authorization |
| `backend/src/controllers/auth.controller.js` | Login, register, password logic, lockout (5 attempts → 30 min) |
| `frontend/src/context/AuthContext.jsx` | Login/logout state, localStorage handling |
| `frontend/src/api/client.js` | JWT interceptor, 401 auto-logout |

### 8.8 Changing Navigation / Sidebar

| File | What to Change |
|------|---------------|
| **`frontend/src/layouts/Sidebar.jsx`** | `SIDEBAR_CONFIG` object — sidebar items per module |
| **`frontend/src/layouts/TopNav.jsx`** | Module dropdown menus in the header |
| **`frontend/src/layouts/MainLayout.jsx`** | `ROUTE_TO_MODULE` mapping — URL → module detection |
| **`frontend/src/App.jsx`** | Route definitions (add/remove/reorder) |

### 8.9 Changing Table Display / List Pages

| File | What to Change |
|------|---------------|
| `frontend/src/pages/{entity}/{Entity}ListPage.jsx` | Columns definition, filters, sort, search |
| `frontend/src/components/data-display/DataTable.jsx` | Table rendering (affects ALL list pages) |
| `frontend/src/components/layout/ZohoColumnHeader.jsx` | Column header style/behavior |
| `frontend/src/components/feedback/Pagination.jsx` | Pagination controls |

### 8.10 Adding Bank Statement Format Support

| File | What to Change |
|------|---------------|
| **`backend/src/services/statementParser.service.js`** | Add to `BANK_FORMATS`, add detection in `detectBankFormat()`, add column candidates |
| `frontend/src/pages/banking/StatementImport.jsx` | Update format labels and instructions |

### 8.11 Changing Database Connection

| File | What to Change |
|------|---------------|
| **`backend/knexfile.js`** | Connection settings for dev and production |
| **`.env`** | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| `backend/src/config/database.js` | Connection pool settings |

### 8.12 Changing Global Styles

| File | What to Change |
|------|---------------|
| **`frontend/src/styles/global.css`** | Tailwind imports + custom CSS variables |
| `frontend/src/layouts/TopNav.jsx` | Header colors (hardcoded: `#1B2631`) |
| `frontend/src/layouts/Sidebar.jsx` | Sidebar colors and widths |

### 8.13 Adding a Dashboard Widget

| File | What to Change |
|------|---------------|
| `backend/src/controllers/dashboard.controller.js` | Add new data query function |
| `backend/src/routes/dashboard.routes.js` | Add new GET endpoint |
| `frontend/src/api/dashboard.api.js` | Add API call |
| `frontend/src/pages/dashboard/charts/NewChart.jsx` | Create chart component |
| `frontend/src/pages/dashboard/DashboardPage.jsx` | Import and render the chart |

### 8.14 Quick Reference: "Where Does This Live?"

| Feature | File(s) |
|---------|---------|
| GST calculation | `backend/src/services/gst.service.js` |
| Salary calculation | `backend/src/services/salary.service.js` |
| PDF templates | `backend/src/services/pdf.service.js` |
| Currency formatting (backend) | `backend/src/services/indianCurrency.service.js` |
| Currency formatting (frontend) | `frontend/src/utils/currency.js` |
| Invoice rounding | `backend/src/services/rounding.service.js` |
| Duplicate detection | `backend/src/services/duplicatePrevention.service.js` |
| Bank statement parsing | `backend/src/services/statementParser.service.js` |
| Bank import logic | `backend/src/services/bankImport.service.js` |
| Inventory costing (FIFO/LIFO/WAC) | `backend/src/services/inventoryCosting.service.js` |
| Indian states & GST codes | `backend/src/utils/countryStateData.js` |
| Payment terms | `backend/src/utils/paymentTerms.js` |
| Document auto-numbering | `invoice_number_settings` table + controller `generateDocNumber()` |
| JWT auth | `backend/src/middleware/auth.js` |
| Error handling | `backend/src/middleware/errorHandler.js` |
| Validation schemas | `backend/src/middleware/validate.js` |
| API base config | `frontend/src/api/client.js` |
| Auth state | `frontend/src/context/AuthContext.jsx` |
| Sidebar config | `frontend/src/layouts/Sidebar.jsx` → `SIDEBAR_CONFIG` |
| Route definitions | `frontend/src/App.jsx` |
| All components | `frontend/src/components/index.js` |

---

## 9. Business Logic Locations

### 9.1 GST (Goods & Services Tax)
- **Core Logic:** `backend/src/services/gst.service.js`
  - Same state → CGST (50%) + SGST (50%)
  - Different state → IGST (100%)
  - Export/SEZ → 0% or IGST with LUT
- **State Code Map:** `backend/src/utils/countryStateData.js`
- **Applied In:** invoice, bill, quotation, credit note, debit note controllers via `calculateLineItem()`

### 9.2 TDS (Tax Deducted at Source)
- **Sections:** 194C (Contractors), 194J (Professional), etc.
- **Rate stored on:** vendors.tds_section, vendors.tds_rate
- **Deducted on:** bills, expenses, salary
- **Tracked in:** `tds_liabilities` table
- **Deposited via:** `tds_challans` table

### 9.3 Salary & Statutory
- **Core Logic:** `backend/src/services/salary.service.js`
- **PF:** 12% employee + 12% employer (on basic up to ₹15,000)
- **ESI:** 0.75% employee + 3.25% employer (gross up to ₹21,000)
- **Professional Tax:** State-wise brackets
- **LWF:** 0.2% in June & December

### 9.4 Document Numbering
- **Table:** `invoice_number_settings`
- **Pattern:** `{prefix}{separator}{padded_number}{suffix}`
- **Example:** INV-0001, QTN-0001, BILL-0001
- **Reset:** yearly, monthly, or never
- **Logic in:** each controller's `generateDocNumber()` or `generate{Entity}Number()`

### 9.5 Bank Reconciliation
- **Import:** `statementParser.service.js` (CSV, Excel, HTML, PDF, MT940/MT950)
- **Duplicate Detection:** `bankImport.service.js` — matches date + amount + description + reference
- **Auto-Categorize:** `categorizeTransaction()` in statementParser — keywords for bank charges, salary, tax, transfer, refund
- **Supported Banks:** ICICI, HDFC, SBI, Kotak, Axis + any bank via auto-detect

### 9.6 Inventory Costing
- **Methods:** FIFO, LIFO, Weighted Average Cost (WAC)
- **Logic:** `backend/src/services/inventoryCosting.service.js`
- **Lot Tracking:** Each purchase creates an inventory lot, sales consume lots based on method

---

## 10. Conventions & Patterns

### Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Database table | snake_case (plural) | `invoice_items` |
| Database column | snake_case | `total_amount` |
| API route | kebab-case (plural) | `/api/credit-notes` |
| Controller file | camelCase.controller.js | `creditNote.controller.js` |
| Route file | camelCase.routes.js | `creditNote.routes.js` |
| Service file | camelCase.service.js | `gst.service.js` |
| API client file | camelCase.api.js | `creditNote.api.js` |
| React component | PascalCase.jsx | `CreditNoteFormPage.jsx` |
| React hook | useCamelCase.js | `useUnsavedChanges.js` |

### Page Naming Pattern
Every entity with CRUD has 3 pages:
```
{Entity}ListPage.jsx    — Table view with filters, sort, search
{Entity}FormPage.jsx    — Create AND Edit (detects mode from :id param)
{Entity}DetailPage.jsx  — Read-only view with edit/delete buttons
```

### Primary Keys
All tables use **UUID** primary keys (auto-generated via `uuid_generate_v4()` or `gen_random_uuid()`).

### Timestamps
Every table has `created_at` and `updated_at` columns (auto-set by Knex).

### Soft Delete
Delete checks for dependencies first (RESTRICT foreign keys prevent orphans). No soft-delete flag — records are actually deleted.

### Error Responses
```json
{ "error": "Human-readable error message" }
{ "error": "Validation failed", "details": [{ "field": "email", "message": "is required" }] }
```

### Success Responses
```json
{ "data": { ... } }                    // Single entity
{ "data": [...], "total": 100, "page": 1, "limit": 20 }  // List with pagination
```

---

## 11. Build & Deploy

### Development
```bash
npm run dev                 # Starts backend (5001) + frontend (3000) concurrently
npm run dev:backend         # Backend only
npm run dev:frontend        # Frontend only (with proxy to backend)
```

### Production
```bash
npm run build               # Build frontend → frontend/dist/
npm start                   # Start production server (serves API + frontend on :5001)
npm run production          # Build + start in one command
```

### Database
```bash
npm run db:migrate          # Run pending migrations
npm run db:seed             # Run seed files
npm run db:reset            # Rollback all → migrate → seed (DESTROYS DATA)
```

### PM2
```bash
pm2 start ecosystem.config.js --env production   # Start
pm2 reload navodita-erp                           # Zero-downtime restart
pm2 logs navodita-erp                             # View logs
pm2 save && pm2 startup                           # Auto-start on boot
```

### Default Login
- **Username:** `admin`
- **Password:** `admin123`
- **Change immediately in production!**

---

## File Counts Summary

| Category | Count |
|----------|-------|
| Backend routes | 33 |
| Backend controllers | 20 |
| Backend services | 11 |
| Backend middleware | 3 |
| Database migrations | 12 |
| Database seeds | 5 |
| Database tables | 60 |
| Frontend pages | 84 |
| Frontend components | 20 |
| Frontend API modules | 30 |
| Frontend contexts | 2 |
| Deploy scripts | 4 |
| **Total source files** | **~190** |
