import { api } from "../../lib/api";
export type City = { id: number; name: string; countryCode: string };
export type Country = { code: string; name: string };
export type LocationOption = {
  key: string;
  cityId: number;
  stageId: string | null;
  journeyId: string | null;
  label: string;
};
export type LocationContext = {
  coupleId: string;
  originCityId: number;
  options: LocationOption[];
  maxUploadBytes: number;
  members?: { username: string; displayName: string }[];
  homeLabels?: { home: "TOMAS" | "AVRIL"; displayName: string }[];
};
export type Binding = {
  cityId?: number;
  stageId?: string | null;
  pointId?: string | null;
};
export type Stage = {
  id: string;
  cityId: number;
  cityName: string;
  countryCode: string;
  startsOn: string;
  endsOn: string;
  position: number;
};
export type Trip = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  archived: boolean;
  stages: Stage[];
  coverPhotoId: string | null;
  coverPhotoUrl: string | null;
  maxTripPhotos: number;
  maxDayPhotos: number;
};
export type TripInput = Pick<Trip, "name" | "startsOn" | "endsOn" | "maxTripPhotos" | "maxDayPhotos"> & {
  stages: { id?: string; cityId: number; startsOn: string; endsOn: string }[];
};
export type Section = "FOOD" | "FILM" | "COOK" | "FUN";
export type PointCategory = string;
export const pointCategoryLabels: Record<string, string> = {
  GENERAL: "Actividad",
  FOOD: "WhereFood",
  FILM: "WhichMovie",
  COOK: "WhoCook",
  FUN: "WhyFun",
  TRANSFER: "Traslado",
};
export type JourneyPointType = {
  code: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  builtIn: boolean;
};
export type JourneyPointAction = { label: string; icon: string; url: string };
export type Source = {
  section: Section;
  entityId: number;
  experienceId?: number | null;
};
export type Point = {
  id: string;
  stageId: string;
  title: string;
  scheduledOn: string | null;
  scheduledTime: string | null;
  notes: string | null;
  address: string | null;
  mapsUrl: string | null;
  position: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  category: PointCategory;
  source: Source | null;
  extraActions: JourneyPointAction[];
};
export type Stay = {
  id: string;
  stageId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  address: string | null;
  price: number | string | null;
  currency: string | null;
  source: string | null;
  bookingUrl: string | null;
  mapsUrl: string | null;
  photoId: string | null;
};
export type Packing = {
  id: string;
  userId: number;
  description: string;
  quantity: number;
  packed: boolean;
  position: number;
};
export type Movement = {
  id: string;
  stageId: string | null;
  pointId: string | null;
  stayId: string | null;
  kind: "FUNDS" | "EXPENSE" | "REFUND";
  description: string;
  amount: number | string;
  currency: string;
  occurredOn: string;
};
export type Balance = {
  currency: string;
  funds: number | string;
  expenses: number | string;
  refunds: number | string;
  balance: number | string;
};
export type Review = {
  id: string;
  stayId: string | null;
  userId: number;
  author: string;
  rating: number;
  comment: string | null;
};
export type JourneyFile = {
  id: string;
  name: string;
  occurredAt: string;
  contentType: string;
  byteSize: number;
  stageId: string | null;
  pointId: string | null;
  stayId: string | null;
  movementId: string | null;
  purpose: "ATTACHMENT" | "TRIP" | "DAY";
  day: string | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  url: string;
};
export type JourneyPhoto = Pick<JourneyFile,
  "id" | "name" | "url" | "thumbnailUrl" | "width" | "height" | "purpose" | "day">;
