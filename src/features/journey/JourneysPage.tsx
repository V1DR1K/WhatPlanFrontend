import { useState } from "react";
import { useQuery } from "../../lib/locationQuery";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import { SectionShell } from "../../components/ui/SectionShell";
import { JourneyForm } from "./JourneyForm";
import { getTrips, formatDate, today } from "./journey";
import { useZoneContext } from "../../lib/zoneContext";
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
  const { coupleId } = useZoneContext();
  const trips = useQuery({
    queryKey: ["journeys", coupleId, page],
    queryFn: () => getTrips(page),
  });
  return (
    <SectionShell className="journey-page" section="journey">
      <header className="journey-heading">
        <div>
          <PlaneIcon />
          <h1>Whither Journey</h1>
          <p>Sus próximos destinos, y todo lo que quieren recordar.</p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuevo viaje</Button>
      </header>
      {trips.isLoading && <LoadingSkeleton variant="catalog" />}
      {trips.error && (
        <p role="alert" className="form-error">
          {trips.error.message}
          <Button variant="secondary" onClick={() => void trips.refetch()}>
            Reintentar
          </Button>
        </p>
      )}
      {!trips.isLoading && !trips.error && !trips.data?.length && (
        <div className="journey-empty">
          <PlaneIcon />
          <h2>
            {page
              ? "Llegaron al final del recorrido"
              : "El próximo viaje empieza acá"}
          </h2>
          <p>
            Agreguen las ciudades y las fechas. Después pueden armar la agenda,
            guardar reservas y preparar las valijas.
          </p>
          {!page && (
            <Button onClick={() => setCreating(true)}>
              Crear nuestro primer viaje
            </Button>
          )}
        </div>
      )}
      <div className="journey-catalog">
        {trips.data?.map((trip) => (
          <CatalogMediaCard
            key={trip.id}
            ariaLabel={`Ver viaje ${trip.name}`}
            badge={trip.archived ? "ARCHIVADO" : `${trip.stages.length} destinos`}
            eyebrow={trip.stages.map((s) => s.cityName).join(" → ")}
            footer={
              <>
                <span>
                  {formatDate(trip.startsOn)} — {formatDate(trip.endsOn)}
                </span>
                <span>
                  {trip.archived
                    ? "Ver viaje"
                    : trip.endsOn < today()
                      ? "Un viaje para recordar"
                      : "Preparar el recorrido"}{" "}
                  →
                </span>
              </>
            }
            image={
              <div className="journey-trip__art">
                <PlaneIcon />
                <span>{trip.stages.length} destinos · {trip.stages.map((s) => s.cityName).join(" → ")}</span>
              </div>
            }
            orientation="landscape"
            theme="journey"
            title={trip.name}
            to={`/app/whither-journey/${trip.id}`}
          >
            <p className="catalog-media-card__note">
              {trip.endsOn < today()
                ? "Un viaje para recordar"
                : "Destinos, agenda y recuerdos del viaje"}
            </p>
          </CatalogMediaCard>
        ))}
      </div>
      {(page > 0 || trips.data?.length === 20) && (
        <nav className="journey-pagination" aria-label="Páginas de viajes">
          <Button
            variant="secondary"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>Página {page + 1}</span>
          <Button
            variant="secondary"
            disabled={trips.data?.length !== 20}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}
      {creating && <JourneyForm onClose={() => setCreating(false)} />}
    </SectionShell>
  );
}
