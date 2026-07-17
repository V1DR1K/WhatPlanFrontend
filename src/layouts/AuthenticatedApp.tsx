import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './AppLayout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function AuthenticatedApp() {
  return <QueryClientProvider client={queryClient}><AppLayout /></QueryClientProvider>;
}
