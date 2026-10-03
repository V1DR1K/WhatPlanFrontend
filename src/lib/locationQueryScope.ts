import { useZoneContext } from './zoneContext';

export function useLocationQueryScope() {
  const { coupleId, selectedZoneId } = useZoneContext();
  return [coupleId, selectedZoneId] as const;
}
