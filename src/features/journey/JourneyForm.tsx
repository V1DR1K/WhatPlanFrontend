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
  const [maxTripPhotos, setMaxTripPhotos] = useState(trip?.maxTripPhotos ?? 20);
  const [maxDayPhotos, setMaxDayPhotos] = useState(trip?.maxDayPhotos ?? 10);
  const initialStage = trip?.stages[0];
  const [stageId] = useState(initialStage?.id);
  const [city, setCity] = useState<CityDraft>(initialStage
    ? { id: initialStage.cityId, name: initialStage.cityName, countryCode: initialStage.countryCode }
    : { countryCode: "AR", name: "" });
  const suggestion = city.name.trim();
  const save = useMutation({
    mutationFn: async () => {
      const resolvedCity: City = city.id
          ? {
              id: city.id,
              name: city.name,
              countryCode: city.countryCode,
            }
          : await saveCity(city.name, city.countryCode);
      return saveTrip(
        {
          name: (name.trim() || suggestion).slice(0, 160),
          startsOn,
          endsOn,
          maxTripPhotos,
          maxDayPhotos,
          stages: [{ id: stageId, cityId: resolvedCity.id, startsOn, endsOn }],
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
      className="journey-modal"
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
          Cada viaje tiene un destino principal que cubre todas sus fechas.
        </p>
        <div className="form-columns">
          <label>Límite de fotos del viaje<input type="number" min="1" max="100" required value={maxTripPhotos} onChange={(e) => setMaxTripPhotos(Number(e.target.value))} /></label>
          <label>Límite de fotos por día<input type="number" min="1" max="100" required value={maxDayPhotos} onChange={(e) => setMaxDayPhotos(Number(e.target.value))} /></label>
        </div>
        <p className="journey-form__cover-help">
          {trip?.coverPhotoUrl
            ? "La portada se cambia desde Galería, eligiendo una foto que ya forma parte del viaje."
            : "Después de guardar, agregá o elegí una foto en Galería para usarla como portada."}
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
              onChange={(e) => {
                const nextStart = e.target.value;
                setStartsOn(nextStart);
                if (nextStart > endsOn) setEndsOn(nextStart);
              }}
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
        <fieldset className="journey-stage-form">
          <legend>Destino</legend>
          <CityPicker value={city} onChange={setCity} />
        </fieldset>
        <div className="journey-form__actions">
          <Button disabled={save.isPending || !suggestion || !startsOn || endsOn < startsOn}>
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
