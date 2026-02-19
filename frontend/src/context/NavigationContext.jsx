import React, { createContext, useContext, useState, useCallback } from 'react';

// Navigation modes matching the Swift NavigationContext
export const NavigationMode = {
  LIST: 'list',
  CREATE: 'create',
  EDIT: 'edit',
  DETAIL: 'detail',
};

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [currentMode, setCurrentMode] = useState(NavigationMode.LIST);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const navigateTo = useCallback(
    (mode) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(mode);
        setShowConfirmDialog(true);
        return false;
      }
      setCurrentMode(mode);
      return true;
    },
    [hasUnsavedChanges]
  );

  const confirmNavigation = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      setCurrentMode(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  }, []);

  const value = {
    currentMode,
    setCurrentMode,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    navigateTo,
    confirmNavigation,
    cancelNavigation,
    showConfirmDialog,
  };

  return (
    <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

export default NavigationContext;
