import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, mediaUrl, parseApiError, session, setCurrentZoneFilter, setCurrentJourneyStage } from "./api";
import { getArchivedPlaces } from "../features/places/places";

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
  setCurrentZoneFilter(null);
  setCurrentJourneyStage(null);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: createStorage() });
});

afterEach(() => {
  setCurrentZoneFilter(null);
  setCurrentJourneyStage(null);
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

describe("global zone filter", () => {
  it("uses the same city catalogue for two trips while proposing each selected stage", async()=>{
    setCurrentZoneFilter(2);setCurrentJourneyStage('stage-a');await api('/films');await api('/films',{method:'POST',body:JSON.stringify({title:'Film'})});
    setCurrentJourneyStage('stage-b');await api('/films');await api('/films',{method:'POST',body:JSON.stringify({title:'Film'})});
    const calls=(fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe(calls[2][0]);
    expect(JSON.parse(calls[1][1].body).stageId).toBe('stage-a');expect(JSON.parse(calls[3][1].body).stageId).toBe('stage-b');
  });
  it("keeps an explicit form location and leaves the trip catalogue unfiltered", async()=>{
    setCurrentZoneFilter(2);setCurrentJourneyStage('stage-a');
    await api('/places',{method:'POST',body:JSON.stringify({name:'Origin',zoneId:1,stageId:null})});await api('/whither-journey');
    const calls=(fetch as ReturnType<typeof vi.fn>).mock.calls;expect(JSON.parse(calls[0][1].body)).toEqual({name:'Origin',zoneId:1,stageId:null});expect(calls[1][0]).not.toContain('cityId');
  });

  beforeEach(() => {
    session.set({ token: "active", username: "tomas", role: "USER" });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ content: [] }), { status: 200 }))));
  });

  it("adds the selected zone to catalog list requests", async () => {
    setCurrentZoneFilter(2);

    await api("/places?size=5");

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("/places?size=5&zoneId=2");
  });

  it("does not replace an explicit zone on catalog reads", async () => {
    setCurrentZoneFilter(2);

    await api("/places?size=5&zoneId=7");

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("/places?size=5&zoneId=7");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).not.toContain("zoneId=7&zoneId=2");
  });

  it("requests archived places using the paged slice contract", async () => {
    setCurrentZoneFilter(2);

    await getArchivedPlaces(12, 5);

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      .toContain("/places/archived?size=5&cursor=12&zoneId=2");
  });

  it("assigns the selected zone to new catalog records", async () => {
    setCurrentZoneFilter(2);

    await api("/places", { method: "POST", body: JSON.stringify({ name: "Lugar" }) });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({ name: "Lugar", zoneId: 2 });
  });

  it("leaves zone unassigned when the global filter is Todos", async () => {
    await api("/places", { method: "POST", body: JSON.stringify({ name: "Lugar" }) });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({ name: "Lugar" });
  });
});