export type JourneySourcePhoto = { id: string; url: string; thumbnailUrl: string; width: number; height: number };
export type JourneyDayEntry = { id: string; section: Section; date: string; title: string; detail: string; href: string; photos: JourneySourcePhoto[] };
export type JourneyDay = {
  date: string;
  entries: JourneyDayEntry[];
  specialDates: { id: number; label: string; recurrence: string; href: string }[];
  photos: JourneyPhoto[];
  reviews: { id: string; userId: number; author: string; rating: number | null; comment: string | null }[];
};
export type JourneyDayIndex = { date: string; destinations: string[] };
export type JourneyGalleryEntry = { date: string; section: Section; title: string; href: string; photos: JourneySourcePhoto[] };
export type Detail = {
  trip: Trip;
  points: Point[];
  stays: Stay[];
  packing: Packing[];
  movements: Movement[];
  balances: Balance[];
  reviews: Review[];
  files: JourneyFile[];
  members: { id: number; username: string }[];
  dates: {
    specialDateId: number;
    date: string;
    endsOn: string;
    label: string;
    stageId: string;
  }[];
  stageBalances: { stageId: string | null; balances: Balance[] }[];
};
export type CatalogSource = {
  section: Section;
  entityId: number;
  title: string;
  cityId: number;
  href: string;
  thumbnailUrl: string | null;
};
export type Experience = {
  id: number;
  date: string;
  cityId: number;
  stageId: string | null;
};
export const sections: Record<Section, string> = {
  FOOD: "WhereFood",
  FILM: "WhichMovie",
  COOK: "WhoCook",
  FUN: "WhyFun",
};
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
export const offsetJourneyDate = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
};
export const formatJourneyDay = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
export const money = (amount: number | string, currency: string) => {
  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  });
  if (typeof amount === "number") return formatter.format(amount);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) return formatter.format(Number(amount));
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10n ** BigInt(digits);
  const fraction = (match[3] ?? "").padEnd(digits + 1, "0");
  const units =
    BigInt(match[2]) * scale +
    BigInt(fraction.slice(0, digits) || "0") +
    (fraction[digits] >= "5" ? 1n : 0n);
  const integer = units / scale;
  const negative = match[1] === "-";
  const signed = negative ? (integer === 0n ? -0 : -integer) : integer;
  return formatter
    .formatToParts(signed)
    .map((part) =>
      part.type === "fraction"
        ? (units % scale).toString().padStart(digits, "0")
        : part.value,
    )
    .join("");
};
export const normalizeAmountInput = (raw: string) => {
  const value = raw.trim().replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!value) return "";
  if (value.includes(",")) return value.replace(/\./g, "").replace(",", ".");
  if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) return value.replace(/\./g, "");
  return value;
};
export const formatAmountInput = (raw: string) => {
  const normalized = normalizeAmountInput(raw);
  if (!normalized || !/^-?\d+(?:\.\d{0,4})?$/.test(normalized)) return raw;
  const match = /^(-?)(\d+)(?:\.(\d{0,4}))?$/.exec(normalized);
  if (!match) return raw;
  const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 })
    .format(BigInt(match[2]));
  return `${match[1]}${integer}${match[3] ? `,${match[3]}` : ""}`;
};
export const sourceHref = (source: Source) =>
  `${{ FOOD: "/app/food/places/", FILM: "/app/films/", COOK: "/app/how-cook/", FUN: "/app/why-fun/" }[source.section]}${source.entityId}`;
export const getLocationContext = () =>
  api<LocationContext>("/location-context");
export const saveOrigin = (cityId: number) =>
  api<LocationContext>("/location-context/origin", {
    method: "PUT",
    body: JSON.stringify({ cityId }),
  });
export const getCity = (id: number) => api<City>(`/cities/${id}`);
export const getCountries = () => api<Country[]>("/cities/countries");
export const getCities = (countryCode?: string, search?: string) => {
  const q = new URLSearchParams();
  if (countryCode) q.set("countryCode", countryCode);
  if (search) q.set("search", search);
  return api<City[]>(`/cities?${q}`);
};
export const saveCity = (name: string, countryCode: string) =>
  api<City>("/cities", {
    method: "POST",
    body: JSON.stringify({ name, countryCode }),
  });
export type JourneyCatalogStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED";
export type JourneyCatalogSort = "starts-desc" | "starts-asc" | "name-asc";
export type JourneyCatalogFilters = {
  archived?: boolean;
  search?: string;
  status?: JourneyCatalogStatus;
  destinationId?: number;
  from?: string;
  to?: string;
  sort?: JourneyCatalogSort;
};
export const getTrips = (page = 0, filters: JourneyCatalogFilters = {}) => {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  if (filters.archived !== undefined) query.set("archived", String(filters.archived));
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.status) query.set("status", filters.status);
  if (filters.destinationId) query.set("destinationId", String(filters.destinationId));
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.sort) query.set("sort", filters.sort);
  return api<Trip[]>(`/whither-journey?${query.toString()}`);
};
export const getJourneyDestinations = () => api<City[]>("/whither-journey/destinations");
export const getTrip = (id: string) => api<Detail>(`/whither-journey/${id}`);
export const getJourneyPointTypes = () => api<JourneyPointType[]>("/whither-journey/point-types");
export const saveJourneyPointType = (input: Pick<JourneyPointType, "name" | "icon" | "color">, code?: string) =>
  api<JourneyPointType>(`/whither-journey/point-types${code ? `/${encodeURIComponent(code)}` : ""}`, {
    method: code ? "PUT" : "POST",
    body: JSON.stringify(input),
  });
export const deleteJourneyPointType = (code: string) =>
  api<void>(`/whither-journey/point-types/${encodeURIComponent(code)}`, { method: "DELETE" });
