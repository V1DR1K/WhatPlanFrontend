import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { City, Detail, JourneyDay, JourneyDayIndex, JourneyFile, JourneyPointType, Trip } from "../src/features/journey/journey";
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
  const dayDetails = new Map<string, JourneyDay>();
  const requests: { path: string; method: string; body: unknown; contentType?: string }[] = [];
  const pointTypes: JourneyPointType[] = [
    { code: "GENERAL", name: "Actividad", icon: "ACTIVITY", color: "#B9DCE9", position: 0, builtIn: true },
    { code: "FOOD", name: "WhereFood", icon: "FOOD", color: "#FF8A00", position: 1, builtIn: true },
    { code: "FILM", name: "WhichMovie", icon: "FILM", color: "#B8ADFF", position: 2, builtIn: true },
    { code: "COOK", name: "WhoCook", icon: "COOK", color: "#D4EF55", position: 3, builtIn: true },
    { code: "FUN", name: "WhyFun", icon: "FUN", color: "#FFD166", position: 4, builtIn: true },
    { code: "TRANSFER", name: "Traslado", icon: "TRANSFER", color: "#83D8F5", position: 5, builtIn: true },
  ];
  const create = (input: Trip) => {
    const trip = {
      ...input,
      id: input.id ?? randomUUID(),
      archived: false,
      coverPhotoId: input.coverPhotoId ?? null,
      coverPhotoUrl: input.coverPhotoUrl ?? null,
      maxTripPhotos: input.maxTripPhotos ?? 20,
      maxDayPhotos: input.maxDayPhotos ?? 10,
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
    const firstDay = trip.startsOn;
    dayDetails.set(`${trip.id}:${firstDay}`, {
      date: firstDay,
      story: rich ? "Empezamos el viaje caminando juntos por San Telmo." : null,
      entries: rich ? [{
        id: "FOOD:9", section: "FOOD", date: firstDay, title: "La Cabrera",
        detail: "Parrilla · Palermo", href: "/app/food/places/7", photos: [],
      }] : [],
      specialDates: rich ? [{ id: 1, label: "Nuestro aniversario", recurrence: "ANNUAL", href: `/app/when-dates/1/${firstDay}` }] : [],
      photos: [],
      reviews: rich ? [{ id: randomUUID(), userId: 2, author: "avril", rating: 5, comment: "Un día para repetir." }] : [],
    });
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
    const coverId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    a.trip.coverPhotoId = coverId;
    a.trip.coverPhotoUrl = `/whither-journey/files/${coverId}/content?thumbnail=true`;
    a.files.push({
      id: coverId,
      name: "portada.webp",
      contentType: "image/webp",
      byteSize: 300,
      stageId: null,
      pointId: null,
      stayId: null,
      movementId: null,
      purpose: "TRIP",
      day: null,
      width: 320,
      height: 240,
      thumbnailUrl: a.trip.coverPhotoUrl,
      url: `/whither-journey/files/${coverId}/content`,
    });
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
        category: "FOOD",
        source: null,
        extraActions: [],
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
        category: "FILM",
        source: { section: "FILM", entityId: 7 },
        extraActions: [],
      },
    ];
    a.packing = [
      {
        id: randomUUID(),
        userId: 1,
        description: "Pasaporte y documentos",
        quantity: 1,
        packed: true,
        position: 0,
      },
      {
        id: randomUUID(),
        userId: 1,
        description: "Cargador del teléfono",
        quantity: 1,
        packed: false,
        position: 1,
      },
      {
        id: randomUUID(),
        userId: 2,
        description: "Abrigo para la noche",
        quantity: 1,
        packed: true,
        position: 0,
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
    const payload = body as unknown as Record<string, unknown>;
    requests.push({ path: url.pathname + url.search, method, body, contentType: req.headers()["content-type"] });
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
    if (path === "/whither-journey/point-types") {
      if (method === "POST") {
        const type = { code: `CUSTOM_${randomUUID().replaceAll("-", "").toUpperCase()}`, ...payload, position: pointTypes.length, builtIn: false } satisfies JourneyPointType;
        pointTypes.push(type);
        return reply(type, 201);
      }
      return reply(pointTypes);
    }
    if (path === "/whither-journey/destinations") {
      const cityIds = new Set(Array.from(journeys.values()).flatMap((detail) => detail.trip.stages.map((stage) => stage.cityId)));
      return reply(cities.filter((city) => cityIds.has(city.id)).sort((a, b) => a.name.localeCompare(b.name)));
    }
    const pointTypeRoute = /^\/whither-journey\/point-types\/([^/]+)$/.exec(path);
    if (pointTypeRoute) {
      const index = pointTypes.findIndex((type) => type.code === decodeURIComponent(pointTypeRoute[1]));
      if (method === "PUT" && index >= 0) {
        pointTypes[index] = { ...pointTypes[index], ...payload };
        return reply(pointTypes[index]);
      }
      if (method === "DELETE" && index >= 0) {
        pointTypes.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
    }
    if (path === "/whither-journey") {
      if (method === "POST") return reply(create(body).trip, 201);
      const params = url.searchParams;
      let result = Array.from(journeys.values()).map((d) => d.trip);
      const archived = params.get("archived");
      if (archived !== null) result = result.filter((trip) => trip.archived === (archived === "true"));
      const search = params.get("search")?.trim().toLocaleLowerCase("es");
      if (search) result = result.filter((trip) => trip.name.toLocaleLowerCase("es").includes(search)
        || trip.stages.some((stage) => stage.cityName.toLocaleLowerCase("es").includes(search)));
      const destinationId = Number(params.get("destinationId"));
      if (Number.isSafeInteger(destinationId) && destinationId > 0) result = result.filter((trip) => trip.stages.some((stage) => stage.cityId === destinationId));
      const from = params.get("from");
      const to = params.get("to");
      if (from) result = result.filter((trip) => trip.endsOn >= from);
      if (to) result = result.filter((trip) => trip.startsOn <= to);
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
      switch (params.get("status")) {
        case "UPCOMING": result = result.filter((trip) => trip.startsOn > today); break;
        case "IN_PROGRESS": result = result.filter((trip) => trip.startsOn <= today && trip.endsOn >= today); break;
        case "FINISHED": result = result.filter((trip) => trip.endsOn < today); break;
      }
      switch (params.get("sort")) {
        case "starts-asc": result.sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.id.localeCompare(b.id)); break;
        case "name-asc": result.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); break;
        default: result.sort((a, b) => b.startsOn.localeCompare(a.startsOn) || b.id.localeCompare(a.id));
      }
      const page = Math.max(0, Number(params.get("page") ?? 0));
      const size = Math.min(50, Math.max(1, Number(params.get("size") ?? 20)));
      return reply(result.slice(page * size, (page + 1) * size));
    }
    const dayIndex = /^\/whither-journey\/([^/]+)\/days$/.exec(path);
    if (dayIndex) {
      const detail = journeys.get(dayIndex[1]);
      if (!detail) return reply({ detail: "No encontramos este viaje." }, 404);
      const from = Date.parse(`${detail.trip.startsOn}T00:00:00Z`);
      const to = Date.parse(`${detail.trip.endsOn}T00:00:00Z`);
      const result: JourneyDayIndex[] = [];
      for (let time = from; time <= to; time += 86_400_000) {
        const date = new Date(time).toISOString().slice(0, 10);
        result.push({ date, destinations: detail.trip.stages.filter((s) => date >= s.startsOn && date <= s.endsOn).map((s) => s.cityName) });
      }
      return reply(result);
    }
    const dayRoute = /^\/whither-journey\/([^/]+)\/days\/(\d{4}-\d{2}-\d{2})(?:\/(story|reviews\/me))?$/.exec(path);
    if (dayRoute) {
      const detail = journeys.get(dayRoute[1]);
      if (!detail) return reply({ detail: "No encontramos este viaje." }, 404);
      const [, tripId, date, action] = dayRoute;
      const key = `${tripId}:${date}`;
      let value = dayDetails.get(key) ?? { date, story: null, entries: [], specialDates: [], photos: [], reviews: [] } satisfies JourneyDay;
      if (action === "story" && method === "PUT") {
        value = { ...value, story: payload.story || null };
        dayDetails.set(key, value);
        return reply(value);
      }
      if (action === "reviews/me" && method === "PUT") {
        const review = { id: randomUUID(), userId: 1, author: "tomas", rating: payload.rating ?? null, comment: payload.comment || null };
        value = { ...value, reviews: [...value.reviews.filter((r) => r.userId !== 1), review] };
        dayDetails.set(key, value);
        return reply(review);
      }
      if (action === "reviews/me" && method === "DELETE") {
        value = { ...value, reviews: value.reviews.filter((r) => r.userId !== 1) };
        dayDetails.set(key, value);
        return route.fulfill({ status: 204 });
      }
      return reply(value);
    }
    const journeyPhotos = /^\/whither-journey\/([^/]+)\/photos$/.exec(path);
    if (journeyPhotos && method === "POST") {
      const detail = journeys.get(journeyPhotos[1]);
      if (!detail) return reply({ detail: "No encontramos este viaje." }, 404);
      const purpose = url.searchParams.get("purpose") === "DAY" ? "DAY" : "TRIP";
      const day = url.searchParams.get("day") ?? null;
      const id = randomUUID();
      const photo = { id, name: "recuerdo.webp", contentType: "image/webp", byteSize: 300, stageId: null, pointId: null, stayId: null, movementId: null, purpose, day, width: 320, height: 240, thumbnailUrl: `/whither-journey/files/${id}/content?thumbnail=true`, url: `/whither-journey/files/${id}/content` } satisfies JourneyFile;
      detail.files.push(photo);
      if (purpose === "DAY" && day) {
        const key = `${journeyPhotos[1]}:${day}`;
        const value = dayDetails.get(key) ?? { date: day, story: null, entries: [], specialDates: [], photos: [], reviews: [] } satisfies JourneyDay;
        dayDetails.set(key, { ...value, photos: [...value.photos, { id, name: photo.name, url: photo.url, thumbnailUrl: photo.thumbnailUrl, width: photo.width, height: photo.height, purpose, day }] });
      }
      if (!detail.trip.coverPhotoId) {
        detail.trip.coverPhotoId = id;
        detail.trip.coverPhotoUrl = photo.thumbnailUrl;
      }
      return reply(photo, 201);
    }
    const coverRoute = /^\/whither-journey\/([^/]+)\/cover\/([^/]+)$/.exec(path);
    if (coverRoute && method === "PUT") {
      const detail = journeys.get(coverRoute[1]);
      if (detail) {
        detail.trip.coverPhotoId = coverRoute[2];
        detail.trip.coverPhotoUrl = `/whither-journey/files/${coverRoute[2]}/content?thumbnail=true`;
      }
      return route.fulfill({ status: 204 });
    }
    const packingBoth = /^\/whither-journey\/([^/]+)\/packing\/both$/.exec(path);
    if (packingBoth && method === "POST") {
      const detail = journeys.get(packingBoth[1]);
      if (!detail) return reply({ detail: "No encontramos este viaje." }, 404);
      const created = detail.members.map((member) => {
        const item = {
          id: randomUUID(),
          userId: member.id,
          description: String(payload.description),
          quantity: Number(payload.quantity),
          packed: false,
          position:
            Math.max(
              -1,
              ...detail.packing
                .filter((p) => p.userId === member.id)
                .map((p) => p.position ?? 0),
            ) + 1,
        };
        detail.packing.push(item);
        return item;
      });
      return reply(created, 201);
    }
    if (path.startsWith("/whither-journey/catalog/"))
      return reply([
        {
          section: path.split("/").pop(),
          entityId: 7,
          title: "Una película para compartir",
          cityId: 1,
          href: "/app/films/7",
          thumbnailUrl: null,
        },
      ]);
    if (path.startsWith("/whither-journey/experiences/"))
      return reply([{ id: 9, date: "2026-08-10", cityId: 2, stageId: null }]);
    const content = /^\/whither-journey\/files\/([^/]+)\/content$/.exec(path);
    if (content) {
      const isJourneyPhoto = Array.from(journeys.values()).some((d) => d.files.some((f) => f.id === content[1] && (f.purpose === "TRIP" || f.purpose === "DAY")));
      if (isJourneyPhoto) return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z2YAAAAASUVORK5CYII=", "base64") });
      return route.fulfill({
        contentType: "application/pdf",
        body: Buffer.from(
          "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 /Kids [] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF",
        ),
      });
    }
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
            purpose: "ATTACHMENT",
            day: null,
            width: null,
            height: null,
            thumbnailUrl: null,
            url: "",
          };
          f.url = `/whither-journey/files/${f.id}/content`;
          d.files.push(f);
          return reply(f);
        }
        if (match[3] === "order") {
          if (resource === "packing") {
            const itemIds = (payload.itemIds as string[]) ?? [];
            itemIds.forEach((id, position) => {
              const item = d.packing.find(
                (candidate) => candidate.id === id && candidate.userId === payload.userId,
              );
              if (item) item.position = position;
            });
          }
          return route.fulfill({ status: 204 });
        }
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
        if (resource === "packing") {
          const old = d.packing.find((item) => item.id === entity.id);
          entity.position =
            Number.isInteger(payload.position)
              ? Number(payload.position)
              : old?.position ??
                Math.max(
                  -1,
                  ...d.packing
                    .filter((item) => item.userId === Number(payload.userId))
                    .map((item) => item.position ?? 0),
                ) + 1;
        }
        if (index < 0) rows.push(entity);
        else rows[index] = entity;
        return reply(entity);
      }
    }
    return reply({ content: [], nextCursor: null });
  });
  return { journeys, requests };
}
