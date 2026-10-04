import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  getCity,
  getExperienceLocation,
  bindExperience,
  getTrip,
  money,
  type Source,
  type Movement,
} from "./journey";
import { LocationFields, useLocationDraft } from "./LocationFields";
import { MovementEditor } from "./JourneyEditors";
import { useZoneContext } from "../../lib/zoneContext";
export function ExperienceJourneyPanel({
  source,
  physicalCity,
}: {
  source: Source;
  physicalCity?: number;
}) {
  const client = useQueryClient();
  const context = useZoneContext();
  const placeSensitive = source.section === "FOOD" || source.section === "FUN";
  const [editing, setEditing] = useState(false);
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
  const refresh = () =>
    Promise.all(
      [
        "experience-location",
          "journey",
        "journey-day",
        "journey-days",
        "when-dates",
        "when-date",
        "films",
        "recipes",
        "places",
        "activities",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  const expenses =
    trip.data?.movements.filter((m) => m.pointId === location.data?.pointId) ??
    [];
  return (
    <section className="experience-journey-panel">
      <h3>Ubicación y viaje</h3>
      {location.isLoading && <p role="status">Cargando ubicación…</p>}
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
          <div className="journey-actions">
            {placeSensitive && <Button variant="secondary" onClick={() => setEditing(!editing)}>
              Cambiar ubicación / viaje
            </Button>}
            {trip.data && !trip.data.trip.archived && (
              <Button variant="secondary" onClick={() => setMovement(null)}>
                Registrar gasto
              </Button>
            )}
          </div>
          {editing && placeSensitive && (
            <LocationEditor
              key={`${source.experienceId}-${location.data.stageId}`}
              source={source}
              cityId={location.data.cityId ?? null}
              stageId={location.data.stageId ?? null}
              physicalCity={physicalCity}
              onSaved={async () => {
                await refresh();
                setEditing(false);
              }}
            />
          )}
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
          initialStageId={location.data?.stageId ?? undefined}
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
function LocationEditor({
  source,
  cityId,
  stageId,
  physicalCity,
  onSaved,
}: {
  source: Source;
  cityId: number | null;
  stageId: string | null;
  physicalCity?: number;
  onSaved: () => Promise<void>;
}) {
  const draft = useLocationDraft(cityId, stageId);
  const save = useMutation({
    mutationFn: () =>
      bindExperience(source, {
        cityId: draft.cityId ?? undefined,
        stageId: draft.stageId,
      }),
    onSuccess: onSaved,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <LocationFields
        cityId={draft.cityId}
        stageId={draft.stageId}
        physicalCity={physicalCity}
        onChange={(city, stage) => {
          draft.setCityId(city);
          draft.setStageId(stage);
        }}
      />
      <Button disabled={save.isPending}>
        {save.isPending ? "Guardando…" : "Guardar ubicación"}
      </Button>
      {save.error && (
        <p role="alert" className="form-error">
          {save.error.message}
        </p>
      )}
    </form>
  );
}
