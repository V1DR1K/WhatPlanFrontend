import { test, expect } from "@playwright/test";
import { journeyFixture } from "./journey.fixture";
import { mkdir } from "node:fs/promises";

test("dashboard presents Whither Journey beside WhenDates at the end", async ({ page }) => {
  await journeyFixture(page);
  await page.goto("/app");
  const modules = page.locator(".module-picker > a");
  await expect(modules.last()).toHaveAttribute("href", "/app/whither-journey");
  await expect(modules.nth(4)).toHaveAttribute("href", "/app/when-dates");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/whither-journey");
  const firstWordLines = await page.locator(".journey-hero h1").evaluate((heading) => {
    const text = heading.firstChild;
    if (!text || text.nodeType !== Node.TEXT_NODE) return 0;
    const word = document.createRange();
    word.setStart(text, 0);
    word.setEnd(text, 7);
    return word.getClientRects().length;
  });
  expect(firstWordLines).toBe(1);
});

test("journey catalog filters trips and renders shared photo cards", async ({ page }) => {
  const fixture = await journeyFixture(page, true);
  const archivedTrip = fixture.journeys.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")!;
  archivedTrip.trip.archived = true;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/whither-journey");

  const cards = page.locator(".journey-catalog > a");
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator(".journey-trip__art svg")).toBeVisible();
  await expect(cards.first().getByRole("heading", { name: "Volvemos a Buenos Aires" })).toBeVisible();
  await expect(cards.first().locator(".catalog-media-card__kpi")).toContainText("3 DÍAS");

  await page.getByLabel("Buscar viajes").fill("Buenos Aires");
  await page.getByLabel("Filtrar por destino").selectOption("2");
  await page.getByLabel("Fecha desde").fill("2026-08-01");
  await expect(page.getByLabel("Fecha desde")).toHaveValue("2026-08-01");
  await page.getByLabel("Fecha hasta").fill("2026-09-30");
  await page.locator(".catalog-filter").getByRole("button", { name: "Finalizados" }).click();
  await page.getByLabel("Ordenar viajes").selectOption("name-asc");

  await expect(cards).toHaveCount(1);
  await expect(cards.first().getByRole("heading", { name: "Volvemos a Buenos Aires" })).toBeVisible();
  await expect.poll(() => fixture.requests.some((request) => {
    if (!request.path.startsWith("/api/whither-journey?")) return false;
    const params = new URLSearchParams(request.path.split("?")[1]);
    return params.get("archived") === "false"
      && params.get("search") === "Buenos Aires"
      && params.get("destinationId") === "2"
      && params.get("from") === "2026-08-01"
      && params.get("to") === "2026-09-30"
      && params.get("status") === "FINISHED"
      && params.get("sort") === "name-asc";
  })).toBe(true);

  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Ver archivados" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator(".catalog-media-card__media img")).toBeVisible();
  await expect(cards.first().getByRole("heading", { name: "Un fin de semana en Buenos Aires" })).toBeVisible();
  await expect(cards.first().locator(".catalog-media-card__badge")).toContainText("ARCHIVADO");
});

