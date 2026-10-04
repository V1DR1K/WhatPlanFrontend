import { test, expect } from "@playwright/test";
import { journeyFixture } from "./journey.fixture";
import { mkdir } from "node:fs/promises";

test("dashboard presents Whither Journey first", async ({ page }) => {
  await journeyFixture(page);
  await page.goto("/app");
  await expect(page.locator(".module-picker > a").first()).toHaveAttribute(
    "href",
    "/app/whither-journey",
  );
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
      .fill("Buenos Aires y Montevideo");
    await dialog
      .getByLabel("Fecha de inicio", { exact: true })
      .fill("2026-08-10");
    await dialog.getByLabel("Fecha de fin", { exact: true }).fill("2026-08-12");
    let stage = dialog.locator(".journey-stage-form").first();
    await stage.getByLabel("Lugar").fill("Buenos Aires");
    await stage.getByLabel("Llegada").fill("2026-08-10");
    await stage.getByLabel("Salida").fill("2026-08-11");
    await dialog.getByRole("button", { name: "Agregar otro destino" }).click();
    stage = dialog.locator(".journey-stage-form").nth(1);
    await stage.getByLabel("País").selectOption("UY");
    await stage.getByLabel("Lugar").fill("Montevideo");
    await stage.getByLabel("Llegada").fill("2026-08-12");
    await stage.getByLabel("Salida").fill("2026-08-12");
    await dialog.getByRole("button", { name: "Guardar viaje" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Buenos Aires y Montevideo",
        exact: true,
      }),
    ).toBeVisible();
    expect(fixture.journeys.size).toBe(1);
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
    await expect(page.getByText("Traslado", { exact: true })).toBeVisible();
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
    await page.getByRole("button", { name: "Volver a pendiente", exact: true }).click();
    await expect(page.getByText("0 de 1 puntos realizados")).toBeVisible();
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar realizado", exact: true }).click();
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
      name: "Ver viaje Buenos Aires y Montevideo",
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
    await expect(page.locator(".journey-detail-hero.has-cover img")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumen del día", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "La Cabrera", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Agenda", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Archivos", exact: true }),
    ).toBeFocused();
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    await expect(page.locator(".journey-route__marker").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    for (const tab of ["Resumen", "Agenda", "Archivos", "Estadías", "Valijas", "Dinero"]) {
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

test("daily summary saves a shared story, personal review, day photo and cover", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await journeyFixture(page, true);
  await page.goto("/app/whither-journey/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await expect(page.getByRole("heading", { name: "Resumen del día", exact: true })).toBeVisible();
  await expect(page.getByText("Nuestro aniversario", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Editar relato", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Relato compartido").fill("Nos quedamos con la caminata y la cena.");
  await dialog.getByRole("button", { name: "Guardar relato", exact: true }).click();
  await expect(page.getByText("Nos quedamos con la caminata y la cena.")).toBeVisible();

  await page.getByRole("button", { name: "Agregar mi reseña", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Comentario (opcional)").fill("La mejor caminata del viaje.");
  await dialog.getByRole("button", { name: "Guardar reseña", exact: true }).click();
  await expect(page.getByText("La mejor caminata del viaje.")).toBeVisible();

  const dayGallery = page.locator(".journey-day-photos");
  await dayGallery.getByRole("button", { name: "Administrar fotos", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "caminata.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64"),
  });
  await dialog.getByRole("button", { name: "Subir 1 foto", exact: true }).click();
  await expect(dialog.locator(".photo-manager__saved img")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).last().click();

  const tripGallery = page.locator(".journey-trip-gallery");
  await tripGallery.getByRole("button", { name: "Administrar fotos", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Foto de portada", { exact: true })).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "cena.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64"),
  });
  await dialog.getByRole("button", { name: "Subir 1 foto", exact: true }).click();
  const photos = dialog.locator(".photo-manager__photo");
  await expect(photos).toHaveCount(2);
  await photos.nth(1).getByRole("button", { name: "Hacer portada", exact: true }).click();
  await expect(photos.nth(1).getByText("Foto de portada", { exact: true })).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(2);
});
