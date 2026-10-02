import { api } from '../../lib/api';

export type Zone = { id: number; name: string; active: boolean; createdAt: string; updatedAt: string };
export type ZonePreference = { defaultZoneId: number | null };

export const getZones = () => api<Zone[]>('/zones');
export const getAllZones = () => api<Zone[]>('/zones/all');
export const getZonePreference = () => api<ZonePreference>('/zones/preference');
export const saveZonePreference = (zoneId: number | null) =>
  api<ZonePreference>('/zones/preference', { method: 'PUT', body: JSON.stringify({ zoneId }) });
export const createZone = (name: string) =>
  api<Zone>('/zones', { method: 'POST', body: JSON.stringify({ name }) });
export const updateZone = (id: number, name: string) =>
  api<Zone>(`/zones/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deactivateZone = (id: number) =>
  api<void>(`/zones/${id}`, { method: 'DELETE' });
