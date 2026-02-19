import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { NavigationProvider } from './context/NavigationContext';
import MainLayout from './layouts/MainLayout';

// Lazy-loaded page modules
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

// Customers
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerFormPage = lazy(() => import('./pages/customers/CustomerFormPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));

// Vendors
const VendorListPage = lazy(() => import('./pages/vendors/VendorListPage'));
const VendorFormPage = lazy(() => import('./pages/vendors/VendorFormPage'));
const VendorDetailPage = lazy(() => import('./pages/vendors/VendorDetailPage'));

// Items
const ItemListPage = lazy(() => import('./pages/items/ItemListPage'));
const ItemFormPage = lazy(() => import('./pages/items/ItemFormPage'));
const ItemDetailPage = lazy(() => import('./pages/items/ItemDetailPage'));

// Invoices
const InvoiceListPage = lazy(() => import('./pages/invoices/InvoiceListPage'));
const InvoiceFormPage = lazy(() => import('./pages/invoices/InvoiceFormPage'));
const InvoiceDetailPage = lazy(() => import('./pages/invoices/InvoiceDetailPage'));

// Quotations
const QuotationListPage = lazy(() => import('./pages/quotations/QuotationListPage'));
const QuotationFormPage = lazy(() => import('./pages/quotations/QuotationFormPage'));
const QuotationDetailPage = lazy(() => import('./pages/quotations/QuotationDetailPage'));

// Bills
const BillListPage = lazy(() => import('./pages/bills/BillListPage'));
const BillFormPage = lazy(() => import('./pages/bills/BillFormPage'));
const BillDetailPage = lazy(() => import('./pages/bills/BillDetailPage'));

// Purchase Orders
const PurchaseOrderListPage = lazy(() => import('./pages/purchaseOrders/PurchaseOrderListPage'));
const PurchaseOrderFormPage = lazy(() => import('./pages/purchaseOrders/PurchaseOrderFormPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/purchaseOrders/PurchaseOrderDetailPage'));

// Credit Notes
const CreditNoteListPage = lazy(() => import('./pages/creditNotes/CreditNoteListPage'));
const CreditNoteFormPage = lazy(() => import('./pages/creditNotes/CreditNoteFormPage'));
const CreditNoteDetailPage = lazy(() => import('./pages/creditNotes/CreditNoteDetailPage'));

// Debit Notes
const DebitNoteListPage = lazy(() => import('./pages/debitNotes/DebitNoteListPage'));
const DebitNoteFormPage = lazy(() => import('./pages/debitNotes/DebitNoteFormPage'));
const DebitNoteDetailPage = lazy(() => import('./pages/debitNotes/DebitNoteDetailPage'));

// Delivery Challans
const DeliveryChallanListPage = lazy(() => import('./pages/deliveryChallans/DeliveryChallanListPage'));
const DeliveryChallanFormPage = lazy(() => import('./pages/deliveryChallans/DeliveryChallanFormPage'));
const DeliveryChallanDetailPage = lazy(() => import('./pages/deliveryChallans/DeliveryChallanDetailPage'));

// Packing Lists
const PackingListListPage = lazy(() => import('./pages/packingLists/PackingListListPage'));
const PackingListFormPage = lazy(() => import('./pages/packingLists/PackingListFormPage'));
const PackingListDetailPage = lazy(() => import('./pages/packingLists/PackingListDetailPage'));

// E-Way Bills
const EWayBillListPage = lazy(() => import('./pages/ewayBills/EWayBillListPage'));
const EWayBillFormPage = lazy(() => import('./pages/ewayBills/EWayBillFormPage'));
const EWayBillDetailPage = lazy(() => import('./pages/ewayBills/EWayBillDetailPage'));

// Payments Received
const PaymentReceivedListPage = lazy(() => import('./pages/paymentsReceived/PaymentReceivedListPage'));
const PaymentReceivedFormPage = lazy(() => import('./pages/paymentsReceived/PaymentReceivedFormPage'));
const PaymentReceivedDetailPage = lazy(() => import('./pages/paymentsReceived/PaymentReceivedDetailPage'));

// Payments Made
const PaymentMadeListPage = lazy(() => import('./pages/paymentsMade/PaymentMadeListPage'));
const PaymentMadeFormPage = lazy(() => import('./pages/paymentsMade/PaymentMadeFormPage'));
const PaymentMadeDetailPage = lazy(() => import('./pages/paymentsMade/PaymentMadeDetailPage'));

// Expenses
const ExpenseListPage = lazy(() => import('./pages/expenses/ExpenseListPage'));
const ExpenseFormPage = lazy(() => import('./pages/expenses/ExpenseFormPage'));
const ExpenseDetailPage = lazy(() => import('./pages/expenses/ExpenseDetailPage'));

// Employees
const EmployeeListPage = lazy(() => import('./pages/employees/EmployeeListPage'));
const EmployeeFormPage = lazy(() => import('./pages/employees/EmployeeFormPage'));
const EmployeeDetailPage = lazy(() => import('./pages/employees/EmployeeDetailPage'));

// Payroll
const PayrollPage = lazy(() => import('./pages/payroll/PayrollPage'));

// HR Modules
const OfferLettersPage = lazy(() => import('./pages/hr/OfferLettersPage'));
const OfferLetterFormPage = lazy(() => import('./pages/hr/OfferLetterFormPage'));
const OfferLetterDetailPage = lazy(() => import('./pages/hr/OfferLetterDetailPage'));
const JoiningLettersPage = lazy(() => import('./pages/hr/JoiningLettersPage'));
const JoiningLetterFormPage = lazy(() => import('./pages/hr/JoiningLetterFormPage'));
const JoiningLetterDetailPage = lazy(() => import('./pages/hr/JoiningLetterDetailPage'));
const GovernmentHolidaysPage = lazy(() => import('./pages/hr/GovernmentHolidaysPage'));
const HRPoliciesPage = lazy(() => import('./pages/hr/HRPoliciesPage'));
const HRPolicyDetailPage = lazy(() => import('./pages/hr/HRPolicyDetailPage'));
const HRPolicyFormPage = lazy(() => import('./pages/hr/HRPolicyFormPage'));

// Banking
const BankingPage = lazy(() => import('./pages/banking/BankingPage'));

// Accounting
const ChartOfAccountsPage = lazy(() => import('./pages/chartOfAccounts/ChartOfAccountsPage'));
const JournalEntryListPage = lazy(() => import('./pages/journalEntries/JournalEntryListPage'));
const JournalEntryFormPage = lazy(() => import('./pages/journalEntries/JournalEntryFormPage'));
const JournalEntryDetailPage = lazy(() => import('./pages/journalEntries/JournalEntryDetailPage'));

// Compliance
const GSTFilingListPage = lazy(() => import('./pages/compliance/GSTFilingListPage'));
const GSTFilingFormPage = lazy(() => import('./pages/compliance/GSTFilingFormPage'));
const GSTFilingDetailPage = lazy(() => import('./pages/compliance/GSTFilingDetailPage'));
const TDSLiabilityListPage = lazy(() => import('./pages/compliance/TDSLiabilityListPage'));
const TDSLiabilityFormPage = lazy(() => import('./pages/compliance/TDSLiabilityFormPage'));
const TDSLiabilityDetailPage = lazy(() => import('./pages/compliance/TDSLiabilityDetailPage'));
const TDSChallanListPage = lazy(() => import('./pages/compliance/TDSChallanListPage'));
const TDSChallanFormPage = lazy(() => import('./pages/compliance/TDSChallanFormPage'));
const TDSChallanDetailPage = lazy(() => import('./pages/compliance/TDSChallanDetailPage'));

// Inventory & Costing
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const CostingListPage = lazy(() => import('./pages/costing/CostingListPage'));
const CostingFormPage = lazy(() => import('./pages/costing/CostingFormPage'));
const CostingDetailPage = lazy(() => import('./pages/costing/CostingDetailPage'));

// Investor Orders
const InvestorOrdersPage = lazy(() => import('./pages/investor-orders/InvestorOrdersPage'));
const InvestorOrderFormPage = lazy(() => import('./pages/investor-orders/InvestorOrderFormPage'));
const InvestorMasterBookPage = lazy(() => import('./pages/investor-orders/InvestorMasterBookPage'));
const InvestorPartnersPage = lazy(() => import('./pages/investor-orders/InvestorPartnersPage'));
const InvestorPartnerFormPage = lazy(() => import('./pages/investor-orders/InvestorPartnerFormPage'));
const InvestorPartnerDetailPage = lazy(() => import('./pages/investor-orders/InvestorPartnerDetailPage'));

// AI Assistant
const AIAssistantPage = lazy(() => import('./pages/ai/AIAssistantPage'));

// HSN Search
const HSNSearchPage = lazy(() => import('./pages/compliance/HSNSearchPage'));

// Secure Vault
const SecureVaultPage = lazy(() => import('./pages/secure-vault/SecureVaultPage'));

// Other
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const CompanyPage = lazy(() => import('./pages/company/CompanyPage'));
const SecurityPage = lazy(() => import('./pages/security/SecurityPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const FactoryResetPage = lazy(() => import('./pages/settings/FactoryResetPage'));
const ZohoMigrationPage = lazy(() => import('./pages/settings/ZohoMigrationPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
      <NavigationProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '8px',
              fontSize: '14px',
            },
          }}
        />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Login - no layout */}
            <Route path="/login" element={<LoginPage />} />

            {/* All authenticated routes inside MainLayout (handles auth redirect) */}
            <Route element={<MainLayout />}>
              {/* Root redirect to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Customers */}
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/new" element={<CustomerFormPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

              {/* Vendors */}
              <Route path="/vendors" element={<VendorListPage />} />
              <Route path="/vendors/new" element={<VendorFormPage />} />
              <Route path="/vendors/:id" element={<VendorDetailPage />} />
              <Route path="/vendors/:id/edit" element={<VendorFormPage />} />

              {/* Items */}
              <Route path="/items" element={<ItemListPage />} />
              <Route path="/items/new" element={<ItemFormPage />} />
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/items/:id/edit" element={<ItemFormPage />} />

              {/* Invoices */}
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />

              {/* Quotations */}
              <Route path="/quotations" element={<QuotationListPage />} />
              <Route path="/quotations/new" element={<QuotationFormPage />} />
              <Route path="/quotations/:id" element={<QuotationDetailPage />} />
              <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />

              {/* Bills */}
              <Route path="/bills" element={<BillListPage />} />
              <Route path="/bills/new" element={<BillFormPage />} />
              <Route path="/bills/:id" element={<BillDetailPage />} />
              <Route path="/bills/:id/edit" element={<BillFormPage />} />

              {/* Purchase Orders */}
              <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />

              {/* Delivery Challans */}
              <Route path="/delivery-challans" element={<DeliveryChallanListPage />} />
              <Route path="/delivery-challans/new" element={<DeliveryChallanFormPage />} />
              <Route path="/delivery-challans/:id" element={<DeliveryChallanDetailPage />} />
              <Route path="/delivery-challans/:id/edit" element={<DeliveryChallanFormPage />} />

              {/* Packing Lists */}
              <Route path="/packing-lists" element={<PackingListListPage />} />
              <Route path="/packing-lists/new" element={<PackingListFormPage />} />
              <Route path="/packing-lists/:id" element={<PackingListDetailPage />} />
              <Route path="/packing-lists/:id/edit" element={<PackingListFormPage />} />

              {/* E-Way Bills */}
              <Route path="/eway-bills" element={<EWayBillListPage />} />
              <Route path="/eway-bills/new" element={<EWayBillFormPage />} />
              <Route path="/eway-bills/:id" element={<EWayBillDetailPage />} />
              <Route path="/eway-bills/:id/edit" element={<EWayBillFormPage />} />

              {/* Credit Notes */}
              <Route path="/credit-notes" element={<CreditNoteListPage />} />
              <Route path="/credit-notes/new" element={<CreditNoteFormPage />} />
              <Route path="/credit-notes/:id" element={<CreditNoteDetailPage />} />
              <Route path="/credit-notes/:id/edit" element={<CreditNoteFormPage />} />

              {/* Debit Notes */}
              <Route path="/debit-notes" element={<DebitNoteListPage />} />
              <Route path="/debit-notes/new" element={<DebitNoteFormPage />} />
              <Route path="/debit-notes/:id" element={<DebitNoteDetailPage />} />
              <Route path="/debit-notes/:id/edit" element={<DebitNoteFormPage />} />

              {/* Payments Received */}
              <Route path="/payments-received" element={<PaymentReceivedListPage />} />
              <Route path="/payments-received/new" element={<PaymentReceivedFormPage />} />
              <Route path="/payments-received/:id" element={<PaymentReceivedDetailPage />} />
              <Route path="/payments-received/:id/edit" element={<PaymentReceivedFormPage />} />

              {/* Payments Made */}
              <Route path="/payments-made" element={<PaymentMadeListPage />} />
              <Route path="/payments-made/new" element={<PaymentMadeFormPage />} />
              <Route path="/payments-made/:id" element={<PaymentMadeDetailPage />} />
              <Route path="/payments-made/:id/edit" element={<PaymentMadeFormPage />} />

              {/* Expenses */}
              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/expenses/new" element={<ExpenseFormPage />} />
              <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
              <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />

              {/* Employees */}
              <Route path="/employees" element={<EmployeeListPage />} />
              <Route path="/employees/new" element={<EmployeeFormPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />

              {/* Payroll */}
              <Route path="/payroll" element={<PayrollPage />} />

              {/* Offer Letters */}
              <Route path="/offer-letters" element={<OfferLettersPage />} />
              <Route path="/offer-letters/new" element={<OfferLetterFormPage />} />
              <Route path="/offer-letters/:id" element={<OfferLetterDetailPage />} />
              <Route path="/offer-letters/:id/edit" element={<OfferLetterFormPage />} />

              {/* Joining Letters */}
              <Route path="/joining-letters" element={<JoiningLettersPage />} />
              <Route path="/joining-letters/new" element={<JoiningLetterFormPage />} />
              <Route path="/joining-letters/:id" element={<JoiningLetterDetailPage />} />
              <Route path="/joining-letters/:id/edit" element={<JoiningLetterFormPage />} />

              {/* Government Holidays */}
              <Route path="/government-holidays" element={<GovernmentHolidaysPage />} />

              {/* HR Policies */}
              <Route path="/hr-policies" element={<HRPoliciesPage />} />
              <Route path="/hr-policies/new" element={<HRPolicyFormPage />} />
              <Route path="/hr-policies/:id" element={<HRPolicyDetailPage />} />
              <Route path="/hr-policies/:id/edit" element={<HRPolicyFormPage />} />

              {/* Banking */}
              <Route path="/banking" element={<BankingPage />} />

              {/* Chart of Accounts */}
              <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />

              {/* Journal Entries */}
              <Route path="/journal-entries" element={<JournalEntryListPage />} />
              <Route path="/journal-entries/new" element={<JournalEntryFormPage />} />
              <Route path="/journal-entries/:id" element={<JournalEntryDetailPage />} />
              <Route path="/journal-entries/:id/edit" element={<JournalEntryFormPage />} />

              {/* GST Filings */}
              <Route path="/gst-filings" element={<GSTFilingListPage />} />
              <Route path="/gst-filings/new" element={<GSTFilingFormPage />} />
              <Route path="/gst-filings/:id" element={<GSTFilingDetailPage />} />
              <Route path="/gst-filings/:id/edit" element={<GSTFilingFormPage />} />

              {/* TDS Liabilities */}
              <Route path="/tds-liabilities" element={<TDSLiabilityListPage />} />
              <Route path="/tds-liabilities/new" element={<TDSLiabilityFormPage />} />
              <Route path="/tds-liabilities/:id" element={<TDSLiabilityDetailPage />} />
              <Route path="/tds-liabilities/:id/edit" element={<TDSLiabilityFormPage />} />

              {/* TDS Challans */}
              <Route path="/tds-challans" element={<TDSChallanListPage />} />
              <Route path="/tds-challans/new" element={<TDSChallanFormPage />} />
              <Route path="/tds-challans/:id" element={<TDSChallanDetailPage />} />
              <Route path="/tds-challans/:id/edit" element={<TDSChallanFormPage />} />

              {/* HSN Search */}
              <Route path="/hsn-search" element={<HSNSearchPage />} />

              {/* Inventory */}
              <Route path="/inventory" element={<InventoryPage />} />

              {/* Costing */}
              <Route path="/costing" element={<CostingListPage />} />
              <Route path="/costing/new" element={<CostingFormPage />} />
              <Route path="/costing/:id" element={<CostingDetailPage />} />
              <Route path="/costing/:id/edit" element={<CostingFormPage />} />

              {/* Investor Orders */}
              <Route path="/investor-orders" element={<InvestorOrdersPage />} />
              <Route path="/investor-orders/new" element={<InvestorOrderFormPage />} />
              <Route path="/investor-orders/master-book" element={<InvestorMasterBookPage />} />
              <Route path="/investor-orders/:id/edit" element={<InvestorOrderFormPage />} />
              <Route path="/investor-orders/partners" element={<InvestorPartnersPage />} />
              <Route path="/investor-orders/partners/new" element={<InvestorPartnerFormPage />} />
              <Route path="/investor-orders/partners/:id" element={<InvestorPartnerDetailPage />} />
              <Route path="/investor-orders/partners/:id/edit" element={<InvestorPartnerFormPage />} />

              {/* AI Assistant */}
              <Route path="/ai-assistant" element={<AIAssistantPage />} />

              {/* Documents */}
              <Route path="/documents" element={<DocumentsPage />} />

              {/* Secure Vault */}
              <Route path="/secure-vault" element={<SecureVaultPage />} />

              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Company */}
              <Route path="/company" element={<CompanyPage />} />

              {/* Security */}
              <Route path="/security" element={<SecurityPage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Data Management */}
              <Route path="/data-management" element={<FactoryResetPage />} />
              <Route path="/zoho-migration" element={<ZohoMigrationPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </NavigationProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}
