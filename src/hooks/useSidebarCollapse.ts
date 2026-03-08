import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const forceCollapse = useCallback(() => setCollapsed(true), []);

  return { collapsed, toggle, forceCollapse } as const;
}
