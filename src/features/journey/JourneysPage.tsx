import { useEffect, useRef, useState } from "react";
import { useQuery } from "../../lib/locationQuery";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { CatalogFilterChips } from "../../components/ui/CatalogFilterChips";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import { ExperienceHero } from "../../components/ui/ExperienceHero";
import { MediaImage } from "../../components/ui/MediaImage";
import { SectionShell } from "../../components/ui/SectionShell";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useZoneContext } from "../../lib/zoneContext";
import { JourneyForm } from "./JourneyForm";
import {
  getJourneyDestinations,
  getTrips,
  formatDate,
  today,
  type JourneyCatalogSort,
  type JourneyCatalogStatus,
  type Trip,
} from "./journey";

const statuses = [
  { id: "UPCOMING", label: "Próximos" },
  { id: "IN_PROGRESS", label: "En curso" },
  { id: "FINISHED", label: "Finalizados" },
] satisfies { id: JourneyCatalogStatus; label: string }[];

const validStatuses = new Set<JourneyCatalogStatus>(statuses.map(({ id }) => id));
const validSorts = new Set<JourneyCatalogSort>(["starts-desc", "starts-asc", "name-asc"]);
const positiveId = (value: string | null) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};
const durationInDays = (trip: Trip) =>
  Math.round(
    (Date.parse(`${trip.endsOn}T00:00:00Z`) - Date.parse(`${trip.startsOn}T00:00:00Z`)) /
      86_400_000,
  ) + 1;
const statusLabel = (trip: Trip) => {
  if (trip.archived) return "ARCHIVADO";
  const currentDate = today();
  if (trip.startsOn > currentDate) return "PRÓXIMO";
  if (trip.endsOn < currentDate) return "FINALIZADO";
  return "EN CURSO";
};

export function PlaneIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m28 4-8 24-5-10-11-5 24-9Z" />
      <path d="m15 18 13-14M9 23l-4 4M13 27l-2 2" />
    </svg>
  );
}

