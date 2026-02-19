import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to track unsaved form changes.
 * Blocks navigation (tab close, browser back/forward, AND in-app React Router nav)
 * when there are unsaved changes by intercepting history methods.
 */
export function useUnsavedChanges(enabled = true) {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Browser beforeunload warning (handles tab close / browser refresh)
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, enabled]);

  // Intercept history.pushState and replaceState for in-app navigation
  useEffect(() => {
    if (!enabled) return;

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    function interceptState(original, args) {
      if (isDirtyRef.current) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) return; // Block navigation
      }
      return original(...args);
    }

    history.pushState = function (...args) {
      return interceptState(originalPushState, args);
    };

    history.replaceState = function (...args) {
      // Don't block replaceState for URL param updates on same page
      // Only block if the pathname actually changes
      try {
        const newUrl = args[2];
        if (newUrl && isDirtyRef.current) {
          const currentPath = window.location.pathname;
          const newPath = typeof newUrl === 'string'
            ? new URL(newUrl, window.location.origin).pathname
            : currentPath;
          if (newPath !== currentPath) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
            if (!confirmed) return;
          }
        }
      } catch {
        // If URL parsing fails, just proceed
      }
      return originalReplaceState(...args);
    };

    // Handle browser back/forward
    const handlePopState = () => {
      if (isDirtyRef.current) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) {
          // Push the current URL back to prevent navigation
          originalPushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Are you sure you want to leave?');
  }, [isDirty]);

  const resetDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    isDirty,
    setIsDirty,
    confirmLeave,
    resetDirty,
  };
}

export default useUnsavedChanges;
