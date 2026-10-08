import { afterEach, describe, expect, it, vi } from "vitest";
import { getActivityVisitPage } from "./whyFun";

afterEach(() => vi.unstubAllGlobals());

describe("getActivityVisits", () => {
  it("requests one bounded keyset page and forwards cancellation", async () => {
    const page = { content: [], nextCursor: "MjAyNi0wOS0yNjoyNA" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(getActivityVisitPage(41, { cursor: page.nextCursor, size: 10, signal: controller.signal })).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/why-fun/activities/41/visits?cursor=${page.nextCursor}&size=10`);
    expect(init.signal).toBeDefined();
  });
});
