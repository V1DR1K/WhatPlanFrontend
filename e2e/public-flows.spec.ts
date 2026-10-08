import { expect, test, type Page, type Route } from '@playwright/test';

const activeCouple = {
  id: 'a1f13b58-879e-4380-b2f9-239be44d94f8',
  status: 'ACTIVE',
  members: [
    { id: 1, userId: 10, displayName: 'Alex', username: 'alex', current: true },
    { id: 2, userId: 11, displayName: 'Sam', username: 'sam', current: false },
  ],
};
const activeLocationContext = {
  coupleId: activeCouple.id,
  originCityId: 1,
  maxUploadBytes: 10_485_760,
  options: [{ key: 'origin', cityId: 1, stageId: null, journeyId: null, label: 'Rosario · Origen' }],
  members: activeCouple.members.map(({ username, displayName }) => ({ username, displayName })),
  homeLabels: [{ home: 'TOMAS', displayName: 'Alex' }, { home: 'AVRIL', displayName: 'Sam' }],
};

async function mockApi(page: Page, overrides: Record<string, (route: Route) => Promise<void>> = {}) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const override = overrides[`${request.method()} ${url.pathname}`];
    if (override) return override(route);

    if (url.pathname === '/api/auth/refresh') {
      return route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{"title":"Sesión ausente"}' });
    }
    if (url.pathname === '/api/auth/login') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'e2e-only-token', username: 'new-member', role: 'USER' }),
      });
    }
    if (url.pathname === '/api/couple') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeCouple) });
    }
    if (url.pathname === '/api/location-context') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeLocationContext) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test('login form exposes labels, supports keyboard use, and announces rejected credentials', async ({ page }) => {
  await mockApi(page, {
    'POST /api/auth/login': (route) => route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Credenciales incorrectas', status: 401, errorCode: 'UNAUTHORIZED' }),
    }),
  });

  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/login');

  const username = page.getByLabel('Usuario');
  const password = page.getByLabel('Contraseña');
  await expect(username).toBeVisible();
  await expect(password).toHaveAttribute('type', 'password');
  await page.keyboard.press('Tab');
  await expect(username).toBeFocused();
  await username.fill('wrong-user');
  await password.fill('wrong-password');
  await password.press('Enter');

  await expect(page.getByRole('alert')).toHaveText('Credenciales incorrectas');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('invitation fragment survives login, is removed from the URL, and accepts into the active couple', async ({ page }) => {
  const token = 'A'.repeat(43);
  let acceptedToken: unknown;
  await mockApi(page, {
    'POST /api/couple/invitations/accept': async (route) => {
      acceptedToken = route.request().postDataJSON().token;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeCouple) });
    },
  });

  await page.goto(`/invite#invite=${token}`);
  await expect(page).toHaveURL(/\/invite$/);
  await expect(page.getByRole('heading', { name: /Sumate a su WhatPlan/ })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Usuario').fill('new-member');
  await page.getByLabel('Contraseña', { exact: true }).fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();

  await expect(page.getByRole('heading', { name: /Te invitaron a un espacio compartido/ })).toBeVisible();
  expect(new URL(page.url()).href).not.toContain(token);
  await page.getByRole('button', { name: 'Aceptar invitación' }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /Hola Alex y Sam/ })).toBeVisible();
  expect(acceptedToken).toBe(token);
  expect(new URL(page.url()).href).not.toContain(token);
});

