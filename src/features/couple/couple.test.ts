import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { login } from '../auth/auth';
import { clearMediaCache, fetchCachedMedia, restoreSession, session } from '../../lib/api';
import { leaveCouple } from './couple';
import { registerPrivateStateClearer } from '../../lib/privateState';

afterEach(() => {
  session.clear();
  clearMediaCache();
  vi.unstubAllGlobals();
});

describe('private state across couple and account changes', () => {
  it('clears account A queries and media before account B uses the same tab', async () => {
    const client = new QueryClient();
    const unregister = registerPrivateStateClearer(() => client.clear());
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Blob(['private A']), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accessToken: 'access-B', refreshToken: 'refresh-B', username: 'person-b', role: 'USER',
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Blob(['private B']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    session.set({ token: 'access-A', username: 'person-a', role: 'USER', user: { mustChangePassword: false } });
    client.setQueryData(['places'], [{ name: 'A-only place' }]);
    await fetchCachedMedia('/places/42/photo');

    await leaveCouple();
    expect(session.get()?.username).toBe('person-a');
    expect(client.getQueryData(['places'])).toBeUndefined();

    await login('person-b', 'password');
    expect(session.get()?.token).toBe('access-B');
    expect(client.getQueryData(['places'])).toBeUndefined();

    await fetchCachedMedia('/places/42/photo');
    const requestOptions = (index: number) => fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
    expect(new Headers(requestOptions(0)?.headers).get('Authorization')).toBe('Bearer access-A');
    expect(new Headers(requestOptions(3)?.headers).get('Authorization')).toBe('Bearer access-B');
    expect([...storage.values()].join(' ')).not.toContain('access-B');
    expect([...storage.values()].join(' ')).not.toContain('refresh-B');

    unregister();
    client.clear();
  });

  it('restores a fresh in-memory session after reload without retaining private queries', async () => {
    const client = new QueryClient();
    const unregister = registerPrivateStateClearer(() => client.clear());
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessToken: 'access-B-after-reload', username: 'person-b', role: 'USER',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    session.set({ token: 'access-B', username: 'person-b', role: 'USER', user: { mustChangePassword: false } });
    client.setQueryData(['private'], ['old data']);

    session.clear(); // A full-page reload discards the previous tab's in-memory access token.
    client.clear(); // The reloaded application starts with an empty query client.
    expect(await restoreSession()).toMatchObject({ token: 'access-B-after-reload', username: 'person-b' });
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });

    unregister();
    client.clear();
  });

  it('discards a private media response that finishes after leaving the couple', async () => {
    let releaseResponse!: (response: Response) => void;
    const delayedResponse = new Promise<Response>((resolve) => { releaseResponse = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(delayedResponse)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    session.set({ token: 'access-A', username: 'person-a', role: 'USER', user: { mustChangePassword: false } });

    const pendingMedia = fetchCachedMedia('/places/42/photo');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await leaveCouple();
    releaseResponse(new Response(new Blob(['private A']), { status: 200 }));

    await expect(pendingMedia).rejects.toThrow('El acceso a este contenido cambió mientras se cargaba.');
  });
});
