import { expect, test } from '@playwright/test';

for (const [kind, width, height, noScroll] of [
  ['real-review', 1366, 768, true],
  ['real-review', 900, 768, true],
  ['real-venue-review', 1366, 768, true],
  ['real-place', 1366, 768, false],
  ['real-place', 1440, 900, false],
  ['real-review', 390, 844, false],
  ['real-review', 320, 568, false],
  ['real-place', 390, 844, false],
  ['real-place', 320, 568, false],
] as const) {
  test(`${kind} keeps its controls inside the dialog at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/e2e/modal-preview.html?kind=${kind}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const measurements = await dialog.evaluate((element) => {
      const content = element.querySelector<HTMLElement>('.modal__content')!;
      const contentRect = content.getBoundingClientRect();
      const controls = [...element.querySelectorAll<HTMLElement>('.score-field, .star-control--input, .place-score-input, .tag-picker, .modal-form__actions')];
      const escaping = controls.filter((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left < contentRect.left - 2 || rect.right > contentRect.right + 2;
      }).map((control) => control.className);
      const nestedOverflow = [...element.querySelectorAll<HTMLElement>('.tag-options')].map((list) => list.scrollHeight - list.clientHeight);
      return { horizontalOverflow: content.scrollWidth - content.clientWidth, verticalOverflow: content.scrollHeight - content.clientHeight, nestedOverflow, escaping };
    });
    expect(measurements.horizontalOverflow).toBeLessThanOrEqual(2);
    expect(measurements.escaping).toEqual([]);
    expect(measurements.nestedOverflow.every((amount) => amount <= 2)).toBe(true);
    if (noScroll) expect(measurements.verticalOverflow).toBeLessThanOrEqual(2);
    const save = dialog.getByRole('button', { name: kind === 'real-place' ? 'Guardar lugar' : kind === 'real-venue-review' ? 'Guardar opinión del lugar' : 'Guardar reseña' });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeVisible();
    const [saveBox, visibleContent] = await Promise.all([save.boundingBox(), dialog.locator('.modal__content').boundingBox()]);
    expect(saveBox && visibleContent && saveBox.y >= visibleContent.y && saveBox.y + saveBox.height <= visibleContent.y + visibleContent.height).toBe(true);
  });
}

for (const kind of ['viewer', 'viewer-portrait', 'viewer-square', 'viewer-panorama'] as const) {
  test(`${kind} fits every edge of the photo on desktop`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/e2e/modal-preview.html?kind=${kind}`);
    const photo = page.locator('.photo-viewer__image');
    await expect(photo).toBeVisible();
    const fitted = async () => {
      await expect.poll(async () => photo.evaluate((element) => {
        const image = element as HTMLImageElement;
        const box = image.getBoundingClientRect();
        const frame = image.closest('.photo-viewer__stage')!.getBoundingClientRect();
        return image.naturalWidth > 0 &&
          box.left >= frame.left - 1 && box.top >= frame.top - 1 &&
          box.right <= frame.right + 1 && box.bottom <= frame.bottom + 1 &&
          Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight) < 0.02;
      })).toBe(true);
    };
    await fitted();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await page.getByRole('button', { name: 'Ajustar' }).click();
    await fitted();
    await page.setViewportSize({ width: 900, height: 600 });
    await fitted();
    await page.getByRole('button', { name: 'Imagen siguiente' }).click();
    await fitted();
  });
}

