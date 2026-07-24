import { api } from '../../lib/api';
import type { SpecialDate } from '../../types/domain';

export type SpecialDateInput = Pick<SpecialDate, 'date' | 'label' | 'recurrence'>;

export const getSpecialDates = () => api<SpecialDate[]>('/special-dates');

export const saveSpecialDate = (input: SpecialDateInput, id?: number) =>
  api<SpecialDate>(`/special-dates${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(input),
  });

export const deleteSpecialDate = (id: number) =>
  api<void>(`/special-dates/${id}`, { method: 'DELETE' });
