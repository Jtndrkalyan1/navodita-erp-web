import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HiOutlineChevronDown,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineBuildingStorefront,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentDuplicate,
  HiOutlineTruck,
  HiOutlineClipboardDocumentCheck,
  HiOutlineReceiptPercent,
  HiOutlineCurrencyRupee,
  HiOutlineShoppingCart,
  HiOutlineBanknotes,
  HiOutlineCalculator,
  HiOutlineChartBar,
  HiOutlineBookOpen,
  HiOutlineSquaresPlus,
  HiOutlineUserPlus,
  HiOutlineBuildingLibrary,
  HiOutlineArrowPath,
  HiOutlineArrowUpTray,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineBuildingOffice2,
  HiOutlineCog6Tooth,
  HiOutlineFolder,
  HiOutlineArchiveBox,
  HiOutlineDocumentChartBar,
  HiOutlinePlusCircle,
  HiOutlineListBullet,
  HiOutlineSparkles,
  HiOutlineDocumentCheck,
  HiOutlineCalendarDays,
  HiOutlineScale,
  HiOutlineEnvelope,
  HiOutlineChartBarSquare,
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';

// Sidebar configuration per module
const SIDEBAR_CONFIG = {
  books: {
    label: 'Books',
    sections: [
      {
        id: 'dashboard',
        type: 'link',
        label: 'Dashboard',
        path: '/dashboard',
        icon: HiOutlineHome,
      },
      {
        id: 'customers-section',
        type: 'group',
        label: 'Customers',
        icon: HiOutlineUsers,
        children: [
          { id: 'customer-list', label: 'Customer List', path: '/customers', icon: HiOutlineListBullet },
          { id: 'customer-new', label: 'New Customer', path: '/customers/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'vendors-section',
        type: 'group',
        label: 'Vendors',
        icon: HiOutlineBuildingStorefront,
        children: [
          { id: 'vendor-list', label: 'Vendor List', path: '/vendors', icon: HiOutlineListBullet },
          { id: 'vendor-new', label: 'New Vendor', path: '/vendors/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'items-section',
        type: 'group',
        label: 'Items',
        icon: HiOutlineCube,
        children: [
          { id: 'item-list', label: 'Item List', path: '/items', icon: HiOutlineListBullet },
          { id: 'item-new', label: 'New Item', path: '/items/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'sales-section',
        type: 'group',
        label: 'Sales',
        icon: HiOutlineChartBar,
        children: [
          { id: 'invoices', label: 'Invoices', path: '/invoices', icon: HiOutlineClipboardDocumentList },
          { id: 'quotations', label: 'Quotations', path: '/quotations', icon: HiOutlineDocumentText },
          { id: 'credit-notes', label: 'Credit Notes', path: '/credit-notes', icon: HiOutlineDocumentDuplicate },
          { id: 'delivery-challans', label: 'Delivery Challans', path: '/delivery-challans', icon: HiOutlineTruck },
          { id: 'packing-lists', label: 'Packing Lists', path: '/packing-lists', icon: HiOutlineClipboardDocumentCheck },
          { id: 'eway-bills', label: 'E-Way Bills', path: '/eway-bills', icon: HiOutlineReceiptPercent },
          { id: 'payments-received', label: 'Payments Received', path: '/payments-received', icon: HiOutlineCurrencyRupee },
        ],
      },
      {
        id: 'purchases-section',
        type: 'group',
        label: 'Purchases',
        icon: HiOutlineShoppingCart,
        children: [
          { id: 'bills', label: 'Bills', path: '/bills', icon: HiOutlineBanknotes },
          { id: 'purchase-orders', label: 'Purchase Orders', path: '/purchase-orders', icon: HiOutlineShoppingCart },
          { id: 'debit-notes', label: 'Debit Notes', path: '/debit-notes', icon: HiOutlineDocumentDuplicate },
          { id: 'payments-made', label: 'Payments Made', path: '/payments-made', icon: HiOutlineCurrencyRupee },
          { id: 'expenses', label: 'Expenses', path: '/expenses', icon: HiOutlineReceiptPercent },
        ],
      },
      {
        id: 'accounting-section',
        type: 'group',
        label: 'Accounting',
        icon: HiOutlineBookOpen,
        children: [
          { id: 'chart-of-accounts', label: 'Chart of Accounts', path: '/chart-of-accounts', icon: HiOutlineSquaresPlus },
          { id: 'journal-entries', label: 'Journal Entries', path: '/journal-entries', icon: HiOutlineBookOpen },
        ],
      },
      {
        id: 'reports',
        type: 'link',
        label: 'Reports',
        path: '/reports',
        icon: HiOutlineDocumentChartBar,
      },
      {
        id: 'investor-orders-section',
        type: 'group',
        label: 'Investor Report',
        icon: HiOutlineChartBarSquare,
        children: [
          { id: 'investor-orders', label: 'Order Details', path: '/investor-orders', icon: HiOutlineListBullet },
          { id: 'investor-master-book', label: 'Master Book', path: '/investor-orders/master-book', icon: HiOutlineBookOpen },
        ],
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  hr: {
    label: 'HR & Payroll',
    sections: [
      {
        id: 'employees-section',
        type: 'group',
        label: 'Employees',
        icon: HiOutlineUsers,
        children: [
          { id: 'employee-list', label: 'Employee List', path: '/employees', icon: HiOutlineListBullet },
          { id: 'employee-new', label: 'New Employee', path: '/employees/new', icon: HiOutlineUserPlus },
        ],
      },
      {
        id: 'payroll-section',
        type: 'group',
        label: 'Payroll',
        icon: HiOutlineCurrencyRupee,
        children: [
          { id: 'payroll-generate', label: 'Generate Salary', path: '/payroll', icon: HiOutlineCalculator },
          { id: 'payroll-records', label: 'Salary Records', path: '/payroll', icon: HiOutlineListBullet },
        ],
      },
      {
        id: 'offer-letters-section',
        type: 'group',
        label: 'Offer Letters',
        icon: HiOutlineEnvelope,
        children: [
          { id: 'offer-letter-list', label: 'All Offer Letters', path: '/offer-letters', icon: HiOutlineListBullet },
          { id: 'offer-letter-new', label: 'New Offer Letter', path: '/offer-letters/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'joining-letters-section',
        type: 'group',
        label: 'Joining Letters',
        icon: HiOutlineDocumentCheck,
        children: [
          { id: 'joining-letter-list', label: 'All Joining Letters', path: '/joining-letters', icon: HiOutlineListBullet },
          { id: 'joining-letter-new', label: 'New Joining Letter', path: '/joining-letters/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'government-holidays',
        type: 'link',
        label: 'Government Holidays',
        path: '/government-holidays',
        icon: HiOutlineCalendarDays,
      },
      {
        id: 'hr-policies',
        type: 'link',
        label: 'HR Policies',
        path: '/hr-policies',
        icon: HiOutlineScale,
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  banking: {
    label: 'Banking',
    sections: [
      {
        id: 'bank-accounts',
        type: 'link',
        label: 'Bank Accounts',
        path: '/banking?tab=accounts',
        icon: HiOutlineBuildingLibrary,
        tabKey: 'accounts',
      },
      {
        id: 'bank-transactions',
        type: 'link',
        label: 'Transactions',
        path: '/banking?tab=transactions',
        icon: HiOutlineBanknotes,
        tabKey: 'transactions',
      },
      {
        id: 'bank-import',
        type: 'link',
        label: 'Import Statement',
        path: '/banking?tab=import',
        icon: HiOutlineArrowUpTray,
        tabKey: 'import',
      },
      {
        id: 'bank-reconciliation',
        type: 'link',
        label: 'Reconciliation',
        path: '/banking?tab=reconciliation',
        icon: HiOutlineArrowPath,
        tabKey: 'reconciliation',
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  compliance: {
    label: 'Compliance',
    sections: [
      {
        id: 'hsn-search',
        type: 'link',
        label: 'HSN/SAC Search',
        path: '/hsn-search',
        icon: HiOutlineMagnifyingGlass,
      },
      {
        id: 'gst-section',
        type: 'group',
        label: 'GST Filing',
        icon: HiOutlineShieldCheck,
        children: [
          { id: 'gst-list', label: 'Filing List', path: '/gst-filings', icon: HiOutlineListBullet },
          { id: 'gst-new', label: 'New Filing', path: '/gst-filings/new', icon: HiOutlinePlusCircle },
        ],
      },
      {
        id: 'tds-section',
        type: 'group',
        label: 'TDS',
        icon: HiOutlineBanknotes,
        children: [
          { id: 'tds-liability', label: 'TDS Liability', path: '/tds-liabilities', icon: HiOutlineDocumentText },
          { id: 'tds-challan', label: 'TDS Challan', path: '/tds-challans', icon: HiOutlineClipboardDocumentList },
        ],
      },
    ],
    bottomLinks: [
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  inventory: {
    label: 'Inventory',
    sections: [
      {
        id: 'inventory',
        type: 'link',
        label: 'Inventory',
        path: '/inventory',
        icon: HiOutlineArchiveBox,
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  costing: {
    label: 'Costing',
    sections: [
      {
        id: 'costing-list',
        type: 'link',
        label: 'Costing Sheets',
        path: '/costing',
        icon: HiOutlineCalculator,
      },
      {
        id: 'costing-new',
        type: 'link',
        label: 'New Costing Sheet',
        path: '/costing/new',
        icon: HiOutlinePlusCircle,
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
    ],
  },
  settings: {
    label: 'Settings',
    sections: [
      {
        id: 'company-profile',
        type: 'link',
        label: 'Company Profile',
        path: '/company',
        icon: HiOutlineBuildingOffice2,
      },
      {
        id: 'app-settings',
        type: 'link',
        label: 'Settings',
        path: '/settings',
        icon: HiOutlineCog6Tooth,
      },
      {
        id: 'security',
        type: 'link',
        label: 'Security',
        path: '/security',
        icon: HiOutlineLockClosed,
      },
      {
        id: 'documents',
        type: 'link',
        label: 'Documents',
        path: '/documents',
        icon: HiOutlineFolder,
      },
      {
        id: 'secure-vault',
        type: 'link',
        label: 'Secure Vault',
        path: '/secure-vault',
        icon: HiOutlineShieldCheck,
      },
      {
        id: 'ai-assistant',
        type: 'link',
        label: 'AI Assistant',
        path: '/ai-assistant',
        icon: HiOutlineSparkles,
      },
      {
        id: 'zoho-migration',
        type: 'link',
        label: 'Import from Zoho',
        path: '/zoho-migration',
        icon: HiOutlineArrowDownTray,
      },
      {
        id: 'data-management',
        type: 'link',
        label: 'Data Management',
        path: '/data-management',
        icon: HiOutlineTrash,
      },
    ],
    bottomLinks: [
      { label: 'Compliance', path: '/gst-filings', icon: HiOutlineShieldCheck },
      { label: 'Inventory', path: '/inventory', icon: HiOutlineCube },
      { label: 'Costing', path: '/costing', icon: HiOutlineCalculator },
    ],
  },
};

function SidebarLink({ item }) {
  const Icon = item.icon;
  const location = useLocation();

  // For items with tabKey (e.g. banking sidebar), determine active state from query params
  let isManualActive = false;
  if (item.tabKey) {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab');
    const isOnBankingPath = location.pathname === '/banking';
    if (isOnBankingPath) {
      // 'accounts' tab is default when no tab param present
      if (item.tabKey === 'accounts' && !currentTab) {
        isManualActive = true;
      } else {
        isManualActive = currentTab === item.tabKey;
      }
    }
  }

  // If this item uses tabKey-based active detection, use manual styling instead of NavLink auto
  if (item.tabKey) {
    return (
      <NavLink
        to={item.path}
        className={() =>
          `flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors duration-150
          ${
            isManualActive
              ? 'bg-blue-50 text-blue-700 font-medium border-r-3 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`
        }
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors duration-150
        ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium border-r-3 border-blue-600'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarGroup({ group, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const location = useLocation();
  const Icon = group.icon;

  // Auto-expand if any child route matches
  const hasActiveChild = group.children.some(
    (child) =>
      location.pathname === child.path ||
      location.pathname.startsWith(child.path + '/')
  );

  const isExpanded = expanded || hasActiveChild;

  return (
    <div className="mb-0.5">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium
                   text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-[18px] h-[18px]" />
          <span>{group.label}</span>
        </div>
        {isExpanded ? (
          <HiOutlineChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <HiOutlineChevronRight className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>

      {/* Expandable children */}
      <div
        className={`sidebar-section-content ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <div className="pl-4 space-y-0.5 mt-0.5">
          {group.children.map((child) => (
            <SidebarLink key={child.id} item={child} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ activeModule }) {
  const moduleConfig = SIDEBAR_CONFIG[activeModule] || SIDEBAR_CONFIG.books;

  return (
    <aside
      className="flex flex-col bg-white border-r border-gray-200 transition-all duration-200"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Module header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {moduleConfig.label}
        </h2>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 space-y-0.5 px-2">
        {moduleConfig.sections.map((item) => {
          if (item.type === 'link') {
            return (
              <div key={item.id}>
                <SidebarLink item={item} />
              </div>
            );
          }
          if (item.type === 'group') {
            return (
              <SidebarGroup
                key={item.id}
                group={item}
                defaultExpanded={item.id === 'sales-section'}
              />
            );
          }
          return null;
        })}

        {/* Bottom Links - Other Modules */}
        {moduleConfig.bottomLinks && moduleConfig.bottomLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <p className="px-4 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Other Modules</p>
            {moduleConfig.bottomLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 mb-0.5 transition-colors ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#0071DC] font-medium'
                      : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#333]'
                  }`
                }
              >
                <link.icon className="w-4 h-4 flex-shrink-0" />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center">
          Navodita Enterprises &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
