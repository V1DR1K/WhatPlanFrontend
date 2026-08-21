import { api } from '../../lib/api';
import type { FunCategory, FunReview, FunSchedule, FunVenue, Slice } from '../../types/domain';

export type FunCategoryInput = { parentId?: number; name: string; icon: string; active: boolean };
export type FunVenueInput = { name: string; address: string; categoryId: number; subcategoryId: number; schedules: FunSchedule[] };
type ApiSchedule = { dayOfWeek: FunSchedule['day']; opensAt: string; closesAt: string };
type ApiFunVenue = Omit<FunVenue, 'schedules'> & { schedules: ApiSchedule[] };
const adaptVenue = (venue: ApiFunVenue): FunVenue => ({ ...venue, schedules: venue.schedules.map(schedule => ({ day: schedule.dayOfWeek, opensAt: schedule.opensAt, closesAt: schedule.closesAt })) });

export const getFunCategories = () => api<FunCategory[]>('/why-fun/categories');
export const getAllFunCategories = () => api<FunCategory[]>('/why-fun/categories/all');
export const saveFunCategory = (input: FunCategoryInput, id?: number) => api<FunCategory>(`/why-fun/categories${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const getFunVenues = (filters: { categoryId?: number; subcategoryId?: number; cursor?: number } = {}) => {
 const query = new URLSearchParams({ size: '12' });
 if (filters.categoryId) query.set('categoryId', String(filters.categoryId));
 if (filters.subcategoryId) query.set('subcategoryId', String(filters.subcategoryId));
 if (filters.cursor) query.set('cursor', String(filters.cursor));
 return api<Slice<ApiFunVenue>>(`/why-fun/plans?${query}`).then(page => ({ ...page, content: page.content.map(adaptVenue) }));
};
export const getFunVenue = (id: number) => api<ApiFunVenue>(`/why-fun/plans/${id}`).then(adaptVenue);
export const saveFunVenue = (input: FunVenueInput, id?: number) => api<FunVenue>(`/why-fun/plans${id ? `/${id}` : ''}`, {
  method: id ? 'PUT' : 'POST',
  body: JSON.stringify({ ...input, schedules: input.schedules.map(schedule => ({ dayOfWeek: schedule.day, opensAt: schedule.opensAt, closesAt: schedule.closesAt })) }),
});
export const deleteFunVenue = (id: number) => api<void>(`/why-fun/plans/${id}`, { method: 'DELETE' });
export const uploadFunPhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<FunVenue>(`/why-fun/plans/${id}/photos`, { method: 'POST', body: data }); };
export const deleteFunPhoto = (id: number) => api<void>(`/why-fun/photos/${id}`, { method: 'DELETE' });
export const saveFunReview = (id: number, input: Pick<FunReview, 'rating' | 'comment'>) => api<FunReview>(`/why-fun/plans/${id}/review`, { method: 'PUT', body: JSON.stringify(input) });
