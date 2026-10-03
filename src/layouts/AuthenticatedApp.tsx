import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlashNotice } from '../lib/flash';
import { AppLayout } from './AppLayout';
import { ZoneProvider } from '../lib/zoneContext';

export function AuthenticatedApp() {
  const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1}}}));
  return <QueryClientProvider client={queryClient}><ZoneProvider><AppLayout /></ZoneProvider><FlashNotice /></QueryClientProvider>;
}
