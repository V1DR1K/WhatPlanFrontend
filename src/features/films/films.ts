import { api } from '../../lib/api';
import type { Film, FilmGenreOption, FilmReview, WatchPlatform } from '../../types/domain';

export type FilmInput = { title: string; originalTitle?: string; synopsis?: string; releaseDate?: string; posterPath?: string; watchedOn?: string; genres: string[]; platformId?: number };
export type PlatformInput = { name: string; icon: string; active: boolean };
export const getFilms = (filters: { genre?: string; platformId?: number; watched?: boolean } = {}) => {
  const query = new URLSearchParams();
  if (filters.genre) query.set('genre', filters.genre);
  if (filters.platformId) query.set('platformId', String(filters.platformId));
  if (filters.watched !== undefined) query.set('watched', String(filters.watched));
  return api<Film[]>(`/films${query.size ? `?${query}` : ''}`);
};
export const getFilm = (id: number) => api<Film>(`/films/${id}`);
export const saveFilm = (input: FilmInput, id?: number) => api<Film>(`/films${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const uploadFilmPhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<Film>(`/films/${id}/photo`, { method: 'POST', body: data }); };
export const deleteFilm = (id: number) => api<void>(`/films/${id}`, { method: 'DELETE' });
export const adjustWatchCount = (id: number, delta: number, watchedOn?: string) => api<Film>(`/films/${id}/watch-count`, { method: 'PATCH', body: JSON.stringify({ delta, watchedOn }) });
export const saveFilmReview = (id: number, input: Pick<FilmReview, 'rating' | 'comment' | 'watchedOn'>) => api<FilmReview>(`/films/${id}/review`, { method: 'PUT', body: JSON.stringify(input) });
export const getPlatforms = () => api<WatchPlatform[]>('/watch-platforms');
export const getAllPlatforms = () => api<WatchPlatform[]>('/watch-platforms/all');
export const savePlatform = (input: PlatformInput, id?: number) => api<WatchPlatform>(`/watch-platforms${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const getFilmGenres = () => api<FilmGenreOption[]>('/film-genres');
export const saveFilmGenre = (input: Pick<FilmGenreOption, 'name' | 'emoji'>) => api<FilmGenreOption>('/film-genres', { method: 'POST', body: JSON.stringify(input) });
