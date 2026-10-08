import { getHistory } from '../../lib/history';
import { api } from '../../lib/api';
import type { Activity, ActivityReview, ActivityVisit, FunCategory, Slice } from '../../types/domain';
import type { ReviewStatusFilter } from '../../lib/reviewStatus';

export type FunCategoryInput = { parentId?: number; name: string; icon: string; active: boolean };
export type ActivityInput = { name: string; address: string; categoryId: number; subcategoryId: number; singleOccurrence: boolean; startDate?: string; endDate?: string; schedules: { dayOfWeek: string; opensAt: string; closesAt: string }[]; zoneId?: number; stageId?: string | null };
export type ActivityVisitInput = import("../journey/journey").Binding & { scheduledAt?: string };

export const getFunCategories = () => api<FunCategory[]>('/why-fun/categories');
export const getAllFunCategories = () => api<FunCategory[]>('/why-fun/categories/all');
export const saveFunCategory = (input: FunCategoryInput, id?: number) => api<FunCategory>(`/why-fun/categories${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const deleteFunCategory = (id: number) => api<void>(`/why-fun/categories/${id}`, { method: 'DELETE' });
export const getActivities = (filters: { categoryId?: number; subcategoryId?: number; search?: string; visited?: boolean; sort?: string; reviewStatus?: ReviewStatusFilter; cursor?: number; size?: number; signal?: AbortSignal } = {}) => {
 const query = new URLSearchParams();
 if (filters.categoryId) query.set('categoryId', String(filters.categoryId));
  if (filters.subcategoryId) query.set('subcategoryId', String(filters.subcategoryId));
  if (filters.search) query.set('search', filters.search);
  if (filters.visited !== undefined) query.set('visited', String(filters.visited));
  if (filters.sort) query.set('sort', filters.sort);
  if (filters.reviewStatus && filters.reviewStatus !== 'ALL') query.set('reviewStatus', filters.reviewStatus);
  if (filters.cursor !== undefined) query.set('cursor', String(filters.cursor));
  if (filters.size !== undefined) query.set('size', String(filters.size));
   return api<Slice<Activity>>(`/why-fun/activities${query.size ? `?${query}` : ''}`, { signal: filters.signal });
};
export const formatActivityDateRange = (startDate?: string | null, endDate?: string | null) => {
 if (!startDate || !endDate) return undefined;
 const format = (value: string, year = true) => new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}),
 }).format(new Date(`${value}T12:00:00`));
 if (startDate === endDate) return format(startDate);
 if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
  const day = new Intl.DateTimeFormat('es-AR', { day: 'numeric' }).format(new Date(`${startDate}T12:00:00`));
  return `${day}–${format(endDate)}`;
 }
 return `${format(startDate)} – ${format(endDate)}`;
};
export const getActivity = (id: number) => api<Activity>(`/why-fun/activities/${id}`);
export const saveActivity = (input: ActivityInput, id?: number) => api<Activity>(`/why-fun/activities${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const deleteActivity = (id: number) => api<void>(`/why-fun/activities/${id}`, { method: 'DELETE' });
export const uploadActivityProfilePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<Activity>(`/why-fun/activities/${id}/photo`, { method: 'POST', body: data }); };
export const getActivityVisits = (activityId: number) => getHistory<ActivityVisit>(`/why-fun/activities/${activityId}/visits`);
export const getActivityVisitPage = (activityId: number, filters: { cursor?: string; size?: number; signal?: AbortSignal } = {}) => {
 const query = new URLSearchParams();
 if (filters.cursor) query.set('cursor', filters.cursor);
 if (filters.size !== undefined) query.set('size', String(filters.size));
 return api<Slice<ActivityVisit, string>>(`/why-fun/activities/${activityId}/visits${query.size ? `?${query}` : ''}`, { signal: filters.signal });
};
export const getActivityVisit = (visitId: number) => api<ActivityVisit>(`/why-fun/activity-visits/${visitId}`);
export const createActivityVisit = (activityId: number, input: ActivityVisitInput) => api<ActivityVisit>(`/why-fun/activities/${activityId}/visits`, { method: 'POST', body: JSON.stringify(input) });
export const updateActivityVisit = (visitId: number, input: ActivityVisitInput) => api<ActivityVisit>(`/why-fun/activity-visits/${visitId}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteActivityVisit = (visitId: number) => api<void>(`/why-fun/activity-visits/${visitId}`, { method: 'DELETE' });
export const uploadActivityPhoto = (visitId: number, file: File) => { const data = new FormData(); data.append('file', file); return api<ActivityVisit>(`/why-fun/activity-visits/${visitId}/photos`, { method: 'POST', body: data }); };
export const setActivityCover = (visitId: number, photoId: number) => api<ActivityVisit>(`/why-fun/activity-visits/${visitId}/cover/${photoId}`, { method: 'PUT' });
export const deleteActivityPhoto = (id: number) => api<void>(`/why-fun/activity-visit-photos/${id}`, { method: 'DELETE' });
export const createActivityReview = (visitId: number, input: Pick<ActivityReview, 'rating' | 'comment'>) => api<ActivityReview>(`/why-fun/activity-visits/${visitId}/reviews`, { method: 'POST', body: JSON.stringify(input) });
export const updateActivityReview = (reviewId: number, input: Pick<ActivityReview, 'rating' | 'comment'>) => api<ActivityReview>(`/why-fun/activity-visit-reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteActivityReview = (reviewId: number) => api<void>(`/why-fun/activity-visit-reviews/${reviewId}`, { method: 'DELETE' });
