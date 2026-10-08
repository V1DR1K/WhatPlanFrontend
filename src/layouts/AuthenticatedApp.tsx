import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { FlashNotice } from '../lib/flash';
import { AppLayout } from './AppLayout';
import { ZoneProvider } from '../lib/zoneContext';
import { registerPrivateStateClearer } from '../lib/privateState';
import { AdminScopeProvider } from '../lib/adminScope';

export function AuthenticatedApp() {
  const { pathname } = useLocation();
  const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1}}}));
  useEffect(() => registerPrivateStateClearer(() => queryClient.clear()), [queryClient]);
  return <QueryClientProvider client={queryClient}><AdminScopeProvider><ZoneProvider pathname={pathname}><AppLayout /></ZoneProvider><FlashNotice /></AdminScopeProvider></QueryClientProvider>;
}