for (const [kind, width, height, noScroll] of [
  ['review', 1366, 768, true],
  ['review', 1440, 900, true],
  ['recipe', 1440, 900, true],
  ['review', 390, 844, true],
  ['review', 320, 568, false],
  ['review', 844, 390, false],
  ['review', 390, 500, false],
] as const) {
  test(`${kind} modal fits ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/e2e/modal-preview.html?kind=${kind}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Cerrar' });
    await expect.poll(async () => {
      const box = await dialog.boundingBox();
      return box ? box.y + box.height : Number.POSITIVE_INFINITY;
    }).toBeLessThanOrEqual(height + 1);
    const dialogBox = await dialog.boundingBox();
    const closeBox = await close.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(closeBox).not.toBeNull();
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(height + 1);
    expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(width);
    expect(closeBox!.y).toBeGreaterThanOrEqual(0);
    const overflow = await dialog.locator('.modal__content').evaluate((element) => element.scrollHeight - element.clientHeight);
    if (noScroll) expect(overflow).toBeLessThanOrEqual(2);
    await expect(dialog.getByRole('button', { name: 'Guardar' })).toBeVisible();
  });
}

test('long content scrolls and leaves actions reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/e2e/modal-preview.html?kind=recipe');
  await page.getByRole('button', { name: 'Agregar ingredientes' }).click();
  const overflow = await page.locator('.modal__content').evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(overflow).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();
});

test('closing a dirty form protects changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/modal-preview.html?kind=review');
  await page.getByRole('textbox', { name: 'Comentario' }).fill('Cambio sin guardar');
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Descartar cambios' })).toBeVisible();
  const discardBackdrop = page.locator('.modal-discard-backdrop');
  const viewport = page.viewportSize();
  await expect.poll(async () => {
    const box = await discardBackdrop.boundingBox();
    return box && viewport ? [box.x, box.y, box.width, box.height] : [];
  }).toEqual([0, 0, viewport!.width, viewport!.height]);
  await expect(page.locator('.modal-discard-backdrop')).toHaveCSS('position', 'fixed');
  await page.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Escape closes only the top confirmation dialog', async ({ page }) => {
  await page.goto('/e2e/modal-preview.html?kind=stack');
  await page.getByRole('button', { name: 'Borrar visita' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Borrar visita' })).toBeFocused();
});

test('photo manager opens the shared viewer and returns focus to the preview', async ({ page }) => {
  await page.goto('/e2e/modal-preview.html?kind=manager');
  await page.getByRole('button', { name: 'Administrar fotos' }).click();
  const preview = page.getByRole('button', { name: 'Ampliar foto 1 de la visita' });
  await preview.click();
  await expect(page.getByRole('dialog')).toHaveCount(2);
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(preview).toBeFocused();
});

test('viewer zooms, pans, navigates, resets, and closes by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/e2e/modal-preview.html?kind=viewer');
  await page.getByRole('button', { name: 'Acercar' }).click();
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('125%');
  await page.locator('.photo-viewer__stage').hover();
  await page.mouse.wheel(0, -100);
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('150%');
  for (let count = 0; count < 2; count++) await page.getByRole('button', { name: 'Acercar' }).click();
  const stage = await page.locator('.photo-viewer__stage').boundingBox();
  expect(stage).not.toBeNull();
  await page.mouse.move(stage!.x + stage!.width / 2, stage!.y + stage!.height / 2);
  await page.mouse.down();
  await page.mouse.move(stage!.x + stage!.width / 2 + 75, stage!.y + stage!.height / 2 + 35, { steps: 5 });
  await page.mouse.up();
  const transform = await page.locator('.photo-viewer__image').evaluate((element) => (element as HTMLElement).style.transform);
  expect(transform).not.toContain('translate(0px, 0px)');
  await page.getByRole('button', { name: 'Imagen siguiente' }).click();
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('100%');
  await expect(page.locator('.photo-viewer__count')).toHaveText('2 de 2');
  await page.keyboard.press('+');
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('125%');
  await page.keyboard.press('0');
  await expect(page.locator('.photo-viewer__zoom output')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('viewer controls stay reachable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/e2e/modal-preview.html?kind=viewer');
  for (const name of ['Cerrar', 'Alejar', 'Acercar', 'Ajustar', 'Imagen anterior', 'Imagen siguiente']) {
    const control = page.getByRole('button', { name });
    const box = await control.boundingBox();
    expect(box, `${name} has a visible box`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  }
});

test('mobile pinch zooms the image', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/e2e/modal-preview.html?kind=viewer');
  const stage = await page.locator('.photo-viewer__stage').boundingBox();
  expect(stage).not.toBeNull();
  const client = await context.newCDPSession(page);
  const x = stage!.x + stage!.width / 2;
  const y = stage!.y + stage!.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 95, y, id: 1 }, { x: x + 95, y, id: 2 }] });
  await expect.poll(async () => Number.parseInt(await page.locator('.photo-viewer__zoom output').textContent() ?? '0')).toBeGreaterThan(100);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByRole('button', { name: 'Ajustar' }).click();
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 85, y, id: 3 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 85, y, id: 3 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.photo-viewer__count')).toHaveText('2 de 2');
  await context.close();
});
