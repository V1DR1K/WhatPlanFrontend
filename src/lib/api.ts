import type { Session } from '../types/domain';
import { clearStoredAdminCoupleScope, getAdminCoupleScope } from './adminScopeStorage';
import { broadcastPrivateStateEvent, clearPrivateState, onPrivateStateEvent, registerPrivateStateClearer } from './privateState';

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
let currentZoneFilterId: number | null = null;
let currentJourneyStageId: string | null = null;
export const setCurrentJourneyStage = (stageId: string | null) => { currentJourneyStageId = stageId; };
const zoneFilteredLists = new Set(['/places', '/places/archived', '/why-fun/activities', '/why-fun/plans', '/when-dates']);
const zoneAssignedCreates = new Set(['/places', '/why-fun/activities', '/why-fun/plans']);
const stageAssignedCreates = new Set(['/films', '/how-cook/recipes']);
export const setCurrentZoneFilter = (zoneId: number | null) => { currentZoneFilterId = zoneId; };
function scopedHeaders(path: string, headers: Headers) {
  const coupleId = getAdminCoupleScope();
  const globalPrefixes = ['/auth/', '/admin/', '/couple', '/couples', '/settings', '/categories',
    '/zones', '/locations', '/films/platforms', '/films/genres', '/why-fun/categories', '/journey/point-types'];
  const isGlobal = globalPrefixes.some(prefix => path === prefix || path.startsWith(prefix));
  if (coupleId && !isGlobal && !headers.has('X-WhatPlan-Admin-Couple')) {
    headers.set('X-WhatPlan-Admin-Couple', coupleId);
  }
  return headers;
}
type RefreshOutcome = { token: string | null; definitive: boolean };
const refreshFailed = (definitive = false): RefreshOutcome => ({ token: null, definitive });
let refreshPromise: Promise<RefreshOutcome> | null = null;

export const apiUrl = (path: string) => `${BASE}${path}`;
export const mediaUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('/api/') || /^https?:\/\//.test(path) ? path : apiUrl(path);

export const isExternalMediaUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('blob:') || /^https?:\/\//.test(path) && !isApiUrl(path);

function isApiUrl(path: string) {
  if (path.startsWith('/api/')) return true;
  try {
    const appOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const resolved = new URL(path, appOrigin);
    const baseUrl = new URL(BASE, appOrigin);
    const basePath = baseUrl.pathname.replace(/\/+$/, '') || '/';
    const withinApiPath = basePath === '/' || resolved.pathname === basePath || resolved.pathname.startsWith(`${basePath}/`);
    return resolved.origin === baseUrl.origin && withinApiPath;
  } catch {
    return false;
  }
}

let volatileSession: Session | null = null;
let sessionUpdatedAt = 0;
let sessionRevision = 0;
let restoreSessionPromise: Promise<Session | null> | null = null;

export const session = {
  get: (): Session | null => volatileSession,
  set: (value: Session) => { volatileSession = value; sessionUpdatedAt = Date.now(); sessionRevision += 1; },
  clear: () => { volatileSession = null; sessionUpdatedAt = 0; sessionRevision += 1; },
};

function endCurrentSession() {
  clearPrivateState();
  session.clear();
  clearStoredAdminScope();
  broadcastPrivateStateEvent('session-ended');
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
}

function clearStoredAdminScope() {
  clearStoredAdminCoupleScope();
}

const sleep = (milliseconds: number) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
function readLocalStorage(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
const refreshedAfter = (startedAt: number) => Number(readLocalStorage(REFRESH_MARKER_KEY) ?? 0) > startedAt;

export type ApiRequestInit = RequestInit & { timeoutMs?: number };

export type ApiErrorCode = string & {};
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode?: ApiErrorCode,
    readonly requestId?: string,
    readonly problemType?: string,
    readonly instance?: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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

export async function parseApiError(response: Response): Promise<ApiError> {
  const fallback = response.status === 429
    ? 'Hay demasiadas solicitudes. Esperá un momento e intentá de nuevo.'
    : response.status === 403
      ? 'No tenés permisos para realizar esta acción.'
      : response.status === 404
        ? 'No encontramos lo que buscabas.'
        : 'No se pudo completar la acción';
  const contentType = response.headers.get('content-type') ?? '';
  let message = fallback;
  let problem: Record<string, unknown> | null = null;
  if (contentType.includes('json')) {
    const body = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      message = [body.detail, body.message, body.title]
        .find((value): value is string => typeof value === 'string' && Boolean(value.trim())) ?? fallback;
      if (contentType.toLowerCase().includes('application/problem+json')) problem = body;
    }
  } else {
    const text = (await response.text().catch(() => '')).trim();
    if (text) message = text;
  }
  const errorCode = typeof problem?.errorCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(problem.errorCode)
    ? problem.errorCode : undefined;
  const requestId = typeof problem?.requestId === 'string' && problem.requestId.length <= 128
    ? problem.requestId : undefined;
  const fieldErrors = problem?.errors && typeof problem.errors === 'object' && !Array.isArray(problem.errors)
    ? Object.fromEntries(Object.entries(problem.errors).filter(([field, error]) =>
      field.length <= 128 && typeof error === 'string' && error.length <= 1000))
    : undefined;
  return new ApiError(message, response.status, errorCode, requestId,
    typeof problem?.type === 'string' ? problem.type : undefined,
    typeof problem?.instance === 'string' ? problem.instance : undefined, fieldErrors);
}

