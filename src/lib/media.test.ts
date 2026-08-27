import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMedia, isExternalMediaUrl } from './api';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
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
    storage.set('wherefood.session', JSON.stringify({ token: 'access-token', username: 'tom', role: 'USER' }));
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token');
      return new Response('photo', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    });
    vi.stubGlobal('fetch', request);

    const result = await fetchMedia('/api/places/1/photo');

    expect(request).toHaveBeenCalledOnce();
    expect(await result.text()).toBe('photo');
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
});
