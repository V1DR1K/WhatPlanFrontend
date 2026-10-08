import { afterEach, describe, expect, it, vi } from "vitest";
import { getVisitPage } from "./items";

afterEach(() => vi.unstubAllGlobals());

describe("getVisits", () => {
  it("requests a keyset page and forwards cancellation", async () => {
    const page = { content: [], nextCursor: "MjAyNi0wNy0yMjoxMQ" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(getVisitPage(4, { cursor: page.nextCursor, size: 10, signal: controller.signal })).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/places/4/visits?cursor=${page.nextCursor}&size=10`);
    expect(init.signal).toBeDefined();
  });
});
