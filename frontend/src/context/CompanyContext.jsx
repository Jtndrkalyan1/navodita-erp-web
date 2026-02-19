import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCompanyProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/company');
      const data = res.data?.data || res.data;
      if (data) {
        // Strip large base64 data URLs to prevent memory issues and white screen
        if (data.logo_path && data.logo_path.startsWith('data:')) {
          data.logo_path = '';
        }
        if (data.director1_photo && data.director1_photo.startsWith('data:')) {
          data.director1_photo = '';
        }
        if (data.director2_photo && data.director2_photo.startsWith('data:')) {
          data.director2_photo = '';
        }
        setCompanyProfile(data);
      }
    } catch (err) {
      // 404 means no profile yet, which is fine
      if (err.response?.status !== 404 && err.response?.status !== 401) {
        console.error('Failed to fetch company profile:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch on mount & when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanyProfile();
    } else {
      setCompanyProfile(null);
    }
  }, [isAuthenticated, fetchCompanyProfile]);

  // Allow other components to trigger a refresh (e.g., after saving company profile)
  const refreshCompanyProfile = useCallback(() => {
    return fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  const value = {
    companyProfile,
    companyLogo: companyProfile?.logo_path || null,
    companyName: companyProfile?.company_name || 'NavoditaERP',
    loading,
    refreshCompanyProfile,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export default CompanyContext;
