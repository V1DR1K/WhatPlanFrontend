import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlashNotice } from '../lib/flash';
import { AppLayout } from './AppLayout';
import { ZoneProvider } from '../lib/zoneContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function AuthenticatedApp() {
  return <QueryClientProvider client={queryClient}><ZoneProvider><AppLayout /></ZoneProvider><FlashNotice /></QueryClientProvider>;
}
