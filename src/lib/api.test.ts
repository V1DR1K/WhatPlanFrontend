import { describe, expect, it } from "vitest";
import { mediaUrl, parseApiError } from "./api";

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
