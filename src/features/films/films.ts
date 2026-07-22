import { api } from '../../lib/api';
import type { Film, FilmGenreOption, FilmReview, FilmView, TmdbMovie, WatchPlatform } from '../../types/domain';

export type FilmInput = { tmdbId?: number; title?: string; originalTitle?: string; synopsis?: string; releaseDate?: string; posterPath?: string; genres: string[]; platformId?: number };
export type PlatformInput = { name: string; icon: string; active: boolean };
export const getFilms = (filters: { genre?: string; platformId?: number; watched?: boolean } = {}) => {
  const query = new URLSearchParams();
  if (filters.genre) query.set('genre', filters.genre);
  if (filters.platformId) query.set('platformId', String(filters.platformId));
  if (filters.watched !== undefined) query.set('watched', String(filters.watched));
  return api<Film[]>(`/films${query.size ? `?${query}` : ''}`);
};
export const getFilm = (id: number) => api<Film>(`/films/${id}`);
export const searchTmdbMovies = (query: string) => api<TmdbMovie[]>(`/tmdb/movies?${new URLSearchParams({ query })}`);
export const saveFilm = (input: FilmInput, id?: number) => api<Film>(`/films${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const uploadFilmPhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<Film>(`/films/${id}/photo`, { method: 'POST', body: data }); };
export const deleteFilm = (id: number) => api<void>(`/films/${id}`, { method: 'DELETE' });
export const addFilmView = (id: number, watchedOn: string, watchedAt: string) => api<FilmView>(`/films/${id}/views`, { method: 'POST', body: JSON.stringify({ watchedOn, watchedAt }) });
export const updateFilmView = (filmId: number, viewId: number, watchedOn: string, watchedAt: string) => api<FilmView>(`/films/${filmId}/views/${viewId}`, { method: 'PUT', body: JSON.stringify({ watchedOn, watchedAt }) });
export const deleteFilmView = (filmId: number, viewId: number) => api<void>(`/films/${filmId}/views/${viewId}`, { method: 'DELETE' });
export const saveFilmReview = (filmId: number, viewId: number, input: Pick<FilmReview, 'rating' | 'comment' | 'metrics'>) => api<FilmReview>(`/films/${filmId}/views/${viewId}/reviews`, { method: 'POST', body: JSON.stringify(input) });
export const updateFilmReview = (filmId: number, reviewId: number, input: Pick<FilmReview, 'rating' | 'comment' | 'metrics'>) => api<FilmReview>(`/films/${filmId}/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) });
export const getPlatforms = () => api<WatchPlatform[]>('/watch-platforms');
export const getAllPlatforms = () => api<WatchPlatform[]>('/watch-platforms/all');
export const savePlatform = (input: PlatformInput, id?: number) => api<WatchPlatform>(`/watch-platforms${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const getFilmGenres = () => api<FilmGenreOption[]>('/film-genres');
export const saveFilmGenre = (input: Pick<FilmGenreOption, 'name' | 'emoji'>, id?: number) => api<FilmGenreOption>(`/film-genres${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const deleteFilmGenre = (id: number) => api<void>(`/film-genres/${id}`, { method: 'DELETE' });
