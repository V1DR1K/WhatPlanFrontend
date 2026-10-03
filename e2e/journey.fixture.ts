import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { City, Detail, Trip } from "../src/features/journey/journey";
type FixtureBody = Trip &
  City &
  Detail["points"][number] &
  Detail["stays"][number] &
  Detail["packing"][number] &
  Detail["movements"][number] & { cityId: number };
export async function journeyFixture(page: Page, rich = false) {
  const cities: City[] = [
    { id: 1, name: "Rosario", countryCode: "AR" },
    { id: 2, name: "Buenos Aires", countryCode: "AR" },
    { id: 3, name: "Montevideo", countryCode: "UY" },
  ];
  let origin = 1;
  const journeys = new Map<string, Detail>();
  const requests: { path: string; method: string; body: unknown }[] = [];
  const create = (input: Trip) => {
    const trip = {
      ...input,
      id: input.id ?? randomUUID(),
      archived: false,
      stages: input.stages.map((s, i) => ({
        ...s,
        id: s.id ?? randomUUID(),
        position: i,
        cityName: cities.find((c) => c.id === s.cityId)!.name,
        countryCode: cities.find((c) => c.id === s.cityId)!.countryCode,
      })),
    };
    const detail = {
      trip,
      points: [],
      stays: [],
      packing: [],
      movements: [],
      balances: [],
      stageBalances: [],
      reviews: [],
      files: [],
      members: [
        { id: 1, username: "tomas" },
        { id: 2, username: "avril" },
      ],
      dates: [],
    } as Detail;
    journeys.set(trip.id, detail);
    return detail;
  };
  if (rich) {
    const a = create({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Un fin de semana en Buenos Aires",
      startsOn: "2026-08-10",
      endsOn: "2026-08-12",
      stages: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          cityId: 2,
          startsOn: "2026-08-10",
          endsOn: "2026-08-12",
        },
      ],
    } as Trip);
    create({
      id: randomUUID(),
      name: "Volvemos a Buenos Aires",
      startsOn: "2026-09-10",
      endsOn: "2026-09-12",
      stages: [
        {
          id: randomUUID(),
          cityId: 2,
          startsOn: "2026-09-10",
          endsOn: "2026-09-12",
        },
      ],
    } as Trip);
    const stage = a.trip.stages[0].id;
    a.points = [
      {
        id: randomUUID(),
        stageId: stage,
        title: "Desayuno y paseo por San Telmo",
        scheduledOn: "2026-08-10",
        scheduledTime: "09:30:00",
        notes: "Caminar por el mercado y elegir un café para volver.",
        mapsUrl: "https://maps.google.com/",
        position: 0,
        status: "COMPLETED",
        source: null,
      },
      {
        id: randomUUID(),
        stageId: stage,
        title: "Una película al final del día",
        scheduledOn: "2026-08-10",
        scheduledTime: "21:00:00",
        notes: null,
        mapsUrl: null,
        position: 1,
        status: "PENDING",
        source: { section: "FILM", entityId: 7 },
      },
    ];
    a.packing = [
      {
        id: randomUUID(),
        userId: 1,
        description: "Pasaporte y documentos",
        quantity: 1,
        packed: true,
      },
      {
        id: randomUUID(),
        userId: 1,
        description: "Cargador del teléfono",
        quantity: 1,
        packed: false,
      },
      {
        id: randomUUID(),
        userId: 2,
        description: "Abrigo para la noche",
        quantity: 1,
        packed: true,
      },
    ];
    a.stays = [
      {
        id: randomUUID(),
        stageId: stage,
        name: "Hotel del Centro",
        startsOn: "2026-08-10",
        endsOn: "2026-08-12",
        address: "Av. de Mayo 1200",
        price: 220,
        currency: "USD",
        source: "Booking",
        bookingUrl: "https://example.com/reserva",
        mapsUrl: "https://maps.google.com/",
        photoId: null,
      },
    ];
    a.movements = [
      {
        id: randomUUID(),
        stageId: null,
        pointId: null,
        stayId: null,
        kind: "FUNDS",
        description: "Lo que llevamos",
        amount: 100000,
        currency: "ARS",
        occurredOn: "2026-08-10",
      },
      {
        id: randomUUID(),
        stageId: stage,
        pointId: a.points[0].id,
        stayId: null,
        kind: "EXPENSE",
        description: "Desayuno en el mercado",
        amount: 12000,
        currency: "ARS",
        occurredOn: "2026-08-10",
      },
      {
        id: randomUUID(),
        stageId: null,
        pointId: null,
        stayId: null,
        kind: "FUNDS",
        description: "Dólares para la estadía",
        amount: 300,
        currency: "USD",
        occurredOn: "2026-08-10",
      },
    ];
    a.reviews = [
      {
        id: randomUUID(),
        stayId: null,
        userId: 1,
        author: "tomas",
        rating: 5,
        comment: "Un viaje para volver a caminar juntos.",
      },
    ];
  }
  const totals = (d: Detail) => {
    const calc = (rows: Detail["movements"]) =>
      Array.from(new Set(rows.map((m) => m.currency)))
        .sort()
        .map((currency) => {
          const amount = (kind: string) =>
            rows
              .filter((m) => m.currency === currency && m.kind === kind)
              .reduce((t, m) => t + Number(m.amount), 0);
          const funds = amount("FUNDS"),
            expenses = amount("EXPENSE"),
            refunds = amount("REFUND");
          return {
            currency,
            funds,
            expenses,
            refunds,
            balance: funds - expenses + refunds,
          };
        });
    d.balances = calc(d.movements);
    d.stageBalances = Array.from(
      new Set(d.movements.map((m) => m.stageId)),
    ).map((stageId) => ({
      stageId,
      balances: calc(d.movements.filter((m) => m.stageId === stageId)),
    }));
  };
  await page.addInitScript(() =>
    localStorage.setItem(
      "wherefood.session",
      JSON.stringify({
        token: "ui-contract-test",
        username: "tomas",
        role: "USER",
      }),
    ),
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api", ""),
      method = req.method();
    let body = {} as FixtureBody;
    if (req.headers()["content-type"]?.includes("application/json"))
      body = req.postDataJSON();
    requests.push({ path: url.pathname + url.search, method, body });
    const reply = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    const context = () => ({
      coupleId: "00000000-0000-0000-0000-000000000001",
      originCityId: origin,
      maxUploadBytes: 10485760,
      options: [
        {
          key: "origin",
          cityId: origin,
          stageId: null,
          journeyId: null,
          label: cities.find((c) => c.id === origin)!.name + " · Origen",
        },
        ...Array.from(journeys.values())
          .filter((d) => !d.trip.archived)
          .flatMap((d) =>
            d.trip.stages.map((s) => ({
              key: s.id,
              cityId: s.cityId,
              stageId: s.id,
              journeyId: d.trip.id,
              label: `${s.cityName} · ${d.trip.name} · ${s.startsOn} / ${s.endsOn} · ${s.id.slice(0, 6)}`,
            })),
          ),
      ],
    });
    if (path === "/location-context") return reply(context());
    if (path === "/location-context/origin") {
      origin = body.cityId;
      return reply(context());
    }
    if (path === "/cities/countries")
      return reply([
        { code: "AR", name: "Argentina" },
        { code: "BR", name: "Brasil" },
        { code: "UY", name: "Uruguay" },
      ]);
    if (path === "/cities") {
      if (method === "GET")
        return reply(
          cities.filter(
            (c) =>
              !url.searchParams.get("countryCode") ||
              c.countryCode === url.searchParams.get("countryCode"),
          ),
        );
      let c = cities.find(
        (c) =>
          c.name.toLowerCase() === body.name.toLowerCase() &&
          c.countryCode === body.countryCode,
      );
      if (!c) {
        c = { id: cities.length + 1, ...body };
        cities.push(c!);
      }
      return reply(c);
    }
    if (/^\/cities\/\d+$/.test(path))
      return reply(cities.find((c) => c.id === Number(path.split("/").pop())));
    if (path === "/special-dates") return reply([]);
    if (path === "/whither-journey") {
      if (method === "POST") return reply(create(body).trip, 201);
      return reply(Array.from(journeys.values()).map((d) => d.trip));
    }
    if (path.startsWith("/whither-journey/catalog/"))
      return reply([
        {
          section: path.split("/").pop(),
          entityId: 7,
          title: "Una película para compartir",
          cityId: 1,
          href: "/app/films/7",
        },
      ]);
    if (path.startsWith("/whither-journey/experiences/"))
      return reply([{ id: 9, date: "2026-08-10", cityId: 2, stageId: null }]);
    const content = /^\/whither-journey\/files\/([^/]+)\/content$/.exec(path);
    if (content)
      return route.fulfill({
        contentType: "application/pdf",
        body: Buffer.from(
          "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 /Kids [] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF",
        ),
      });
    const match =
      /^\/whither-journey\/([^/]+)(?:\/(points|stays|packing|movements|reviews|files|dates|archive))?(?:\/([^/]+))?$/.exec(
        path,
      );
    if (match) {
      const d = journeys.get(match[1]);
      if (d) {
        if (!match[2]) {
          if (method === "PUT") {
            d.trip = {
              ...d.trip,
              ...body,
              stages: body.stages.map((stage, position) => {
                const city = cities.find((c) => c.id === stage.cityId)!;
                return {
                  ...stage,
                  id: stage.id ?? randomUUID(),
                  position,
                  cityName: city.name,
                  countryCode: city.countryCode,
                };
              }),
            };
            return reply(d.trip);
          }
          totals(d);
          return reply(d);
        }
        const resource = match[2];
        if (resource === "archive") {
          d.trip.archived = true;
          return route.fulfill({ status: 204 });
        }
        if (resource === "dates") {
          const date = {
            specialDateId: 1,
            label: body.label,
            date: body.date,
            stageId: body.stageId,
          };
          d.dates.push(date);
          return reply(date);
        }
        if (resource === "reviews") {
          const r = {
            id: randomUUID(),
            userId: 1,
            author: "tomas",
            ...body,
            stayId: body.stayId ?? null,
          };
          d.reviews = d.reviews.filter(
            (r) => r.userId !== 1 || r.stayId !== body.stayId,
          );
          d.reviews.push(r);
          return reply(r);
        }
        if (resource === "files") {
          const f = {
            id: randomUUID(),
            name: "reserva.pdf",
            contentType: "application/pdf",
            byteSize: 150,
            stageId: null,
            pointId: null,
            stayId: null,
            movementId: null,
            url: "",
          };
          f.url = `/whither-journey/files/${f.id}/content`;
          d.files.push(f);
          return reply(f);
        }
        if (match[3] === "order") return route.fulfill({ status: 204 });
        const rows = d[
          resource as "points" | "stays" | "packing" | "movements"
        ] as (
          | Detail["points"][number]
          | Detail["stays"][number]
          | Detail["packing"][number]
          | Detail["movements"][number]
        )[];
        const entity = { id: match[3] ?? randomUUID(), ...body };
        const index = rows.findIndex((v) => v.id === entity.id);
        if (index < 0) rows.push(entity);
        else rows[index] = entity;
        return reply(entity);
      }
    }
    return reply({ content: [], nextCursor: null });
  });
  return { journeys, requests };
}
