import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, mediaUrl, parseApiError, session } from "./api";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => { values.clear(); },
  };
}

const originalStorage = globalThis.localStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: createStorage() });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalStorage });
});

describe("mediaUrl", () => {
  it("does not prefix an API path twice", () => {
    expect(mediaUrl("/api/places/7/photo")).toBe("/api/places/7/photo");
  });
});

describe("parseApiError", () => {
  it("reads RFC-style detail messages", async () => {
    const response = new Response(JSON.stringify({ detail: "El nombre ya existe" }), {
      status: 409,
      headers: { "content-type": "application/problem+json" },
    });
    await expect(parseApiError(response)).resolves.toBe("El nombre ya existe");
  });

  it("falls back to plain text responses", async () => {
    const response = new Response("Servicio no disponible", { status: 503 });
    await expect(parseApiError(response)).resolves.toBe("Servicio no disponible");
  });
});

describe("session recovery", () => {
  it("refreshes through the HttpOnly cookie without requiring a local refresh token", async () => {
    session.set({ token: "expired", username: "tomas", role: "USER" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "fresh", username: "tomas", role: "USER" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 })));

    await expect(api<{ ok: boolean }>("/protected")).resolves.toEqual({ ok: true });

    const refreshInit = (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1] as RequestInit;
    expect(refreshInit.credentials).toBe("include");
    expect(refreshInit.body).toBeUndefined();
    expect(session.get()?.token).toBe("fresh");
  });

  it("keeps the local session when refresh fails temporarily", async () => {
    session.set({ token: "expired", username: "tomas", role: "USER" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })));

    await expect(api("/protected")).rejects.toThrow("Tus credenciales siguen guardadas");
    expect(session.get()?.token).toBe("expired");
  });
});
