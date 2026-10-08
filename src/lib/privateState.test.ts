import { afterEach, describe, expect, it, vi } from 'vitest';
import './api';
import { session } from './api';
import { registerPrivateStateClearer } from './privateState';

afterEach(() => session.clear());

describe('cross-tab private state events', () => {
  it.skipIf(typeof BroadcastChannel === 'undefined')('clears the session and private data on logout from another tab', async () => {
    const clearPrivateData = vi.fn();
    const unregister = registerPrivateStateClearer(clearPrivateData);
    const sender = new BroadcastChannel('whatplan-private-state');
    session.set({ token: 'access-only-in-memory', username: 'person-a', role: 'USER', user: { mustChangePassword: false } });

    sender.postMessage({ type: 'session-ended', eventId: crypto.randomUUID() });
    await vi.waitFor(() => expect(session.get()).toBeNull());

    expect(clearPrivateData).toHaveBeenCalledOnce();
    sender.close();
    unregister();
  });

  it.skipIf(typeof BroadcastChannel === 'undefined')('clears private data but keeps the session after a couple change', async () => {
    const clearPrivateData = vi.fn();
    const unregister = registerPrivateStateClearer(clearPrivateData);
    const sender = new BroadcastChannel('whatplan-private-state');
    const existing = { token: 'access-only-in-memory', username: 'person-a', role: 'USER' as const, user: { mustChangePassword: false } };
    session.set(existing);

    sender.postMessage({ type: 'membership-changed', eventId: crypto.randomUUID() });
    await vi.waitFor(() => expect(clearPrivateData).toHaveBeenCalledOnce());

    expect(session.get()).toEqual(existing);
    sender.close();
    unregister();
  });
});