test("important dates linked from a journey cover its complete date range", async ({ page }) => {
  const fixture = await journeyFixture(page, true);
  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByRole("button", { name: "Vincular fecha importante" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Rango del viaje")).toContainText("10 de ago de 2026");
  await expect(dialog.getByLabel("Rango del viaje")).toContainText("12 de ago de 2026");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Escapada compartida");
  await dialog.getByRole("button", { name: "Vincular fecha", exact: true }).click();
  const request = fixture.requests.find((item) => item.method === "POST" && item.path.endsWith("/dates"));
  expect(request?.body).toMatchObject({ date: "2026-08-10", endsOn: "2026-08-12", label: "Escapada compartida" });
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`organize a journey at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const fixture = await journeyFixture(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/app/whither-journey");
    await page
      .getByRole("button", { name: "Nuevo viaje", exact: true })
      .click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Nombre del viaje")
      .fill("Buenos Aires en pareja");
    await dialog
      .getByLabel("Fecha de inicio", { exact: true })
      .fill("2026-08-10");
    await dialog.getByLabel("Fecha de fin", { exact: true }).fill("2026-08-12");
    const stage = dialog.locator(".journey-stage-form").first();
    await stage.getByLabel("Lugar").fill("Buenos Aires");
    await expect(dialog.getByRole("button", { name: "Agregar otro destino" })).toHaveCount(0);
    await expect(dialog.locator('input[type="file"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "Guardar viaje" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Buenos Aires en pareja",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".journey-detail-cover img")).toHaveCount(0);
    await page.getByRole("button", { name: "Elegir portada", exact: true }).click();
    await page.getByRole("tab", { name: "Galería", exact: true }).click();
    const tripGallery = page.locator(".journey-gallery");
    await tripGallery.getByRole("button", { name: "Administrar fotos generales", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "portada.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64"),
    });
    await dialog.getByRole("button", { name: "Subir 1 foto", exact: true }).click();
    await expect(dialog.locator(".photo-manager__saved img")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await expect(page.locator(".journey-detail-cover img")).toBeVisible();
    expect(fixture.journeys.size).toBe(1);
    expect(fixture.requests.filter((request) =>
      request.method === "POST"
      && request.path.includes("/photos?purpose=TRIP")
      && request.contentType?.startsWith("multipart/form-data; boundary="),
    )).toHaveLength(1);
    expect(fixture.requests.some((request) =>
      request.method === "PUT" && /\/cover\/[0-9a-f-]+$/.test(request.path),
    )).toBeFalsy();
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    await expect(page.locator(".journey-day-picker input[type=date]")).toHaveCount(0);
    await expect(page.getByText(/10 de agosto de 2026/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Día anterior" })).toBeDisabled();
    await page.getByRole("button", { name: "Día siguiente" }).click();
    await expect(page.getByText(/11 de agosto de 2026/)).toBeVisible();
    await page.getByRole("button", { name: "Día anterior" }).click();
    await page
      .getByRole("button", { name: "Agregar punto", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tipo de punto").selectOption("TRANSFER");
    await dialog
      .getByLabel("Actividad", { exact: true })
      .fill("Paseo por San Telmo");
    await dialog.getByLabel("Hora", { exact: true }).fill("09:30");
    await dialog.getByLabel("Google Maps").fill("https://maps.google.com/?q=San+Telmo");
    await dialog.getByRole("button", { name: "Guardar punto" }).click();
    await expect(
      page.getByRole("heading", { name: "Paseo por San Telmo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tabpanel", { name: "Agenda" }).getByText("Traslado", { exact: true }),
    ).toBeVisible();
    await page.locator(".journey-point-overflow > summary").first().click();
    const maps = page.getByRole("link", { name: /Google Maps/ });
    await expect(maps).toHaveAttribute("href", /maps\.google\.com/);
    await expect(maps).toHaveClass(/button--primary/);
    await page
      .getByRole("button", { name: "Registrar gasto", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("combobox", { name: "Actividad", exact: true }),
    ).not.toHaveValue("");
    await dialog.getByLabel("Descripción").fill("Desayuno");
    await dialog.getByLabel("Importe").fill("1500.25");
    await dialog.getByLabel("Moneda").focus();
    await expect(dialog.getByLabel("Importe")).toHaveValue("1.500,25");
    await dialog.getByRole("button", { name: "Guardar movimiento" }).click();
    await page
      .getByRole("button", { name: "Marcar realizado", exact: true })
      .click();
    await expect(page.getByText("1 de 1 puntos realizados")).toBeVisible();
    await page.getByRole("button", { name: "Marcar pendiente", exact: true }).click();
    await expect(page.getByText("0 de 1 puntos realizados")).toBeVisible();
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar realizado", exact: true }).click();
    await page.locator(".journey-point-overflow > summary").first().click();
    await page
      .getByRole("button", { name: "Cancelar punto", exact: true })
      .click();
    await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Dinero", exact: true }).click();
    await expect(page.getByText("Desayuno", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Estadías", exact: true }).click();
    await page.getByRole("button", { name: "Agregar alojamiento" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre", { exact: true }).fill("Hotel del Centro");
    await dialog.getByLabel("Precio del alojamiento").fill("2200000.50");
    await dialog.getByLabel("Moneda").fill("USD");
    await dialog.getByLabel("Moneda").focus();
    await expect(dialog.getByLabel("Precio del alojamiento")).toHaveValue("2.200.000,50");
    await dialog.getByRole("button", { name: "Guardar alojamiento" }).click();
    await expect(
      page.getByRole("heading", { name: "Hotel del Centro" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Valijas", exact: true }).click();
    await page.getByLabel("Qué llevar", { exact: true }).fill("Pasaporte");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await page.getByRole("checkbox", { name: "Pasaporte" }).click();
    await expect(page.getByText("1 de 1 guardadas")).toBeVisible();
    await page.getByRole("tab", { name: "Archivos", exact: true }).click();
    await page
      .getByRole("button", { name: "Guardar archivo", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Archivo", { exact: true }).setInputFiles({
      name: "reserva.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 receipt"),
    });
    await dialog
      .getByRole("button", { name: "Guardar archivo", exact: true })
      .click();
    await page.getByRole("button", { name: "Vista previa" }).click();
    await expect(page.getByTitle("PDF: reserva.pdf")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Zoom", exact: true })
      .selectOption("150");
    await expect(page.getByTitle("PDF: reserva.pdf")).toHaveAttribute(
      "src",
      /zoom=150/,
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cerrar", exact: true })
      .click();
    expect(
      fixture.requests.find(
        (r) => r.method === "POST" && r.path.endsWith("/movements"),
      )?.body,
    ).toMatchObject({ amount: "1500.25" });
    expect(
      fixture.requests.find(
        (r) => r.method === "POST" && r.path.endsWith("/points"),
      )?.body,
    ).toMatchObject({ category: "TRANSFER" });
    expect(errors).toEqual([]);
    expect(
      fixture.requests.some(
        (r) => r.path === "/api/whither-journey" && r.method === "POST",
      ),
    ).toBeTruthy();
    await page.goto("/app/whither-journey");
    const tripCard = page.getByRole("link", {
      name: "Ver viaje Buenos Aires en pareja",
    });
    await expect(tripCard).toHaveClass(/catalog-media-card-link--journey/);
    await expect(
      tripCard.locator(".catalog-media-card--journey"),
    ).toHaveCSS("border-radius", "16px");
    expect(
      await tripCard.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--catalog-accent").trim(),
      ),
    ).toBe("#83d8f5");
    const measurements = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(measurements.scroll).toBeLessThanOrEqual(measurements.width + 2);
  });
}

test("review desktop and mobile, keyboard and reduced motion", async ({
  page,
}) => {
  await journeyFixture(page, true);
  await mkdir(".impeccable/review", { recursive: true });
  for (const [name, size] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(
      "/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    await expect(
      page.getByRole("heading", {
        name: "Un fin de semana en Buenos Aires",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".journey-detail-cover__image")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumen del día", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "La Cabrera", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    const fullWidth = await page.evaluate(() => {
      const page = document.querySelector(".journey-page")!;
      const stepper = document.querySelector(".journey-day-stepper")!;
      const overview = document.querySelector(".journey-overview")!;
      return {
        page: page.getBoundingClientRect().width,
        stepper: stepper.getBoundingClientRect().width,
        overview: overview.getBoundingClientRect().width,
      };
    });
    expect(fullWidth.stepper).toBeGreaterThan(fullWidth.page * 0.9);
    expect(fullWidth.overview).toBeGreaterThan(fullWidth.page * 0.9);
    await expect(page.getByRole("heading", { name: "Un día a la vez", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Agenda", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Galería", exact: true }),
    ).toBeFocused();
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    const firstPoint = page.locator(".journey-route__point").first();
    const menu = firstPoint.locator(".journey-point-overflow");
    await page.locator(".journey-point-overflow > summary").first().click();
    await expect(menu).toHaveAttribute("open", "");
    const pointLayout = await firstPoint.evaluate((point) => {
      const content = point.lastElementChild!;
      const actions = content.querySelector<HTMLElement>(".journey-actions--point")!;
      const link = actions.querySelector<HTMLElement>(".journey-action-link");
      const note = content.querySelector<HTMLElement>(".journey-point-note")!;
      return {
        point: point.getBoundingClientRect().width,
        content: content.getBoundingClientRect().width,
        actions: actions.getBoundingClientRect().width,
        link: link?.getBoundingClientRect().width ?? 0,
        note: note.getBoundingClientRect().width,
        openRowLayer: getComputedStyle(point).zIndex,
        nextRowLayer: getComputedStyle(point.nextElementSibling!).zIndex,
      };
    });
    expect(pointLayout.content).toBeGreaterThan(pointLayout.point * 0.8);
    expect(pointLayout.actions).toBeGreaterThan(pointLayout.content * 0.9);
    expect(pointLayout.link).toBeGreaterThan(0);
    expect(pointLayout.note).toBeGreaterThan(pointLayout.content * 0.9);
    expect(Number(pointLayout.openRowLayer)).toBeGreaterThan(Number(pointLayout.nextRowLayer));
    await firstPoint.locator(".journey-point-status-action").focus();
    await expect(menu).not.toHaveAttribute("open", "");
    await expect(page.locator(".journey-route__marker").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    for (const tab of ["Resumen", "Agenda", "Galería", "Archivos", "Estadías", "Valijas", "Dinero"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(2);
      await page.screenshot({
        path: `.impeccable/review/${name}${tab === "Agenda" ? "" : `-${tab}`}.png`,
        fullPage: true,
      });
    }

    await page
      .getByRole("button", { name: "Editar viaje", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: `.impeccable/review/${name}-form.png`,
      fullPage: true,
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cerrar", exact: true })
      .click();
  }
  for (const [name, size] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(size);
    await page.goto("/app/whither-journey");
    await expect(page.getByRole("heading", { name: "¿Adónde vamos?" })).toBeVisible();
    await page.screenshot({
      path: `.impeccable/review/${name}-catalog.png`,
      fullPage: true,
    });
  }
});

test("packing adds items to both partners, keeps unchecked first, and allows custom order", async ({ page }) => {
  const fixture = await journeyFixture(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByRole("tab", { name: "Valijas", exact: true }).click();

  const tomas = page.locator(".journey-packing > section").first();
  await expect(tomas.locator("li").first()).toContainText("Cargador del teléfono");
  await expect(tomas.locator("li").last()).toContainText("Pasaporte y documentos");
  const manage = tomas.locator(".journey-packing-item-manage").first();
  await expect(manage.getByRole("button", { name: "Editar" })).toHaveClass(/button--secondary/);
  await expect(manage.getByRole("button", { name: "Quitar" })).toHaveClass(/button--destructive/);

  await tomas.getByRole("checkbox", { name: "Cargador del teléfono" }).click();
  await expect(tomas.locator("li").last()).toContainText("Cargador del teléfono");

  await page.locator(".journey-packing-add select").selectOption("BOTH");
  await page.getByLabel("Qué llevar", { exact: true }).fill("Auriculares");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.locator(".journey-packing li", { hasText: "Auriculares" })).toHaveCount(2);
  expect(
    fixture.requests.some(
      (request) => request.method === "POST" && request.path.endsWith("/packing/both"),
    ),
  ).toBeTruthy();

  await page.locator(".journey-packing-add select").selectOption("1");
  await page.getByLabel("Qué llevar", { exact: true }).fill("Adaptador");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(tomas.getByText("Adaptador", { exact: false })).toBeVisible();
  await tomas.getByRole("button", { name: "Subir Adaptador" }).click();
  await expect.poll(async () => {
    const itemOrder = await tomas.locator("li").evaluateAll((rows) =>
      rows.map((row) => row.textContent ?? ""),
    );
    return itemOrder.findIndex((text) => text.includes("Adaptador"))
      < itemOrder.findIndex((text) => text.includes("Auriculares"));
  }).toBe(true);
  const orderRequest = fixture.requests.find(
    (request) => request.method === "PUT" && request.path.endsWith("/packing/order"),
  );
  expect(orderRequest?.body).toMatchObject({ userId: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(2);
});

test("journey form protects changed drafts and cannot close while saving", async ({
  page,
}) => {
  await journeyFixture(page, true);
  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByRole("button", { name: "Editar viaje", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del viaje").fill("Cambio pendiente");
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).last().click();
  await expect(
    page.getByRole("alertdialog", { name: "Descartar cambios" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Seguir editando" }).click();
  await expect(dialog.getByLabel("Nombre del viaje")).toHaveValue(
    "Cambio pendiente",
  );
  let finishSave: () => void = () => {};
  const saving = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  await page.route(
    "**/api/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    async (route) => {
      if (route.request().method() === "PUT") await saving;
      await route.fallback();
    },
  );
  try {
    await dialog.getByRole("button", { name: "Guardar viaje" }).click();
    await expect(
      dialog.getByRole("button", { name: "Cerrar", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
  } finally {
    finishSave();
  }
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Cambio pendiente", exact: true }),
  ).toBeVisible();
});

test("point types are shared settings and extra itinerary links get clear previews", async ({ page }) => {
  await mkdir(".impeccable/review", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await journeyFixture(page, true);
  await page.goto("/app/whither-journey/settings");
  await expect(page.getByRole("heading", { name: "Tipos de punto" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar tipo" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill("Compras");
  await dialog.getByLabel("Ícono").selectOption("SHOP");
  await dialog.getByRole("button", { name: "Guardar tipo" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Compras", exact: true })).toBeVisible();

  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByRole("tab", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Agregar punto", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vincular ficha existente").selectOption("FILM");
  await dialog.locator(".journey-point-link-editor select").nth(2).selectOption("7");
  await expect(dialog.locator(".journey-source-preview")).toContainText("Una película para compartir");
  await dialog.getByLabel("Experiencia vinculada").selectOption("9");
  await dialog.getByLabel("Tipo de punto").selectOption({ label: "Compras" });
  await dialog.getByLabel("Actividad", { exact: true }).fill("Noche de cine");
  await dialog.getByLabel("Notas", { exact: true }).fill("Anotar entradas y horario.");
  await dialog.getByLabel("Google Maps").fill("https://maps.google.com/?q=cinema");
  await dialog.getByRole("button", { name: "Agregar enlace" }).click();
  const action = dialog.locator(".journey-point-action-editor__row");
  await action.getByLabel("Nombre").fill("Reservar");
  await action.getByLabel("Ícono").selectOption("TICKET");
  await action.getByRole("textbox", { name: "Enlace" }).fill("https://example.com/reservar");
  await page.screenshot({ path: ".impeccable/review/mobile-point-editor.png" });
  await dialog.getByRole("button", { name: "Guardar punto" }).click();

  const point = page.locator(".journey-route__point").filter({ has: page.getByRole("heading", { name: "Noche de cine" }) });
  await point.locator(".journey-point-overflow > summary").click();
  await expect(point.getByRole("link", { name: /Abrir ficha/ })).toHaveClass(/journey-action-link/);
  await expect(point.getByRole("link", { name: /Reservar/ })).toHaveAttribute("href", "https://example.com/reservar");
  await expect(point.getByRole("link", { name: /Google Maps/ })).toHaveClass(/journey-map-action/);
  await expect(point.locator("details.journey-point-note")).not.toHaveAttribute("open", "");
  await point.locator(".journey-point-note > summary").click();
  await expect(point.getByText("Anotar entradas y horario.")).toBeVisible();
});

test("journey summary stays focused and gallery manages trip, daily and linked photos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await journeyFixture(page, true);
  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await expect(page.getByRole("heading", { name: "Resumen del día", exact: true })).toBeVisible();
  await expect(page.getByText("Nuestro aniversario", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Editar relato", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Relato compartido").fill("Nos quedamos con la caminata y la cena.");
  await dialog.getByRole("button", { name: "Guardar relato", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".journey-day-story")).toHaveText("Nos quedamos con la caminata y la cena.");

  await page.getByRole("button", { name: "Agregar mi reseña", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Comentario (opcional)").fill("La mejor caminata del viaje.");
  await dialog.getByRole("button", { name: "Guardar reseña", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".journey-day-review-list")).toContainText("La mejor caminata del viaje.");

  await page.getByRole("tab", { name: "Galería", exact: true }).click();
  const gallery = page.locator(".journey-gallery");
  await expect(page.getByRole("heading", { name: "Galería del viaje", exact: true })).toBeVisible();
  await expect(gallery).toContainText("1 propias · 1 vinculadas");
  await gallery.getByRole("tab", { name: "Ver foto 2", exact: true }).click();
  await expect(gallery).toContainText("Vinculada · WhereFood");
  await expect(gallery).toContainText("La Cabrera");
  await expect(gallery.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute("href", "/app/food/places/7");
  await gallery.getByRole("button", { name: "Administrar fotos del día", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "caminata.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64"),
  });
  await dialog.getByRole("button", { name: "Subir 1 foto", exact: true }).click();
  await expect(dialog.locator(".photo-manager__saved img")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).last().click();

  const tripGallery = page.locator(".journey-gallery");
  await tripGallery.getByRole("button", { name: "Administrar fotos generales", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Foto de portada", { exact: true })).toBeVisible();
  const photos = dialog.locator(".photo-manager__photo");
  await expect(photos).toHaveCount(1);
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "cena.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64"),
  });
  await dialog.getByRole("button", { name: "Subir 1 foto", exact: true }).click();
  await expect(photos).toHaveCount(2);
  await photos.nth(1).getByRole("button", { name: "Hacer portada", exact: true }).click();
  await expect(photos.nth(1).getByText("Foto de portada", { exact: true })).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(2);
});
