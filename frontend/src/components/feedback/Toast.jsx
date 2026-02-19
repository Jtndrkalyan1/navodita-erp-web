import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Toast - Pre-configured Toaster from react-hot-toast matching Zoho theme.
 *
 * Usage:
 *   1. Place <Toast /> once in your app root (e.g. App.jsx or MainLayout.jsx)
 *   2. Import `toast` from 'react-hot-toast' and call:
 *      toast.success('Record saved')
 *      toast.error('Something went wrong')
 *      toast('Notification message')
 *
 * This component is a thin wrapper exporting the configured Toaster.
 */
export default function Toast() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#ffffff',
          color: '#333333',
          fontSize: '14px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          border: '1px solid #E5E7EB',
          padding: '12px 16px',
          maxWidth: '420px',
        },
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#ffffff',
          },
          duration: 4000,
        },
      }}
    />
  );
}
