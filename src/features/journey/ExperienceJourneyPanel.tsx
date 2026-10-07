import { useState } from "react";
import { useQuery } from "../../lib/locationQuery";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  getCity,
  getExperienceLocation,
  getTrip,
  money,
  type Source,
  type Movement,
} from "./journey";
import { MovementEditor } from "./JourneyEditors";
import { useZoneContext } from "../../lib/zoneContext";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
export function ExperienceJourneyPanel({
  source,
}: {
  source: Source;
}) {
  const context = useZoneContext();
  const placeSensitive = source.section === "FOOD" || source.section === "FUN";
  const [movement, setMovement] = useState<Movement | null>();
  const location = useQuery({
    queryKey: [
      "experience-location",
      source.section,
      source.entityId,
      source.experienceId,
    ],
    queryFn: () => getExperienceLocation(source),
    enabled: !!source.experienceId,
  });
  const city = useQuery({
    queryKey: ["city", location.data?.cityId],
    queryFn: () => getCity(location.data!.cityId!),
    enabled: placeSensitive && !!location.data?.cityId,
  });
  const trip = useQuery({
    queryKey: ["journey", location.data?.journeyId],
    queryFn: () => getTrip(location.data!.journeyId!),
    enabled: !!location.data?.journeyId,
  });
  const expenses =
    trip.data?.movements.filter((m) => m.pointId === location.data?.pointId) ??
    [];
  return (
    <section className="experience-journey-panel">
      <h3>Ubicación y viaje</h3>
      {location.isLoading && <LoadingSkeleton variant="inline" inlineKind="location" section="journey" />}
      {location.error && (
        <p className="form-error" role="alert">
          {location.error.message}
        </p>
      )}
      {location.data && (
        <>
          <p>
            {placeSensitive
              ? context.options.find(
                  (o) =>
                    o.stageId === location.data?.stageId &&
                    o.cityId === location.data?.cityId,
                )?.label ?? `${city.data?.name ?? "Ubicación guardada"} · Sin viaje activo`
              : "Se incluye en el resumen de los viajes según la fecha registrada."}
          </p>
          {location.data.journeyId && (
            <Link to={`/app/whither-journey/${location.data.journeyId}`}>
              Abrir viaje →
            </Link>
          )}
          {trip.data && !trip.data.trip.archived && <div className="journey-actions">
            <Button variant="secondary" onClick={() => setMovement(null)}>
              Registrar gasto
            </Button>
          </div>}
          {!!expenses.length && (
            <ul className="journey-money-list">
              {expenses.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{m.description}</strong>
                    <span>
                      {m.kind === "EXPENSE"
                        ? "Gasto"
                        : m.kind === "REFUND"
                          ? "Reintegro"
                          : "Fondos"}
                    </span>
                  </div>
                  <strong>{money(m.amount, m.currency)}</strong>
                  {!trip.data?.trip.archived && (
                    <Button variant="secondary" onClick={() => setMovement(m)}>
                      Editar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {trip.error && (
        <p className="form-error" role="alert">
          {trip.error.message}
        </p>
      )}
      {movement !== undefined && trip.data && (
        <MovementEditor
          detail={trip.data}
          movement={movement ?? undefined}
          initialPointId={location.data?.pointId ?? undefined}
          onClose={() => setMovement(undefined)}
        />
      )}
      <datalist id="journey-currencies">
        <option value="ARS" />
        <option value="USD" />
        <option value="EUR" />
      </datalist>
    </section>
  );
}
