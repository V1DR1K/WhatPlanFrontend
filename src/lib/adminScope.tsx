import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearMediaCache } from './api';
import { clearStoredAdminCoupleScope, getAdminCoupleScope, storeAdminCoupleScope } from './adminScopeStorage';
import { session } from './api';

function clearNonAdminQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'admin' });
}

type AdminScopeValue = {
  coupleId: string | null;
  selectCouple: (id: string) => void;
  clearCouple: () => void;
};

const AdminScopeContext = createContext<AdminScopeValue | null>(null);

export function AdminScopeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [coupleId, setCoupleId] = useState(() => getAdminCoupleScope());

  useEffect(() => {
    if (session.get()?.role !== 'ADMIN') {
      clearStoredAdminCoupleScope();
      setCoupleId(null);
    }
  }, []);

  const selectCouple = useCallback((id: string) => {
    if (session.get()?.role !== 'ADMIN') return;
    if (getAdminCoupleScope() === id) return;
    storeAdminCoupleScope(id);
    clearMediaCache();
    clearNonAdminQueries(queryClient);
    setCoupleId(getAdminCoupleScope());
  }, [queryClient]);

  const clearCouple = useCallback(() => {
    clearStoredAdminCoupleScope();
    clearMediaCache();
    clearNonAdminQueries(queryClient);
    setCoupleId(null);
  }, [queryClient]);

  const value = useMemo(() => ({ coupleId, selectCouple, clearCouple }), [coupleId, selectCouple, clearCouple]);
  return <AdminScopeContext value={value}>{children}</AdminScopeContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminScope() {
  const value = useContext(AdminScopeContext);
  if (!value) throw new Error('AdminScopeProvider is missing');
  return value;
}

// ZoneProvider is also used by standalone UI previews that do not mount the admin scope provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalAdminScope() {
  return useContext(AdminScopeContext);
}
