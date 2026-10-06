import { expect, test } from "@playwright/test";

for (const role of ["USER", "ADMIN"] as const) {
test(`${role}: switching to all cities reloads Rosario's historical catalog`, async ({ page }) => {
  const requests: URL[] = [];
  const rosarioPlace = {
    id: 101,
    zoneId: 1,
    name: "Lugar histórico de Rosario",
    status: "PENDING",
    acceptsReservations: false,
    category: { id: 1, name: "Restaurante", slug: "restaurante", icon: "🍽️", active: true },
    tags: [],
    author: "tomas",
    rating: 0,
    tasteAverage: 0,
    priceAverage: 0,
    venueAverage: 0,
    itemCount: 0,
    reviews: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  await page.addInitScript((sessionRole) => localStorage.setItem("wherefood.session", JSON.stringify({
    token: "location-filter-test",
    username: "tomas",
    role: sessionRole,
  })), role);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api", "");
    requests.push(url);
    const reply = (value: unknown) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(value),
    });

    if (path === "/location-context") return reply({
      coupleId: "00000000-0000-0000-0000-000000000001",
      originCityId: 1,
      options: [
        { key: "origin", cityId: 1, stageId: null, journeyId: null, label: "Rosario · Origen" },
        { key: "buenos-aires-stage", cityId: 2, stageId: "buenos-aires-stage", journeyId: "trip", label: "Buenos Aires · Viaje · 2026-08-10 / 2026-08-12" },
      ],
    });
    if (path === "/categories" || path === "/highlight-tags") return reply([]);
    if (path === "/places") {
      const isPending = url.searchParams.get("status") === "PENDING";
      const isRosario = !url.searchParams.has("zoneId") || url.searchParams.get("zoneId") === "1";
      return reply({ content: isPending && isRosario ? [rosarioPlace] : [], nextCursor: null });
    }
    if (path === "/places/archived") return reply([]);
    return reply([]);
  });

  await page.goto("/app/food");
  const place = page.getByRole("link", { name: "Ver detalle de Lugar histórico de Rosario" });
  await expect(place).toBeVisible();

  const cityFilter = page.getByRole("combobox", { name: "Filtrar por ciudad" });
  await expect(cityFilter).toHaveValue("origin");
  await expect(cityFilter.locator("option", { hasText: "Rosario · Origen" })).toHaveCount(1);
  await cityFilter.selectOption("buenos-aires-stage");
  await expect(page.getByText("Todavía no agendaste ningún lugar.")).toBeVisible();

  await cityFilter.selectOption("all");
  await expect(place).toBeVisible();
  expect(requests.some((url) => url.pathname.endsWith("/places") && url.searchParams.get("zoneId") === "2")).toBe(true);
  expect(requests.some((url) => url.pathname.endsWith("/places") && url.searchParams.get("zoneId") === "1")).toBe(true);
  expect(requests.some((url) => url.pathname.endsWith("/places") && !url.searchParams.has("zoneId"))).toBe(true);
});
}

test("an administrator without a location context sees the error instead of an empty catalog", async ({ page }) => {
  let catalogRequests = 0;
  await page.addInitScript(() => localStorage.setItem("wherefood.session", JSON.stringify({
    token: "location-filter-test", username: "admin-without-couple", role: "ADMIN",
  })));
  await page.route("**/api/**", async route => {
    if (new URL(route.request().url()).pathname === "/api/location-context") {
      return route.fulfill({ status: 403, contentType: "application/problem+json",
        body: JSON.stringify({ detail: "Necesitás una pareja activa" }) });
    }
    catalogRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/app/food");
  await expect(page.getByRole("alert")).toContainText("Necesitás una pareja activa");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  expect(catalogRequests).toBe(0);
});