export function JourneysPage() {
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParamsRef = useRef(new URLSearchParams(searchParams));
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const { coupleId } = useZoneContext();
  const filterQuery = searchParams.toString();

  useEffect(() => {
    filterParamsRef.current = new URLSearchParams(searchParams);
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);
  useEffect(() => setPage(0), [filterQuery]);

  const searchTerm = search.trim();
  const deferredSearch = useDebouncedValue(searchTerm);
  const statusValue = searchParams.get("status") as JourneyCatalogStatus | null;
  const status = statusValue && validStatuses.has(statusValue) ? statusValue : undefined;
  const destinationId = positiveId(searchParams.get("destinationId"));
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const archived = searchParams.get("archived") === "true";
  const requestedSort = searchParams.get("sort") as JourneyCatalogSort | null;
  const sort = requestedSort && validSorts.has(requestedSort) ? requestedSort : "starts-desc";
  const dateRangeError = Boolean(from && to && from > to);
  const hasFilters = Boolean(
    searchTerm || status || destinationId || from || to || archived || sort !== "starts-desc",
  );

  const destinations = useQuery({
    queryKey: ["journey-destinations", coupleId],
    queryFn: getJourneyDestinations,
  });
  const trips = useQuery({
    queryKey: ["journeys", coupleId, page, archived, deferredSearch, status, destinationId, from, to, sort],
    queryFn: () => getTrips(page, {
      archived,
      search: deferredSearch,
      status,
      destinationId,
      from: from || undefined,
      to: to || undefined,
      sort,
    }),
    enabled: !dateRangeError,
  });

  const updateFilter = (name: string, value: string) => {
    setPage(0);
    const next = new URLSearchParams(filterParamsRef.current);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    filterParamsRef.current = next;
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setPage(0);
    const next = new URLSearchParams();
    filterParamsRef.current = next;
    setSearchParams(next, { replace: true });
  };

  return (
    <SectionShell className="journey-page" section="journey">
      <ExperienceHero
        className="journey-hero"
        eyebrow="WHITHER JOURNEY · VIAJES COMPARTIDOS"
        title={<>¿Adónde <em>vamos</em>?</>}
        description="Los planes, las experiencias y los recuerdos del viaje en un solo lugar."
        art={<PlaneIcon />}
      />
      <div className="journey-catalog-action">
        <Button onClick={() => setCreating(true)}>Nuevo viaje</Button>
      </div>

      <section className="journey-catalog-controls" aria-label="Filtros de viajes">
        <div className="catalog-search-sort">
          <label className="catalog-search-sort__field">
            <span>Buscar viajes</span>
            <input
              type="search"
              placeholder="Nombre o destino"
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                updateFilter("search", value.trim());
              }}
            />
          </label>
          <label className="catalog-search-sort__field">
            <span>Ordenar viajes</span>
            <select value={sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option value="starts-desc">Inicio más reciente</option>
              <option value="starts-asc">Inicio más próximo</option>
              <option value="name-asc">Nombre A–Z</option>
            </select>
          </label>
        </div>

        <div className="journey-catalog-controls__filters">
          <label className="catalog-search-sort__field">
            <span>Destino</span>
            <select
              aria-label="Filtrar por destino"
              value={destinationId ?? ""}
              onChange={(event) => updateFilter("destinationId", event.target.value)}
            >
              <option value="">Todos los destinos</option>
              {(destinations.data ?? []).map((city) => (
                <option key={city.id} value={city.id}>{city.name} · {city.countryCode}</option>
              ))}
            </select>
          </label>
          <label className="catalog-search-sort__field">
            <span>Desde</span>
            <input type="date" aria-label="Fecha desde" value={from} onChange={(event) => updateFilter("from", event.target.value)} />
          </label>
          <label className="catalog-search-sort__field">
            <span>Hasta</span>
            <input type="date" aria-label="Fecha hasta" value={to} onChange={(event) => updateFilter("to", event.target.value)} />
          </label>
          <Button
            className="journey-archive-filter"
            variant="secondary"
            type="button"
            aria-pressed={archived}
            onClick={() => updateFilter("archived", archived ? "" : "true")}
          >
            {archived ? "Ocultar archivados" : "Ver archivados"}
          </Button>
          {hasFilters && (
            <Button variant="tertiary" type="button" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <CatalogFilterChips
          label="Estado del viaje"
          allLabel="Todos"
          options={statuses}
          value={status}
          onChange={(value) => updateFilter("status", typeof value === "string" ? value : "")}
        />
      </section>

      {destinations.isError && (
        <p role="alert" className="form-error">No pudimos cargar la lista de destinos.</p>
      )}
      {dateRangeError && (
        <p role="alert" className="form-error">La fecha “Desde” debe ser anterior o igual a “Hasta”.</p>
      )}
      {trips.isLoading && !dateRangeError && <LoadingSkeleton variant="catalog" />}
      {trips.error && !dateRangeError && (
        <p role="alert" className="form-error">
          {trips.error.message}
          <Button variant="secondary" onClick={() => void trips.refetch()}>Reintentar</Button>
        </p>
      )}
      {!trips.isLoading && !trips.error && !dateRangeError && !trips.data?.length && (
        <div className="journey-empty">
          <PlaneIcon />
          <h2>
            {hasFilters
              ? "No hay viajes que coincidan con estos filtros"
              : page
                ? "Llegaron al final del recorrido"
                : "El próximo viaje empieza acá"}
          </h2>
          <p>
            {hasFilters
              ? "Probá otro destino o período, o limpiá los filtros para volver a ver los viajes."
              : "Agreguen las ciudades y las fechas. Después pueden armar la agenda, guardar reservas y preparar las valijas."}
          </p>
          {hasFilters ? (
            <Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>
          ) : !page ? (
            <Button onClick={() => setCreating(true)}>Crear nuestro primer viaje</Button>
          ) : null}
        </div>
      )}

      <div className="journey-catalog" aria-busy={trips.isFetching}>
        {trips.data?.map((trip) => {
          const duration = durationInDays(trip);
          const route = trip.stages.map((stage) => stage.cityName).join(" → ");
          return (
            <CatalogMediaCard
              key={trip.id}
              ariaLabel={`Ver viaje ${trip.name}`}
              badge={statusLabel(trip)}
              eyebrow={route || "DESTINO POR DEFINIR"}
              footer={
                <>
                  <span>{formatDate(trip.startsOn)} — {formatDate(trip.endsOn)}</span>
                  <span>Abrir viaje →</span>
                </>
              }
              image={trip.coverPhotoUrl
                ? <MediaImage className="catalog-media-card__image" src={trip.coverPhotoUrl} alt={`Portada de ${trip.name}`} width={720} height={540} loading="lazy" decoding="async" />
                : <div className="journey-trip__art"><PlaneIcon /><span>{route || "Un viaje por planear"}</span></div>}
              kpi={<span aria-label={`${duration} días`}>{duration} DÍAS</span>}
              chips={[
                ...trip.stages.slice(0, 3).map((stage) => <span key={stage.id}>{stage.cityName}</span>),
                ...(trip.stages.length > 3 ? [<span key="more">+{trip.stages.length - 3}</span>] : []),
              ]}
              orientation="portrait"
              theme="journey"
              title={trip.name}
              to={`/app/whither-journey/${trip.id}`}
            >
              <p className="catalog-media-card__note">
                {trip.archived
                  ? "El viaje y sus recuerdos siguen guardados."
                  : trip.endsOn < today()
                    ? "Un viaje para recordar."
                    : "Agenda, destinos y recuerdos en un solo lugar."}
              </p>
            </CatalogMediaCard>
          );
        })}
      </div>
      {!trips.isLoading && !trips.error && !dateRangeError && (page > 0 || trips.data?.length === 20) && (
        <nav className="journey-pagination" aria-label="Páginas de viajes">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>Página {page + 1}</span>
          <Button variant="secondary" disabled={trips.data?.length !== 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </nav>
      )}
      {creating && <JourneyForm onClose={() => setCreating(false)} />}
    </SectionShell>
  );
}
