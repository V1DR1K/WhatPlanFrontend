import { useState, useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { showNotice } from "../../lib/flash";
import {
  getCities,
  getCountries,
  saveCity,
  saveTrip,
  type City,
  type Trip,
  today,
} from "./journey";
export type CityDraft = { id?: number; name: string; countryCode: string };
export function CityPicker({
  value,
  onChange,
}: {
  value: CityDraft;
  onChange: (city: CityDraft) => void;
}) {
  const id = useId();
  const countries = useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
    staleTime: Infinity,
  });
  const cities = useQuery({
    queryKey: ["cities", value.countryCode, value.name],
    queryFn: () => getCities(value.countryCode, value.name),
  });
  return (
    <div className="form-columns">
      <label>
        País
        <select
          required
          value={value.countryCode}
          onChange={(e) => onChange({ countryCode: e.target.value, name: "" })}
        >
          {(countries.data ?? []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          {!countries.data && (
            <option value={value.countryCode}>Cargando países…</option>
          )}
        </select>
      </label>
      <label>
        Lugar
        <input
          required
          maxLength={80}
          list={id}
          value={value.name}
          placeholder="Ciudad"
          autoComplete="off"
          onChange={(e) => {
            const existing = cities.data?.find(
              (c) =>
                c.name.toLocaleLowerCase() ===
                e.target.value.trim().toLocaleLowerCase(),
            );
            onChange({
              countryCode: value.countryCode,
              name: e.target.value,
              id: existing?.id,
            });
          }}
        />
        <datalist id={id}>
          {(cities.data ?? []).map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </label>
      {(countries.error || cities.error) && (
        <p className="form-error" role="alert">
          {(countries.error ?? cities.error)?.message}
        </p>
      )}
    </div>
  );
}
type StageDraft = {
  key: string;
  stageId?: string;
  city: CityDraft;
  startsOn: string;
  endsOn: string;
};
export function JourneyForm({
  trip,
  onClose,
}: {
  trip?: Trip;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [name, setName] = useState(trip?.name ?? "");
  const [startsOn, setStartsOn] = useState(trip?.startsOn ?? today());
  const [endsOn, setEndsOn] = useState(trip?.endsOn ?? today());
  const [stages, setStages] = useState<StageDraft[]>(
    trip?.stages.map((s) => ({
      key: s.id,
      stageId: s.id,
      city: { id: s.cityId, name: s.cityName, countryCode: s.countryCode },
      startsOn: s.startsOn,
      endsOn: s.endsOn,
    })) ?? [
      {
        key: crypto.randomUUID(),
        city: { countryCode: "AR", name: "" },
        startsOn: today(),
        endsOn: today(),
      },
    ],
  );
  const update = (key: string, change: Partial<StageDraft>) =>
    setStages((current) =>
      current.map((s) => (s.key === key ? { ...s, ...change } : s)),
    );
  const suggestion = stages
    .map((s) => s.city.name.trim())
    .filter(Boolean)
    .join(" → ");
  const save = useMutation({
    mutationFn: async () => {
      const resolved = [];
      for (const s of stages) {
        const city: City = s.city.id
          ? {
              id: s.city.id,
              name: s.city.name,
              countryCode: s.city.countryCode,
            }
          : await saveCity(s.city.name, s.city.countryCode);
        resolved.push({
          id: s.stageId,
          cityId: city.id,
          startsOn: s.startsOn,
          endsOn: s.endsOn,
        });
      }
      return saveTrip(
        {
          name: (name.trim() || suggestion).slice(0, 160),
          startsOn,
          endsOn,
          stages: resolved,
        },
        trip?.id,
      );
    },
    onSuccess: async (saved) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["journeys"] }),
        client.invalidateQueries({ queryKey: ["journey", saved.id] }),
        client.invalidateQueries({ queryKey: ["location-context"] }),
        client.invalidateQueries({ queryKey: ["cities"] }),
      ]);
      showNotice(
        trip
          ? "Viaje actualizado."
          : "Viaje creado. Ya pueden organizar sus días.",
      );
      onClose();
      navigate(`/app/whither-journey/${saved.id}`);
    },
  });
  return (
    <Modal
      onClose={onClose}
      size="wide"
      confirmDiscard
      pending={save.isPending}
      title={trip ? "Editar viaje" : "Nuevo viaje"}
    >
      <form
        className="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2>{trip ? "Editar viaje" : "¿Adónde quieren ir?"}</h2>
        <p className="muted">
          Cada destino tendrá su lugar en el filtro de ciudad.
        </p>
        <label>
          Nombre del viaje
          <input
            value={name}
            maxLength={160}
            placeholder={suggestion || "Nuestro próximo viaje"}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="form-columns">
          <label>
            Fecha de inicio
            <input
              required
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </label>
          <label>
            Fecha de fin
            <input
              required
              type="date"
              min={startsOn}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </label>
        </div>
        <h3>Destinos del recorrido</h3>
        {stages.map((s, index) => (
          <fieldset className="journey-stage-form" key={s.key}>
            <legend>Destino {index + 1}</legend>
            <CityPicker
              value={s.city}
              onChange={(city) => update(s.key, { city })}
            />
            <div className="form-columns">
              <label>
                Llegada
                <input
                  required
                  type="date"
                  min={startsOn}
                  max={endsOn}
                  value={s.startsOn}
                  onChange={(e) => update(s.key, { startsOn: e.target.value })}
                />
              </label>
              <label>
                Salida
                <input
                  required
                  type="date"
                  min={s.startsOn > startsOn ? s.startsOn : startsOn}
                  max={endsOn}
                  value={s.endsOn}
                  onChange={(e) => update(s.key, { endsOn: e.target.value })}
                />
              </label>
            </div>
            {stages.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStages(stages.filter((v) => v.key !== s.key))}
              >
                Quitar destino
              </Button>
            )}
          </fieldset>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={stages.length >= 100}
          onClick={() =>
            setStages([
              ...stages,
              {
                key: crypto.randomUUID(),
                city: { countryCode: "AR", name: "" },
                startsOn,
                endsOn,
              },
            ])
          }
        >
          Agregar otro destino
        </Button>
        <div className="journey-form__actions">
          <Button disabled={save.isPending || !suggestion}>
            {save.isPending ? "Guardando…" : "Guardar viaje"}
          </Button>
        </div>
        {save.error && (
          <p className="form-error" role="alert">
            {save.error.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
