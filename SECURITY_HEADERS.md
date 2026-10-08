# Frontend security headers

The frontend Caddyfile applies the same-origin policy to page scripts and API connections. Images may load from the app, browser-generated `data:` and `blob:` URLs, and TMDB's image host. Fonts are served from the app bundle. Inline style attributes remain allowed because the interface uses them for layout and section colors.

The policy also blocks framing, plugins, cross-origin form submissions, camera, microphone, and geolocation access. `Referrer-Policy: no-referrer` keeps WhatPlan URLs out of requests to external sites. Hashed assets keep immutable caching; the HTML shell remains short lived and protected from edge HTML injection.

The Caddyfile listens on port 80 behind the public TLS edge. Browsers only honor HSTS over HTTPS, so the deployed TLS terminator must also emit `Strict-Transport-Security` and preserve the other response headers. This file documents and enforces the application-side policy; it does not prove the public edge configuration.