test('rate-limited login announces the service response without losing the form', async ({ page }) => {
  await mockApi(page, {
    'POST /api/auth/login': (route) => route.fulfill({
      status: 429,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Esperá un momento antes de volver a intentar', status: 429, errorCode: 'RATE_LIMITED' }),
    }),
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('new-member');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();

  await expect(page.getByRole('alert')).toHaveText('Esperá un momento antes de volver a intentar');
  await expect(page.getByLabel('Usuario')).toBeVisible();
});

test('registration validates matching credentials and opens the no-couple onboarding', async ({ page }) => {
  let submittedUsername = '';
  await mockApi(page, {
    'POST /api/auth/register': async (route) => {
      submittedUsername = route.request().postDataJSON().username;
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        accessToken: 'e2e-registration-token', username: submittedUsername, role: 'USER',
      }) });
    },
    'GET /api/couple': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: null, status: 'NONE', members: [] }),
    }),
    'GET /api/location-context': (route) => route.fulfill({
      status: 403,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Necesitás una pareja activa' }),
    }),
  });

  await page.goto('/register');
  await page.getByLabel('Usuario').fill('New.User');
  await page.getByLabel('Contraseña', { exact: true }).fill('temporary-password');
  await page.getByLabel('Repetí la contraseña').fill('different-password');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');

  await page.getByLabel('Repetí la contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Armen su pareja' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear pareja' })).toBeVisible();
  expect(submittedUsername).toBe('new.user');
  expect(await page.evaluate(() => Object.values(localStorage).some((value) => value.includes('e2e-registration-token')))).toBe(false);
});