async function withRefreshLock(startedAt: number, action: () => Promise<RefreshOutcome>) {
  const lockValue = `${INSTANCE_ID}:${Date.now()}`;
  const deadline = Date.now() + 12000;
  let acquired = false;
  try { localStorage.getItem(REFRESH_LOCK_KEY); } catch { return action(); }
  while (Date.now() < deadline) {
    if (refreshedAfter(startedAt) && sessionUpdatedAt > startedAt) return { token: session.get()?.token ?? null, definitive: false };
    const current = readLocalStorage(REFRESH_LOCK_KEY);
    if (!current || Number(current.split(':')[1] ?? 0) < Date.now() - 12000) {
      try { localStorage.setItem(REFRESH_LOCK_KEY, lockValue); } catch { return action(); }
      acquired = readLocalStorage(REFRESH_LOCK_KEY) === lockValue;
      if (acquired) break;
    }
    await sleep(50);
  }
  if (!acquired) return refreshFailed();
  try { return await action(); }
  finally {
    if (readLocalStorage(REFRESH_LOCK_KEY) === lockValue) {
      try { localStorage.removeItem(REFRESH_LOCK_KEY); } catch { /* Ignore coordination cleanup failures. */ }
    }
  }
}

async function refreshOnce(startedAt: number) {
  if (!refreshPromise) {
    const action = async () => {
      if (refreshedAfter(startedAt) && sessionUpdatedAt > startedAt) return { token: session.get()?.token ?? null, definitive: false };
      const request = requestSignal(undefined, DEFAULT_TIMEOUT_MS);
      try {
        const refreshed = await fetch(apiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          signal: request.signal,
        });
        if (!refreshed.ok) return refreshFailed([400, 401, 403].includes(refreshed.status));
        const next = normalizeSession(await refreshed.json() as CentralTokenResponse);
        session.set(next);
        try { localStorage.setItem(REFRESH_MARKER_KEY, String(Date.now())); } catch { /* Refresh succeeded; coordination is best-effort. */ }
        return { token: next.token, definitive: false };
      } catch {
        return refreshFailed();
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
  const method = (init.method ?? 'GET').toUpperCase();
  const apiPath = path.split('?')[0];
  let requestPath = path;
  let requestBody = init.body;
  const zoneFilteredRequest = zoneFilteredLists.has(apiPath)
    || apiPath.startsWith('/when-dates/special-dates/') && apiPath.includes('/occurrences/');
  if (method === 'GET' && currentZoneFilterId !== null && zoneFilteredRequest
      && !new URLSearchParams(requestPath.split('?')[1] ?? '').has('zoneId')) {
    requestPath += `${requestPath.includes('?') ? '&' : '?'}zoneId=${currentZoneFilterId}`;
  }
  if (method === 'POST' && (zoneAssignedCreates.has(apiPath) || stageAssignedCreates.has(apiPath))
      && typeof requestBody === 'string' && requestBody.length > 0) {
    try {
      const payload = JSON.parse(requestBody) as Record<string, unknown>;
      requestBody = JSON.stringify({
        ...payload,
        ...(zoneAssignedCreates.has(apiPath) && currentZoneFilterId !== null
          ? { zoneId: payload.zoneId ?? currentZoneFilterId }
          : {}),
        ...(payload.stageId !== undefined
          ? { stageId: payload.stageId }
          : currentJourneyStageId !== null
            ? { stageId: currentJourneyStageId }
            : {}),
      });
    } catch {
      // Non-JSON requests are not zone-assigned catalog creations.
    }
  }
  const token = session.get()?.token;
  const startedAt = Date.now();
  const request = requestSignal(init.signal, init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  scopedHeaders(apiPath, headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const requestInit: RequestInit = { ...init, body: requestBody };
  delete (requestInit as ApiRequestInit).timeoutMs;
  delete requestInit.signal;
  let response: Response;
  try {
    response = await fetch(apiUrl(requestPath), { ...requestInit, credentials: 'include', headers, signal: request.signal });
  } finally {
    request.cleanup();
  }
  if (response.status === 401 && retry && !['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].includes(apiPath)) {
    if (init.signal?.aborted) throw init.signal.reason;
    const fresh = await refreshOnce(startedAt);
    if (fresh.token) return api<T>(path, init, false);
    if (fresh.definitive) {
      endCurrentSession();
      throw new Error('Tu sesión venció. Ingresá de nuevo para continuar.');
    }
    throw new Error('No se pudo renovar la sesión por un problema de conexión. Tus credenciales siguen guardadas; intentá nuevamente.');
  }
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function fetchMedia(path: string, signal?: AbortSignal) {
  const url = mediaUrl(path);
  const isApiRequest = isApiUrl(url);
  const token = session.get()?.token;
  const startedAt = Date.now();
  const request = requestSignal(signal, DEFAULT_TIMEOUT_MS);
  const headers = isApiRequest
    ? scopedHeaders(path, new Headers(token ? { Authorization: `Bearer ${token}` } : undefined))
    : new Headers();
  let response: Response;
  try {
    response = await fetch(url, { credentials: isApiRequest ? 'include' : 'omit', headers, signal: request.signal });
  } finally {
    request.cleanup();
  }
  if (response.status === 401 && isApiRequest) {
    if (signal?.aborted) throw signal.reason;
    const fresh = await refreshOnce(startedAt);
    if (fresh.token) return fetchMedia(path, signal);
    if (fresh.definitive) {
      endCurrentSession();
    } else {
      throw new Error('No se pudo renovar la sesión por un problema de conexión. Tus credenciales siguen guardadas; intentá nuevamente.');
    }
  }
  if (!response.ok) throw await parseApiError(response);
  return response.blob();
}

const MEDIA_CACHE_LIMIT = 80;
const mediaBlobCache = new Map<string, Promise<Blob>>();
let mediaCacheGeneration = 0;

export function fetchCachedMedia(path: string) {
  const key = mediaUrl(path);
  const cached = mediaBlobCache.get(key);
  if (cached) {
    mediaBlobCache.delete(key);
    mediaBlobCache.set(key, cached);
    return cached;
  }

  const generation = mediaCacheGeneration;
  const request = fetchMedia(path).then(blob => {
    if (generation !== mediaCacheGeneration) throw new Error('El acceso a este contenido cambió mientras se cargaba.');
    return blob;
  }).catch((reason) => {
    if (mediaBlobCache.get(key) === request) mediaBlobCache.delete(key);
    throw reason;
  });
  mediaBlobCache.set(key, request);
  while (mediaBlobCache.size > MEDIA_CACHE_LIMIT) mediaBlobCache.delete(mediaBlobCache.keys().next().value!);
  return request;
}

export function prefetchMedia(path: string) {
  return fetchCachedMedia(path).then(() => undefined).catch(() => undefined);
}

export function clearMediaCache() {
  mediaCacheGeneration += 1;
  mediaBlobCache.clear();
}

export function restoreSession() {
  if (restoreSessionPromise) return restoreSessionPromise;
  const revisionAtStart = sessionRevision;
  const request = requestSignal(undefined, DEFAULT_TIMEOUT_MS);
  const restoring = (async () => {
    try {
      const response = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST', credentials: 'include', signal: request.signal,
      });
      if (!response.ok) return sessionRevision === revisionAtStart ? null : session.get();
      const next = normalizeSession(await response.json() as CentralTokenResponse);
      if (sessionRevision !== revisionAtStart) return session.get();
      session.set(next);
      if (next.role !== 'ADMIN') clearStoredAdminScope();
      return next;
    } catch {
      if (sessionRevision === revisionAtStart) {
        session.clear();
        clearPrivateState();
        clearStoredAdminScope();
      }
      return session.get();
    } finally {
      request.cleanup();
    }
  })();
  const shared = restoring.finally(() => {
    if (restoreSessionPromise === shared) restoreSessionPromise = null;
  });
  restoreSessionPromise = shared;
  return shared;
}

registerPrivateStateClearer(clearMediaCache);
onPrivateStateEvent(event => {
  clearPrivateState();
  clearStoredAdminScope();
  if (event === 'membership-changed') {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) window.location.reload();
    return;
  }
  session.clear();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
});
