import { afterEach, describe, expect, it, vi } from "vitest";
import { getArchivedPlaces } from "./places";

afterEach(() => vi.unstubAllGlobals());

describe("getArchivedPlaces", () => {
  it("requests a bounded page and forwards cancellation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [], nextCursor: 24 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(getArchivedPlaces(12, 12, controller.signal)).resolves.toEqual({ content: [], nextCursor: 24 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/places/archived?size=12&cursor=12");
    expect(init.signal).toBeDefined();
  });
});
