# Frontend session and private-data state

Access tokens remain in the in-memory session object; refresh credentials remain in the backend's `HttpOnly` cookie. Browser storage contains only refresh coordination timestamps/locks and a transient cross-tab event with an event type and random ID—never credentials, private records, photo bytes, or user identifiers.

On logout, failed session renewal, successful account replacement, invitation acceptance, or leaving a couple, the app clears React Query state and its private-media cache. Mounted image components revoke their object URLs during cleanup. Membership changes are broadcast to other tabs without secrets; tabs discard private caches and reload protected views, while session end/replacement clears the in-memory token and routes tabs to login. Backend authorization remains the security boundary if another tab is offline or misses a browser event.

`BroadcastChannel` is preferred. Where unavailable, the app emits a short-lived same-origin `localStorage` storage event with the same non-secret payload. If browser storage is disabled, the active tab still clears its state; cross-tab synchronization then relies on backend authorization and each tab's next request.
