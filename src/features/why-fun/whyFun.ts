import { api } from '../../lib/api';
import type { Activity, ActivityReview, ActivityVisit, FunCategory } from '../../types/domain';

export type FunCategoryInput = { parentId?: number; name: string; icon: string; active: boolean };
export type ActivityInput = { name: string; address: string; categoryId: number; subcategoryId: number; schedules: { dayOfWeek: string; opensAt: string; closesAt: string }[] };
export type ActivityVisitInput = { scheduledAt?: string };

export const getFunCategories = () => api<FunCategory[]>('/why-fun/categories');
export const getAllFunCategories = () => api<FunCategory[]>('/why-fun/categories/all');
export const saveFunCategory = (input: FunCategoryInput, id?: number) => api<FunCategory>(`/why-fun/categories${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const getActivities = (filters: { categoryId?: number; subcategoryId?: number } = {}) => {
 const query = new URLSearchParams();
 if (filters.categoryId) query.set('categoryId', String(filters.categoryId));
 if (filters.subcategoryId) query.set('subcategoryId', String(filters.subcategoryId));
 return api<Activity[]>(`/why-fun/activities${query.size ? `?${query}` : ''}`);
};
export const getActivity = (id: number) => api<Activity>(`/why-fun/activities/${id}`);
export const saveActivity = (input: ActivityInput, id?: number) => api<Activity>(`/why-fun/activities${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const deleteActivity = (id: number) => api<void>(`/why-fun/activities/${id}`, { method: 'DELETE' });
export const uploadActivityProfilePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<Activity>(`/why-fun/activities/${id}/photo`, { method: 'POST', body: data }); };
export const getActivityVisits = (activityId: number) => api<ActivityVisit[]>(`/why-fun/activities/${activityId}/visits`);
export const createActivityVisit = (activityId: number, input: ActivityVisitInput) => api<ActivityVisit>(`/why-fun/activities/${activityId}/visits`, { method: 'POST', body: JSON.stringify(input) });
export const updateActivityVisit = (visitId: number, input: ActivityVisitInput) => api<ActivityVisit>(`/why-fun/activity-visits/${visitId}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteActivityVisit = (visitId: number) => api<void>(`/why-fun/activity-visits/${visitId}`, { method: 'DELETE' });
export const uploadActivityPhoto = (visitId: number, file: File) => { const data = new FormData(); data.append('file', file); return api<ActivityVisit>(`/why-fun/activity-visits/${visitId}/photos`, { method: 'POST', body: data }); };
export const setActivityCover = (visitId: number, photoId: number) => api<ActivityVisit>(`/why-fun/activity-visits/${visitId}/cover/${photoId}`, { method: 'PUT' });
export const deleteActivityPhoto = (id: number) => api<void>(`/why-fun/activity-visit-photos/${id}`, { method: 'DELETE' });
export const createActivityReview = (visitId: number, input: Pick<ActivityReview, 'rating' | 'comment'>) => api<ActivityReview>(`/why-fun/activity-visits/${visitId}/reviews`, { method: 'POST', body: JSON.stringify(input) });
export const updateActivityReview = (reviewId: number, input: Pick<ActivityReview, 'rating' | 'comment'>) => api<ActivityReview>(`/why-fun/activity-visit-reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteActivityReview = (reviewId: number) => api<void>(`/why-fun/activity-visit-reviews/${reviewId}`, { method: 'DELETE' });
