import { afterEach, describe, expect, it, vi } from 'vitest';
import { logout } from './auth';
import { session } from '../../lib/api';
import { registerPrivateStateClearer } from '../../lib/privateState';

afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

describe('logout', () => {
  it('clears the session and private caches even when logout request fails', async () => {
    const clearPrivateData = vi.fn();
    const unregister = registerPrivateStateClearer(clearPrivateData);
    session.set({ token: 'access-only-in-memory', username: 'person-a', role: 'USER', user: { mustChangePassword: false } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(logout()).rejects.toThrow('offline');

    expect(session.get()).toBeNull();
    expect(clearPrivateData).toHaveBeenCalledOnce();
    unregister();
  });
});
