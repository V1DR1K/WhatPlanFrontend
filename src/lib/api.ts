import type { Session } from '../types/domain';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export const apiUrl = (path: string) => `${BASE}${path}`;
export const mediaUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('/api/') || /^https?:\/\//.test(path) ? path : apiUrl(path);

export const session = {
  get: (): Session | null => {
    const raw = localStorage.getItem('wherefood.session');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      localStorage.removeItem('wherefood.session');
      return null;
    }
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
  if (response.status === 401) {
    session.clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('Tu sesión venció. Ingresá de nuevo para continuar.');
  }
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.detail ?? 'No se pudo completar la acción');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
