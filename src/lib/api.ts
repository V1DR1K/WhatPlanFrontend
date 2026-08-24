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
const REFRESH_LOCK_KEY = 'wherefood.auth.refresh.lock';
const REFRESH_MARKER_KEY = 'wherefood.auth.refresh.marker';
const INSTANCE_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
let refreshPromise: Promise<string | null> | null = null;

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

const sleep = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const refreshedAfter = (startedAt: number) => Number(localStorage.getItem(REFRESH_MARKER_KEY) ?? 0) > startedAt;

async function withRefreshLock(startedAt: number, action: () => Promise<string | null>) {
  const lockValue = `${INSTANCE_ID}:${Date.now()}`;
  const deadline = Date.now() + 12000;
  let acquired = false;
  while (Date.now() < deadline) {
    if (refreshedAfter(startedAt)) return session.get()?.token ?? null;
    const current = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!current || Number(current.split(':')[1] ?? 0) < Date.now() - 12000) {
      localStorage.setItem(REFRESH_LOCK_KEY, lockValue);
      acquired = localStorage.getItem(REFRESH_LOCK_KEY) === lockValue;
      if (acquired) break;
    }
    await sleep(50);
  }
  if (!acquired) return null;
  try { return await action(); }
  finally { if (localStorage.getItem(REFRESH_LOCK_KEY) === lockValue) localStorage.removeItem(REFRESH_LOCK_KEY); }
}

async function refreshOnce(startedAt: number) {
  if (!refreshPromise) {
    const action = async () => {
      if (refreshedAfter(startedAt)) return session.get()?.token ?? null;
      const refreshToken = session.get()?.refreshToken;
      if (!refreshToken) return null;
      const refreshed = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshed.ok) return null;
      const next = normalizeSession(await refreshed.json() as CentralTokenResponse);
      session.set(next);
      localStorage.setItem(REFRESH_MARKER_KEY, String(Date.now()));
      return next.token;
    };
    const coordinated = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('wherefood-auth-refresh', { mode: 'exclusive' }, action)
      : withRefreshLock(startedAt, action);
    refreshPromise = coordinated.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

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
    const fresh = await refreshOnce(Date.now());
    if (fresh) return api<T>(path, init, false);
    session.clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('Tu sesión venció. Ingresá de nuevo para continuar.');
  }
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.detail ?? 'No se pudo completar la acción');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