test('Tomás admin sees the panel for couples, users, and audit history', async ({ page }) => {
  const coupleId = 'e20b1b64-cc9e-4d82-a332-e1b6282b7425';
  const adminCouple = {
    id: coupleId, status: 'ACTIVE', originCityId: 1, createdBy: 'tomas',
    createdAt: '2026-01-01T00:00:00Z', closedAt: null,
    members: [
      { membershipId: 1, userId: 1, username: 'tomas', displayName: 'Tomás', slot: 1, status: 'ACTIVE', joinedAt: '2026-01-01T00:00:00Z', leftAt: null },
      { membershipId: 2, userId: 2, username: 'avril', displayName: 'Avril', slot: 2, status: 'ACTIVE', joinedAt: '2026-01-01T00:00:00Z', leftAt: null },
    ],
  };
  await mockApi(page, {
    'POST /api/auth/login': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'e2e-admin-token', username: 'tomas', role: 'ADMIN' }),
    }),
    'GET /api/admin/overview': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: 2, couples: 1, activeCouples: 1, pendingCouples: 0, closedCouples: 0, activeMembers: 2 }),
    }),
    'GET /api/admin/couples': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([adminCouple]),
    }),
    [`GET /api/admin/couples/${coupleId}`]: (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminCouple),
    }),
    'GET /api/admin/users': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, username: 'tomas', role: 'ADMIN', createdAt: '2026-01-01T00:00:00Z', coupleId, coupleStatus: 'ACTIVE' },
        { id: 2, username: 'avril', role: 'USER', createdAt: '2026-01-01T00:00:00Z', coupleId, coupleStatus: 'ACTIVE' },
      ]),
    }),
    'GET /api/admin/audit': (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: (() => {
        const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? '0');
        const entry = pageNumber === 0
          ? { id: 7, actorUserId: 1, actorUsername: 'tomas', coupleId, action: 'COUPLE_CREATED', method: 'POST', path: '/api/admin/couples', status: 201, occurredAt: '2026-01-01T00:00:00Z' }
          : { id: 6, actorUserId: 1, actorUsername: 'tomas', coupleId, action: 'API_MUTATION', method: 'PATCH', path: '/api/places/{id}', status: 200, occurredAt: '2025-12-31T00:00:00Z' };
        return JSON.stringify({ entries: [entry], total: 51, page: pageNumber, limit: 50, totalPages: 2 });
      })(),
    }),
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('tomas');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  const adminLink = page.getByRole('link', { name: 'Panel administrativo' });
  await expect(adminLink).toBeVisible();
  await adminLink.click();
  await expect(page).toHaveURL(/\/app\/admin$/);
  await expect(page.getByRole('heading', { name: 'Panel administrativo' })).toBeVisible();
  await expect(page.getByText('Tomás y Avril')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: /Usuarios/ }).click();
  await expect(page.getByText('tomas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Auditoría/ }).click();
  await expect(page.getByText(/Pareja creada/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente →' }).click();
  await expect(page.getByText(/Cambio en datos/)).toBeVisible();
  await page.getByRole('button', { name: '← Anterior' }).click();
  await page.getByRole('button', { name: /Parejas/ }).click();
  await page.getByRole('button', { name: 'Administrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de la pareja' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Auditoría/ }).click();
  await expect(page.getByRole('navigation', { name: 'Paginación de auditoría de la pareja' })).toBeVisible();
  await page.getByRole('button', { name: /Dónde comemos/ }).click();
  await expect(page).toHaveURL(/\/app\/food$/);
});

test('expired private media session clears the private screen and returns to login', async ({ page }) => {
  let protectedMediaRequests = 0;
  await mockApi(page, {
    'GET /api/places': (route) => {
      const status = new URL(route.request().url()).searchParams.get('status');
      const content = status === 'PENDING' ? [{
        id: 101,
        name: 'Private place awaiting media',
        address: '',
        acceptsReservations: false,
        status: 'PENDING',
        category: { id: 1, name: 'Prueba', slug: 'prueba', icon: '🍽️', active: true },
        tags: [],
        author: 'new-member',
        rating: 0,
        tasteAverage: 0,
        priceAverage: 0,
        venueAverage: 0,
        itemCount: 0,
        photoUrl: '/api/places/101/photo',
        reviews: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content, nextCursor: null }) });
    },
    'GET /api/places/101/photo': (route) => {
      protectedMediaRequests += 1;
      expect(route.request().headers().authorization).toBe('Bearer e2e-only-token');
      return route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Sesión vencida', status: 401, errorCode: 'UNAUTHORIZED' }),
      });
    },
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('new-member');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await page.getByRole('link', { name: /Guarden cada lugar y opinión/ }).click();
  const placePhoto = page.getByRole('img', { name: 'Foto de Private place awaiting media' });
  await placePhoto.scrollIntoViewIfNeeded();
  await page.waitForRequest((request) => request.url().includes('/api/places/101/photo'));
  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  expect(protectedMediaRequests).toBe(1);
  await expect(page.getByLabel('Usuario')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver detalle de Private place awaiting media' })).toHaveCount(0);
});

test('logout clears the in-memory session and returns to the login screen', async ({ page }) => {
  await mockApi(page, {
    'POST /api/auth/logout': (route) => route.fulfill({ status: 204 }),
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('new-member');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await expect(page.getByRole('heading', { name: /Hola Alex y Sam/ })).toBeVisible();
  expect(await page.evaluate(() => Object.values(localStorage).some((value) => value.includes('e2e-only-token')))).toBe(false);

  await page.getByRole('button', { name: 'Cerrar sesión de new-member' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Usuario')).toBeVisible();
});

test('switching accounts in the same tab does not expose the previous account catalog', async ({ page }) => {
  let authenticatedUsername = '';
  const makePlace = (name: string, id: number) => ({
    id,
    name,
    address: '',
    acceptsReservations: false,
    status: 'PENDING',
    category: { id: 1, name: 'Prueba', slug: 'prueba', icon: '🍽️', active: true },
    tags: [],
    author: authenticatedUsername,
    rating: 0,
    tasteAverage: 0,
    priceAverage: 0,
    venueAverage: 0,
    itemCount: 0,
    reviews: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
  await mockApi(page, {
    'POST /api/auth/login': async (route) => {
      authenticatedUsername = route.request().postDataJSON().username;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: `e2e-${authenticatedUsername}`, username: authenticatedUsername, role: 'USER' }),
      });
    },
    'GET /api/places': (route) => {
      const status = new URL(route.request().url()).searchParams.get('status');
      const content = status === 'PENDING'
        ? [makePlace(`Private plan ${authenticatedUsername}`, authenticatedUsername === 'alice' ? 101 : 202)]
        : [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content, nextCursor: null }),
      });
    },
    'POST /api/auth/logout': (route) => route.fulfill({ status: 204 }),
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('alice');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await page.getByRole('link', { name: /Guarden cada lugar y opinión/ }).click();
  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan alice' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión de alice' }).click();
  await page.getByLabel('Usuario').fill('bob');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await page.getByRole('link', { name: /Guarden cada lugar y opinión/ }).click();

  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan bob' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan alice' })).toHaveCount(0);
});

