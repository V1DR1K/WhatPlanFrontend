import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setCurrentZoneFilter } from './api';
import { getZonePreference, getZones, type Zone } from '../features/zones/zones';

type ZoneContextValue = {
  zones: Zone[];
  selectedZoneId: number | null;
  defaultZoneId: number | null;
  loading: boolean;
  selectZone: (zoneId: number | null) => void;
};

const ZoneContext = createContext<ZoneContextValue | null>(null);

export function ZoneProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: getZones });
  const preferenceQuery = useQuery({ queryKey: ['zone-preference'], queryFn: getZonePreference });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const selectZone = useCallback((zoneId: number | null) => {
    setSelectedZoneId(zoneId);
    setCurrentZoneFilter(zoneId);
    void client.invalidateQueries();
  }, [client]);

  useEffect(() => {
    if (preferenceQuery.data && !initialized) {
      setSelectedZoneId(preferenceQuery.data.defaultZoneId);
      setCurrentZoneFilter(preferenceQuery.data.defaultZoneId);
      setInitialized(true);
      void client.invalidateQueries();
    }
  }, [client, initialized, preferenceQuery.data]);

  useEffect(() => {
    if (selectedZoneId !== null && zonesQuery.data && !zonesQuery.data.some(zone => zone.id === selectedZoneId)) {
      setSelectedZoneId(null);
      setCurrentZoneFilter(null);
    }
  }, [selectedZoneId, zonesQuery.data]);

  const value = useMemo<ZoneContextValue>(() => ({
    zones: zonesQuery.data ?? [],
    selectedZoneId,
    defaultZoneId: preferenceQuery.data?.defaultZoneId ?? null,
    loading: zonesQuery.isLoading || preferenceQuery.isLoading,
    selectZone,
  }), [zonesQuery.data, zonesQuery.isLoading, preferenceQuery.data, preferenceQuery.isLoading, selectedZoneId, selectZone]);

  return <ZoneContext.Provider value={value}>{children}</ZoneContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useZoneContext() {
  const value = useContext(ZoneContext);
  if (!value) throw new Error('useZoneContext debe usarse dentro de ZoneProvider');
  return value;
}
