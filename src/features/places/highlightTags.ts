import { api } from '../../lib/api';
import type { HighlightTag } from '../../types/domain';
export type HighlightTagInput = Omit<HighlightTag, 'id'>;
export const getHighlightTags = () => api<HighlightTag[]>('/highlight-tags');
export const saveHighlightTag = (input: HighlightTagInput, id?: number) => api<HighlightTag>(`/highlight-tags${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
