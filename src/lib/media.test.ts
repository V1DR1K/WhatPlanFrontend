import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMediaCache, fetchCachedMedia, fetchMedia, isExternalMediaUrl, session } from './api';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  session.clear();
  clearMediaCache();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe('authenticated media', () => {
  it('keeps external, blob and data sources direct', () => {
    expect(isExternalMediaUrl('https://images.example/photo.jpg')).toBe(true);
    expect(isExternalMediaUrl('blob:https://example.test/photo')).toBe(true);
    expect(isExternalMediaUrl('data:image/png;base64,abc')).toBe(true);
    expect(isExternalMediaUrl('/api/places/1/photo')).toBe(false);
  });

  it('sends the current bearer token for API media', async () => {
    session.set({ token: 'access-token', username: 'tom', role: 'USER' });
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token');
      return new Response('photo', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    });
    vi.stubGlobal('fetch', request);

    const result = await fetchMedia('/api/places/1/photo');

    expect(request).toHaveBeenCalledOnce();
    expect(await result.text()).toBe('photo');
  });

  it('never sends the access token or cookies to an external media origin', async () => {
    session.set({ token: 'access-token', username: 'tom', role: 'USER' });
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has('Authorization')).toBe(false);
      expect(init?.credentials).toBe('omit');
      return new Response('photo', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    });
    vi.stubGlobal('fetch', request);

    const result = await fetchMedia('https://images.example/photo.jpg');
    await fetchMedia('https://images.example/api/attacker-controlled-path');

    expect(request).toHaveBeenCalledTimes(2);
    expect(await result.text()).toBe('photo');
  });

  it('does not refresh or discard the session for an external media 401', async () => {
    session.set({ token: 'access-token', username: 'tom', role: 'USER' });
    const request = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', request);

    await expect(fetchMedia('https://images.example/photo.jpg')).rejects.toThrow();

    expect(request).toHaveBeenCalledOnce();
    expect(session.get()?.token).toBe('access-token');
  });

  it('aborts an in-flight media request', async () => {
    const controller = new AbortController();
    const request = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal('fetch', request);

    const promise = fetchMedia('/api/places/1/photo', controller.signal);
    controller.abort();

    await expect(promise).rejects.toBeDefined();
  });

  it('deduplicates concurrent requests for the same media URL', async () => {
    session.set({ token: 'access-token', username: 'tom', role: 'USER' });
    const request = vi.fn(async () => new Response('photo', { status: 200 }));
    vi.stubGlobal('fetch', request);

    await Promise.all([fetchCachedMedia('/api/places/1/photo'), fetchCachedMedia('/api/places/1/photo')]);

    expect(request).toHaveBeenCalledOnce();
  });

  it('does not deliver an in-flight private photo after the cache is cleared', async () => {
    session.set({ token: 'access-token', username: 'tom', role: 'USER' });
    let finishRequest!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve; })));

    const oldMembershipRequest = fetchCachedMedia('/api/places/1/photo');
    clearMediaCache();
    finishRequest(new Response('private photo', { status: 200 }));

    await expect(oldMembershipRequest).rejects.toThrow('El acceso a este contenido cambió mientras se cargaba.');
  });
});
