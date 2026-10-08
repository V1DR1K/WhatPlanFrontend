import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, mediaUrl, parseApiError, restoreSession, session } from "./api";
import { acceptInvitation } from "../features/couple/couple";
import { registerPrivateStateClearer } from "./privateState";

afterEach(() => { session.clear(); vi.unstubAllGlobals(); });

describe("restoreSession", () => {
  it("shares the refresh request and keeps a newer login when the old restore fails", async () => {
    let finishResponse: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finishResponse = resolve; }));
    vi.stubGlobal("fetch", fetchMock);

    const firstRestore = restoreSession();
    const secondRestore = restoreSession();
    expect(fetchMock).toHaveBeenCalledOnce();

    const loggedIn = { token: "fresh-login-token", username: "new-member", role: "USER" as const, user: { mustChangePassword: false } };
    session.set(loggedIn);
    finishResponse?.(new Response(null, { status: 401 }));

    await expect(Promise.all([firstRestore, secondRestore])).resolves.toEqual([loggedIn, loggedIn]);
    expect(session.get()).toEqual(loggedIn);
  });
});

describe("mediaUrl", () => {
  it("does not prefix an API path twice", () => {
    expect(mediaUrl("/api/places/7/photo")).toBe("/api/places/7/photo");
  });
});

describe("parseApiError", () => {
  it("reads RFC-style detail messages", async () => {
    const response = new Response(JSON.stringify({
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "El nombre ya existe",
      instance: "urn:uuid:request-instance",
      errorCode: "CONFLICT",
      requestId: "request-123",
    }), {
      status: 409,
      headers: { "content-type": "application/problem+json" },
    });
    const error = await parseApiError(response);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: "El nombre ya existe",
      status: 409,
      errorCode: "CONFLICT",
      requestId: "request-123",
      problemType: "about:blank",
      instance: "urn:uuid:request-instance",
    });
  });

  it("falls back to plain text responses", async () => {
    const response = new Response("Servicio no disponible", { status: 503 });
    const error = await parseApiError(response);
    expect(error).toMatchObject({ message: "Servicio no disponible", status: 503 });
    expect(error.errorCode).toBeUndefined();
  });

  it("ignores malformed or non-contract error codes", async () => {
    const response = new Response(JSON.stringify({
      detail: "Solicitud rechazada",
      errorCode: "<script>alert(1)</script>",
      requestId: "r".repeat(129),
    }), {
      status: 400,
      headers: { "content-type": "application/problem+json" },
    });
    const error = await parseApiError(response);
    expect(error.message).toBe("Solicitud rechazada");
    expect(error.errorCode).toBeUndefined();
    expect(error.requestId).toBeUndefined();
  });

  it("uses the status fallback when the JSON body is malformed", async () => {
    const response = new Response("{", {
      status: 429,
      headers: { "content-type": "application/problem+json" },
    });
    const error = await parseApiError(response);
    expect(error).toMatchObject({
      message: "Hay demasiadas solicitudes. Esperá un momento e intentá de nuevo.",
      status: 429,
    });
  });

  it("preserves validated field errors for form recovery", async () => {
    const response = new Response(JSON.stringify({
      detail: "Revisá los datos ingresados.",
      errorCode: "VALIDATION_ERROR",
      requestId: "request-validation",
      errors: { name: "El nombre es obligatorio", count: 12 },
    }), {
      status: 400,
      headers: { "content-type": "application/problem+json" },
    });
    const error = await parseApiError(response);
    expect(error.fieldErrors).toEqual({ name: "El nombre es obligatorio" });
  });

  it("throws the typed problem through the shared API client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "Servicio no disponible temporalmente.",
      instance: "urn:uuid:request-instance",
      errorCode: "SERVICE_UNAVAILABLE",
      requestId: "request-503",
    }), {
      status: 503,
      headers: { "content-type": "application/problem+json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/example"))
      .rejects.toMatchObject({
        name: "ApiError",
        status: 503,
        errorCode: "SERVICE_UNAVAILABLE",
        requestId: "request-503",
      });
  });
});

describe("acceptInvitation", () => {
  it("sends the secret in the body, not in the request URL", async () => {
    const secret = "a".repeat(43);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "pair" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await acceptInvitation(secret);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/couple/invitations/accept");
    expect(url).not.toContain(secret);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ token: secret });
  });

  it("clears private client data after membership changes", async () => {
    const clearPrivateData = vi.fn();
    const unregister = registerPrivateStateClearer(clearPrivateData);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "pair" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await acceptInvitation("b".repeat(43));

    expect(clearPrivateData).toHaveBeenCalledOnce();
    unregister();
  });
});
