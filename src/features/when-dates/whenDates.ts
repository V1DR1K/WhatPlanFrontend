import { api } from '../../lib/api';
import type { Slice, WhenDateOccurrence, WhenDateEntry } from '../../types/domain';

export const getWhenDates = (month: string, specialDateId?: number, cursor?: number) => {
  const query = new URLSearchParams({ month, size: '12' });
  if (specialDateId) query.set('specialDateId', String(specialDateId));
  if (cursor !== undefined) query.set('cursor', String(cursor));
  return api<Slice<WhenDateEntry>>(`/when-dates?${query}`);
};
export const getWhenDateOccurrence = (specialDateId: number, date: string) => api<WhenDateOccurrence>(`/when-dates/special-dates/${specialDateId}/occurrences/${date}`);
export const saveWhenDateComment = (specialDateId: number, date: string, comment: string) => api<WhenDateOccurrence>(`/when-dates/special-dates/${specialDateId}/occurrences/${date}/comments/me`, { method: 'PUT', body: JSON.stringify({ comment }) });
export const deleteWhenDateComment = (specialDateId: number, date: string) => api<void>(`/when-dates/special-dates/${specialDateId}/occurrences/${date}/comments/me`, { method: 'DELETE' });
export const uploadWhenDatePhoto = (specialDateId: number, date: string, file: File) => { const data = new FormData(); data.append('file', file); return api<WhenDateOccurrence>(`/when-dates/special-dates/${specialDateId}/occurrences/${date}/photos`, { method: 'POST', body: data }); };
export const setWhenDateCover = (occurrenceId: number, photoId: number) => api<WhenDateOccurrence>(`/when-dates/occurrences/${occurrenceId}/cover/${photoId}`, { method: 'PUT' });
export const deleteWhenDatePhoto = (photoId: number) => api<void>(`/when-dates/photos/${photoId}`, { method: 'DELETE' });