test('late private media response from the previous account stays out of the next session', async ({ page }) => {
  await page.addInitScript(() => {
    const windowWithMediaCounter = window as Window & { __createdBlobUrls: number };
    windowWithMediaCounter.__createdBlobUrls = 0;
    const createObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      windowWithMediaCounter.__createdBlobUrls += 1;
      return createObjectUrl(object);
    };
  });
  let authenticatedUsername = '';
  let releasePhotoResponse: (() => void) | undefined;
  let markPhotoRequested: (() => void) | undefined;
  const photoRequested = new Promise<void>((resolve) => { markPhotoRequested = resolve; });
  const makePlace = (name: string, id: number, withPhoto: boolean) => ({
    id,
    name,
    address: '',
    acceptsReservations: false,
    status: 'PENDING',
    category: { id: 1, name: 'Prueba', slug: 'prueba', icon: '🍽️', active: true },
    tags: [],
    author: authenticatedUsername,
    rating: 0,
    tasteAverage: 0,
    priceAverage: 0,
    venueAverage: 0,
    itemCount: 0,
    ...(withPhoto ? { photoUrl: `/api/places/${id}/photo` } : {}),
    reviews: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  await mockApi(page, {
    'POST /api/auth/login': (route) => {
      authenticatedUsername = route.request().postDataJSON().username;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: `e2e-${authenticatedUsername}`, username: authenticatedUsername, role: 'USER' }),
      });
    },
    'GET /api/places': (route) => {
      const status = new URL(route.request().url()).searchParams.get('status');
      const content = status === 'PENDING'
        ? [makePlace(`Private plan ${authenticatedUsername}`, authenticatedUsername === 'alice' ? 101 : 202, authenticatedUsername === 'alice')]
        : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content, nextCursor: null }) });
    },
    'GET /api/places/101/photo': async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer e2e-alice');
      markPhotoRequested?.();
      await new Promise<void>((resolve) => { releasePhotoResponse = resolve; });
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n8AAAAASUVORK5CYII=', 'base64'),
      });
    },
    'POST /api/auth/logout': (route) => route.fulfill({ status: 204 }),
  });

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('alice');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await page.getByRole('link', { name: /Guarden cada lugar y opinión/ }).click();
  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan alice' })).toBeVisible();
  await page.getByRole('img', { name: 'Foto de Private plan alice' }).scrollIntoViewIfNeeded();
  await photoRequested;

  await page.getByRole('button', { name: 'Cerrar sesión de alice' }).click();
  await expect(page.getByLabel('Usuario')).toBeVisible();
  await page.getByLabel('Usuario').fill('bob');
  await page.getByLabel('Contraseña').fill('temporary-password');
  await page.getByRole('button', { name: 'Entrar a elegir' }).click();
  await page.getByRole('link', { name: /Guarden cada lugar y opinión/ }).click();
  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan bob' })).toBeVisible();

  const latePhotoResponse = page.waitForResponse((response) => response.url().includes('/api/places/101/photo') && response.status() === 200);
  releasePhotoResponse?.();
  await latePhotoResponse;
  await expect(page.getByRole('link', { name: 'Ver detalle de Private plan alice' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Foto de Private plan alice' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __createdBlobUrls: number }).__createdBlobUrls)).toBe(0);
});
