import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "../../lib/locationQuery";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { JourneyForm } from "./JourneyForm";
import { getTrips, formatDate, today } from "./journey";
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
  const trips = useQuery({
    queryKey: ["journeys", page],
    queryFn: () => getTrips(page),
  });
  return (
    <section className="journey-page">
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
          <Link
            className="journey-trip"
            to={`/app/whither-journey/${trip.id}`}
            key={trip.id}
          >
            <span className="journey-trip__route">
              {trip.stages.map((s) => s.cityName).join(" → ")}
            </span>
            <h2>{trip.name}</h2>
            <p>
              {formatDate(trip.startsOn)} — {formatDate(trip.endsOn)}
            </p>
            <span>
              {trip.archived
                ? "Archivado"
                : trip.endsOn < today()
                  ? "Un viaje para recordar"
                  : "Preparar el recorrido"}{" "}
              →
            </span>
          </Link>
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
    </section>
  );
}
