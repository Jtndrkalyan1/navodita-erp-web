import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNav from './TopNav';
import Sidebar from './Sidebar';

// Map route paths to their parent module for auto-detection
const ROUTE_TO_MODULE = {
  // Books
  '/dashboard': 'books',
  '/customers': 'books',
  '/vendors': 'books',
  '/items': 'books',
  '/invoices': 'books',
  '/quotations': 'books',
  '/bills': 'books',
  '/purchase-orders': 'books',
  '/credit-notes': 'books',
  '/debit-notes': 'books',
  '/delivery-challans': 'books',
  '/packing-lists': 'books',
  '/eway-bills': 'books',
  '/payments-received': 'books',
  '/payments-made': 'books',
  '/expenses': 'books',
  '/chart-of-accounts': 'books',
  '/journal-entries': 'books',
  '/reports': 'books',
  '/investor-orders': 'books',

  // HR & Payroll
  '/employees': 'hr',
  '/payroll': 'hr',

  // Banking
  '/banking': 'banking',

  // Compliance
  '/gst-filings': 'compliance',
  '/tds-liabilities': 'compliance',
  '/tds-challans': 'compliance',

  // Inventory
  '/inventory': 'inventory',

  // Costing
  '/costing': 'costing',

  // Settings
  '/company': 'settings',
  '/settings': 'settings',
  '/security': 'settings',
  '/documents': 'settings',
  '/secure-vault': 'settings',
};

function detectModule(pathname) {
  // Try exact match first
  if (ROUTE_TO_MODULE[pathname]) {
    return ROUTE_TO_MODULE[pathname];
  }
  // Try prefix match (handles /customers/123, /invoices/new, etc.)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const basePath = '/' + segments[0];
    if (ROUTE_TO_MODULE[basePath]) {
      return ROUTE_TO_MODULE[basePath];
    }
  }
  return 'books';
}

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect module from current route
  const detectedModule = detectModule(location.pathname);
  const [activeModule, setActiveModule] = useState(detectedModule);

  // Update active module when route changes
  useEffect(() => {
    const newModule = detectModule(location.pathname);
    setActiveModule(newModule);
  }, [location.pathname]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleModuleChange = useCallback((moduleId) => {
    setActiveModule(moduleId);
  }, []);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Top navigation bar - full width, fixed at top */}
      <TopNav activeModule={activeModule} onModuleChange={handleModuleChange} />

      {/* Below top nav: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - shows items for active module */}
        <Sidebar activeModule={activeModule} />

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
