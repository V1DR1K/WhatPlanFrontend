import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { GlobalSettings } from '../types/domain';

export const defaultCatalogPageSize = 5;
export const maxCatalogPageSize = 30;

export const getGlobalSettings = () => api<GlobalSettings>('/settings');

export const saveGlobalSettings = (input: GlobalSettings) =>
  api<GlobalSettings>('/settings', { method: 'PUT', body: JSON.stringify(input) });

export function useCatalogPageSize() {
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: getGlobalSettings,
    refetchInterval: 15_000,
  });
  return Math.min(
    maxCatalogPageSize,
    Math.max(1, settings.data?.catalogPageSize ?? defaultCatalogPageSize),
  );
}
