import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, session, setCurrentZoneFilter, setCurrentJourneyStage } from './api';
import { getLocationContext, type LocationOption } from '../features/journey/journey';
import { Button } from '../components/ui/Button';
import { LoadingSkeletonForPath } from '../components/ui/LoadingSkeleton';
import type { Home } from '../types/domain';
import { useOptionalAdminScope } from './adminScope';

type ZoneContextValue = {
  zones: { id: number; name: string }[]; options: LocationOption[]; coupleId: string;
  members: { username: string; displayName: string }[]; homeLabels: Partial<Record<Home, string>>;
  selectedZoneId: number | null; selectedStageId: string | null; selectedLocationKey: string;
  defaultZoneId: number | null; maxUploadBytes:number; loading: boolean;
  selectZone: (zoneId: number | null) => void; selectLocation: (key: string) => void;
};
const ZoneContext = createContext<ZoneContextValue | null>(null);
export function ZoneProvider({ children, pathname = typeof window === 'undefined' ? '/' : window.location.pathname }: { children: ReactNode; pathname?: string }) {
  const adminScope = useOptionalAdminScope();
  const client = useQueryClient();
  const needsLocationContext = /^\/app\/(food|films|how-cook|why-fun|when-dates|whither-journey)(\/|$)/.test(pathname);
  const settingsRoute = pathname === '/app/settings';
  const context = useQuery({
    queryKey: ['location-context', session.get()?.username, adminScope?.coupleId ?? null],
    queryFn: getLocationContext,
    enabled: needsLocationContext || settingsRoute,
    refetchInterval: query => query.state.error instanceof ApiError && query.state.error.status === 403
      ? false
      : 15_000,
  });
  const [selectedLocationKey, setSelectedLocationKey] = useState('origin');
  const selected = context.data?.options.find(option => option.key === selectedLocationKey) ?? (selectedLocationKey === 'all' ? undefined : context.data?.options[0]);
  const cityId = selected?.cityId ?? null;
  const stageId = selected?.stageId ?? null;
  // The children mount only after the synchronous request context is initialized.
  setCurrentZoneFilter(cityId);
  setCurrentJourneyStage(stageId);
  const selectLocation = useCallback((key: string) => {
    void client.cancelQueries({ predicate: query => !['location-context', 'cities', 'countries'].includes(String(query.queryKey[0])) });
    setSelectedLocationKey(key);
  }, [client]);
  const selectZone = useCallback((zoneId: number | null) => {
    if (zoneId === null) selectLocation('all');
    else selectLocation(context.data?.options.find(option => option.cityId === zoneId && !option.stageId)?.key ?? context.data?.options.find(option => option.cityId === zoneId)?.key ?? 'origin');
  }, [context.data, selectLocation]);
  useEffect(() => {
    if (context.data && selectedLocationKey !== 'all' && !context.data.options.some(o => o.key === selectedLocationKey)) setSelectedLocationKey('origin');
  }, [context.data, selected, selectedLocationKey]);
  const value = useMemo<ZoneContextValue>(() => ({
    zones: Array.from(new Map((context.data?.options ?? []).map(o => [o.cityId, { id: o.cityId, name: o.label.split(' · ')[0] }])).values()),
    options: context.data?.options ?? [], coupleId: context.data?.coupleId ?? '',
    members: context.data?.members ?? [],
    homeLabels: Object.fromEntries((context.data?.homeLabels ?? []).map(({ home, displayName }) => [home, displayName])),
    selectedZoneId: cityId, selectedStageId: stageId, selectedLocationKey,
    defaultZoneId: context.data?.originCityId ?? null, maxUploadBytes:context.data?.maxUploadBytes??10485760, loading: context.isLoading,
    selectZone, selectLocation,
  }), [context.data, context.isLoading, cityId, stageId, selectedLocationKey, selectZone, selectLocation]);
  if (context.isLoading) return <LoadingSkeletonForPath pathname={pathname} />;
  if (context.isError && !context.data && needsLocationContext) return <section className="async-state" role="alert"><h2>No pudimos cargar su ubicación</h2><p>{context.error.message}</p><Button type="button" onClick={() => void context.refetch()}>Reintentar</Button></section>;
  return <ZoneContext.Provider value={value}>{context.isRefetchError&&<p className="form-error" role="status">No pudimos actualizar las ubicaciones. <Button variant="secondary" onClick={()=>void context.refetch()}>Reintentar</Button></p>}{children}</ZoneContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useZoneContext() {
  const value = useContext(ZoneContext);
  if (!value) throw new Error('useZoneContext debe usarse dentro de ZoneProvider');
  return value;
}
