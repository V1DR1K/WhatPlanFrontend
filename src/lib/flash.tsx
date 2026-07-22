import { useSyncExternalStore } from 'react';

type Notice = { id: number; message: string; tone: 'success' | 'error' } | undefined;

let current: Notice;
let nextId = 1;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

export function showNotice(message: string, tone: 'success' | 'error' = 'success') {
  const id = nextId++;
  current = { id, message, tone };
  notify();
  window.setTimeout(() => {
    if (current?.id === id) {
      current = undefined;
      notify();
    }
  }, 5_000);
}

export function FlashNotice() {
  const notice = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => undefined,
  );

  if (!notice) return null;
  return <div className={`flash-notice flash-notice--${notice.tone}`} role="status">{notice.message}</div>;
}
