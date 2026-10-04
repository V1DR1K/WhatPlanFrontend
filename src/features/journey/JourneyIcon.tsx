import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  ACTIVITY: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  FOOD: <><path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 14v7M17 3v18m0-18a4 4 0 0 1 4 4v3h-4" /></>,
  FILM: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3z" /></>,
  COOK: <><path d="M4 11h16l-2 9H6zM3 7h18M8 7V4m8 3V4M9 14h.01M15 14h.01" /></>,
  FUN: <><path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /><path d="m19 16 .8 1.7L22 18.5l-2.2.8L19 21l-.8-1.7-2.2-.8 2.2-.8z" /></>,
  TRANSFER: <><path d="M4 7h15m0 0-4-4m4 4-4 4M20 17H5m0 0 4-4m-4 4 4 4" /></>,
  SHOP: <><path d="M4 8h16l-1 13H5zM8 8a4 4 0 0 1 8 0" /></>,
  TICKET: <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM12 7v2m0 3v2m0 3v1" /></>,
  PHONE: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M10 18h4" /></>,
  LINK: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2" /></>,
  INFO: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  WEB: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  EDIT: <><path d="m4 16-.8 4.8L8 20l11-11a2.8 2.8 0 0 0-4-4zM13.5 6.5l4 4" /></>,
  CHECK: <><path d="m5 12 4 4L19 6" /></>,
  PENDING: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  CANCEL: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  MONEY: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 8v8m3-6.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 1-3 2.3s1.1 2 3 2.4 3 1 3 2.2S13.8 17 12 17c-1.4 0-2.6-.5-3.2-1.5" /></>,
  UP: <><path d="m6 14 6-6 6 6" /></>,
  DOWN: <><path d="m6 10 6 6 6-6" /></>,
  DELETE: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  MAPS: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15" /></>,
  OPEN: <><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
};

export function JourneyIcon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {shapes[name] ?? shapes.LINK}
  </svg>;
}
