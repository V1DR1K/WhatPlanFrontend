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
const DEFAULT_TIMEOUT_MS = 15_000;
let refreshPromise: Promise<string | null> | null = null;

export const apiUrl = (path: string) => `${BASE}${path}`;
export const mediaUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('/api/') || /^https?:\/\//.test(path) ? path : apiUrl(path);

export const isExternalMediaUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('blob:') || /^https?:\/\//.test(path) && !isApiUrl(path);

function isApiUrl(path: string) {
  if (path.startsWith('/api/')) return true;
  try {
    const resolved = new URL(path, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
    const baseUrl = new URL(BASE, resolved);
    return resolved.origin === baseUrl.origin && resolved.pathname.startsWith(baseUrl.pathname.replace(/\/$/, ''));
  } catch {
    return false;
  }
}

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

const sleep = (milliseconds: number) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
const refreshedAfter = (startedAt: number) => Number(localStorage.getItem(REFRESH_MARKER_KEY) ?? 0) > startedAt;

export type ApiRequestInit = RequestInit & { timeoutMs?: number };

function requestSignal(signal: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(new DOMException('La solicitud tardó demasiado', 'TimeoutError')), timeoutMs);
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    },
  };
}

export async function parseApiError(response: Response) {
  const fallback = response.status === 429
    ? 'Hay demasiadas solicitudes. Esperá un momento e intentá de nuevo.'
    : response.status === 403
      ? 'No tenés permisos para realizar esta acción.'
      : response.status === 404
        ? 'No encontramos lo que buscabas.'
        : 'No se pudo completar la acción';
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    const body = await response.json().catch(() => null) as { detail?: string; message?: string; title?: string } | null;
    return body?.detail ?? body?.message ?? body?.title ?? fallback;
  }
  const text = (await response.text().catch(() => '')).trim();
  return text || fallback;
}

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
      const request = requestSignal(undefined, DEFAULT_TIMEOUT_MS);
      try {
        const refreshed = await fetch(apiUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: request.signal,
        });
        if (!refreshed.ok) return null;
        const next = normalizeSession(await refreshed.json() as CentralTokenResponse);
        session.set(next);
        localStorage.setItem(REFRESH_MARKER_KEY, String(Date.now()));
        return next.token;
      } finally {
        request.cleanup();
      }
    };
    const coordinated = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('wherefood-auth-refresh', { mode: 'exclusive' }, action)
      : withRefreshLock(startedAt, action);
    refreshPromise = coordinated.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api<T>(path: string, init: ApiRequestInit = {}, retry = true) {
  const token = session.get()?.token;
  const startedAt = Date.now();
  const request = requestSignal(init.signal, init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const requestInit: RequestInit = { ...init };
  delete (requestInit as ApiRequestInit).timeoutMs;
  delete requestInit.signal;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...requestInit, headers, signal: request.signal });
  } finally {
    request.cleanup();
  }
  if (response.status === 401 && retry && !['/auth/login', '/auth/refresh', '/auth/logout'].includes(path)) {
    if (init.signal?.aborted) throw init.signal.reason;
    const fresh = await refreshOnce(startedAt);
    if (fresh) return api<T>(path, init, false);
    session.clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new Error('Tu sesión venció. Ingresá de nuevo para continuar.');
  }
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function fetchMedia(path: string, signal?: AbortSignal) {
  const url = mediaUrl(path);
  const token = session.get()?.token;
  const startedAt = Date.now();
  const request = requestSignal(signal, DEFAULT_TIMEOUT_MS);
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: request.signal });
  } finally {
    request.cleanup();
  }
  if (response.status === 401) {
    if (signal?.aborted) throw signal.reason;
    const fresh = await refreshOnce(startedAt);
    if (fresh) return fetchMedia(path, signal);
    session.clear();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.blob();
}