export const saveTrip = (input: TripInput, id?: string) =>
  api<Trip>(`/whither-journey${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input),
  });
export const archiveTrip = (id: string) =>
  api<void>(`/whither-journey/${id}/archive`, { method: "PUT" });
export const deleteTrip = (id: string) =>
  api<void>(`/whither-journey/${id}`, { method: "DELETE" });
export const getJourneyDay = (id: string, day: string) =>
  api<JourneyDay>(`/whither-journey/${id}/days/${day}`);
export const getJourneyDays = (id: string) =>
  api<JourneyDayIndex[]>(`/whither-journey/${id}/days`);
export const getJourneyGallery = (id: string) =>
  api<JourneyGalleryEntry[]>(`/whither-journey/${id}/gallery`);
export const saveJourneyDayReview = (id: string, day: string, rating: number | null, comment: string) =>
  api<JourneyDayReview>(`/whither-journey/${id}/days/${day}/reviews/me`, {
    method: "PUT", body: JSON.stringify({ rating, comment }),
  });
export const deleteJourneyDayReview = (id: string, day: string) =>
  api<void>(`/whither-journey/${id}/days/${day}/reviews/me`, { method: "DELETE" });
export const uploadJourneyPhoto = (id: string, file: File, purpose: "TRIP" | "DAY", day?: string, occurredAt?: string) => {
  const form = new FormData(); form.append("file", file);
  const query = new URLSearchParams({ purpose }); if (day) query.set("day", day); if (occurredAt) query.set("occurredAt", occurredAt);
  return api<JourneyPhoto>(`/whither-journey/${id}/photos?${query}`, { method: "POST", body: form });
};
export const setJourneyCover = (id: string, fileId: string) =>
  api<void>(`/whither-journey/${id}/cover/${fileId}`, { method: "PUT" });
type JourneyDayReview = { id: string; userId: number; author: string; rating: number | null; comment: string | null };
type ResourceInput<T> = Omit<T, "id" | "position"> &
  Partial<Pick<T, Extract<keyof T, "position">>>;
export const saveResource = <T>(
  tripId: string,
  resource: string,
  input: ResourceInput<T>,
  id?: string,
) =>
  api<T>(`/whither-journey/${tripId}/${resource}${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input),
  });
export const addPackingForBoth = (tripId: string, description: string, quantity: number) =>
  api<Packing[]>(`/whither-journey/${tripId}/packing/both`, {
    method: "POST",
    body: JSON.stringify({ description, quantity }),
  });
export const reorderPacking = (tripId: string, userId: number, itemIds: string[]) =>
  api<void>(`/whither-journey/${tripId}/packing/order`, {
    method: "PUT",
    body: JSON.stringify({ userId, itemIds }),
  });
export const deleteResource = (resource: string, id: string) =>
  api<void>(`/whither-journey/${resource}/${id}`, { method: "DELETE" });
export const saveReview = (
  tripId: string,
  rating: number,
  comment: string,
  stayId?: string,
) =>
  api<Review>(`/whither-journey/${tripId}/reviews/me`, {
    method: "PUT",
    body: JSON.stringify({ stayId, rating, comment }),
  });
export const uploadFile = (
  tripId: string,
  file: File,
  links: {
    stageId?: string;
    pointId?: string;
    stayId?: string;
    movementId?: string;
    hotelPhoto?: boolean;
    occurredAt?: string;
  } = {},
) => {
  const q = new URLSearchParams();
  Object.entries(links).forEach(([k, v]) => {
    if (v) q.set(k, String(v));
  });
  const data = new FormData();
  data.append("file", file);
  return api<JourneyFile>(`/whither-journey/${tripId}/files?${q}`, {
    method: "POST",
    body: data,
  });
};
export const getSources = (
  section: Section,
  cityId?: number,
  search?: string,
) => {
  const q = new URLSearchParams();
  if (cityId) q.set("cityId", String(cityId));
  if (search) q.set("search", search);
  return api<CatalogSource[]>(`/whither-journey/catalog/${section}?${q}`);
};
export const getExperiences = async (
  source: Source,
  from?: string,
  to?: string,
) => {
  const results: Experience[] = [];
  for (let page = 0; ; page++) {
    const query = new URLSearchParams({ page: String(page) });
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    const chunk = await api<Experience[]>(
      `/whither-journey/experiences/${source.section}/${source.entityId}?${query}`,
    );
    results.push(...chunk);
    if (chunk.length < 100) return results;
  }
};
export const getExperienceLocation = (source: Source) =>
  api<Binding & { journeyId?: string }>(
    `/whither-journey/experiences/${source.section}/${source.entityId}/${source.experienceId}/location`,
  );
export const bindExperience = (source: Source, input: Binding) =>
  api<Binding & { journeyId?: string }>(
    `/whither-journey/experiences/${source.section}/${source.entityId}/${source.experienceId}/location`,
    { method: "PUT", body: JSON.stringify(input) },
  );
export const relinkFile = (
  id: string,
  links: {
    stageId: string | null;
    pointId: string | null;
    stayId: string | null;
    movementId: string | null;
  },
) =>
  api<JourneyFile>(`/whither-journey/files/${id}/links`, {
    method: "PUT",
    body: JSON.stringify(links),
  });

export const updateFileDate = (id: string, occurredAt: string) =>
  api<JourneyFile>(`/whither-journey/files/${id}/date`, {
    method: "PUT",
    body: JSON.stringify({ occurredAt }),
  });
