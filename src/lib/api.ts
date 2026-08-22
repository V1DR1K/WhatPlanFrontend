import type { Session } from '../types/domain';

export type CentralTokenResponse = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  role?: 'USER' | 'ADMIN';
  user?: { username?: string; mustChangePassword?: boolean; role?: 'USER' | 'ADMIN' };
};

export const normalizeSession = (value: CentralTokenResponse): Session => {
  const username = value.username ?? value.user?.username;
  const token = value.accessToken ?? value.token;
  if (!username || !token) throw new Error('La respuesta de autenticación está incompleta');
  return {
  token,
  refreshToken: value.refreshToken,
  username,
  role: value.role ?? value.user?.role ?? 'USER',
  user: { mustChangePassword: value.user?.mustChangePassword ?? false },
  };
};

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

export async function api<T>(path: string, init: RequestInit = {}, retry = true) {
  const token = session.get()?.token;
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry && !['/auth/login', '/auth/refresh', '/auth/logout'].includes(path)) {
    const refreshToken = session.get()?.refreshToken;
    if (refreshToken) {
      const refreshed = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshed.ok) {
        session.set(normalizeSession(await refreshed.json() as CentralTokenResponse));
        return api<T>(path, init, false);
      }
    }
    session.clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('Tu sesión venció. Ingresá de nuevo para continuar.');
  }
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.detail ?? 'No se pudo completar la acción');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
