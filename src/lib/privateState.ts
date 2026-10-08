export type PrivateStateEvent = 'session-ended' | 'session-replaced' | 'membership-changed';

const CHANNEL_NAME = 'whatplan-private-state';
const STORAGE_EVENT_KEY = 'whatplan.private-state.event';
const clearers = new Set<() => void>();
const listeners = new Set<(event: PrivateStateEvent) => void>();
const seen = new Set<string>();
let channel: BroadcastChannel | null = null;
try { if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL_NAME); } catch { /* Storage events remain as a fallback. */ }

function receive(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const message = value as { eventId?: unknown; type?: unknown };
  if (typeof message.eventId !== 'string' || seen.has(message.eventId)) return;
  if (message.type !== 'session-ended' && message.type !== 'session-replaced' && message.type !== 'membership-changed') return;
  seen.add(message.eventId);
  if (seen.size > 64) seen.delete(seen.values().next().value!);
  for (const listener of listeners) listener(message.type);
}

channel?.addEventListener('message', (event: MessageEvent<unknown>) => receive(event.data));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
    try { receive(JSON.parse(event.newValue)); } catch { /* Ignore malformed same-origin events. */ }
  });
}

export function registerPrivateStateClearer(clear: () => void) {
  clearers.add(clear);
  return () => { clearers.delete(clear); };
}

export function clearPrivateState() {
  for (const clear of clearers) clear();
}

export function onPrivateStateEvent(listener: (event: PrivateStateEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcastPrivateStateEvent(type: PrivateStateEvent) {
  const message = {
    type,
    eventId: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  try { channel?.postMessage(message); } catch { /* Storage fallback may still work. */ }
  try {
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(message));
    localStorage.removeItem(STORAGE_EVENT_KEY);
  } catch { /* No credentials or private content are stored in the event. */ }
}
