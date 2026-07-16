import type { Session } from '../types/domain';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export const apiUrl = (path: string) => `${BASE}${path}`;
export const mediaUrl = (path: string) =>
  path.startsWith('data:') || /^https?:\/\//.test(path) ? path : apiUrl(path);

export const session = {
  get: (): Session | null => {
    const raw = localStorage.getItem('wherefood.session');
    return raw ? JSON.parse(raw) : null;
  },
  set: (value: Session) => localStorage.setItem('wherefood.session', JSON.stringify(value)),
  clear: () => localStorage.removeItem('wherefood.session'),
};

export async function api<T>(path: string, init: RequestInit = {}) {
  const token = session.get()?.token;
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.detail ?? 'No se pudo completar la acción');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
