import { useState, useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PhotoPicker } from "../../components/ui/PhotoPicker";
import { showNotice } from "../../lib/flash";
import {
  getCities,
  getCountries,
  saveCity,
  saveTrip,
  type City,
  type Trip,
  today,
  uploadJourneyPhoto,
  setJourneyCover,
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
  manualDates: boolean;
};
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
const dayString = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);
export function distributeDates<T extends Pick<StageDraft, "startsOn" | "endsOn" | "manualDates">>(stages: T[], start: string, end: string) {
  const first = dayNumber(start); const finish = dayNumber(end);
  if (finish < first) return { stages, error: "La fecha de fin debe ser posterior al inicio." };
  const next = stages.map((stage) => ({ ...stage }));
  let cursor = first; let index = 0;
  while (index < next.length) {
    if (next[index].manualDates) {
      const from = dayNumber(next[index].startsOn); const to = dayNumber(next[index].endsOn);
      if (from !== cursor || to < from || to > finish)
        return { stages, error: "Las etapas fijas deben quedar consecutivas. Agregá un destino automático para cubrir los días libres." };
      cursor = to + 1; index += 1; continue;
    }
    const runStart = index;
    while (index < next.length && !next[index].manualDates) index += 1;
    const count = index - runStart;
    const boundary = index < next.length ? dayNumber(next[index].startsOn) : finish + 1;
    const available = boundary - cursor;
    if (available < count)
      return { stages, error: "No quedan suficientes días libres para repartir los destinos. Ajustá alguna fecha o ampliá el viaje." };
    const base = Math.floor(available / count); const remainder = available % count;
    for (let offset = 0; offset < count; offset += 1) {
      const length = base + (offset < remainder ? 1 : 0);
      next[runStart + offset].startsOn = dayString(cursor);
      next[runStart + offset].endsOn = dayString(cursor + length - 1);
      cursor += length;
    }
  }
  if (cursor !== finish + 1)
    return { stages, error: "Quedaron días del viaje sin destino. Ajustá una etapa o agregá otro destino." };
  return { stages: next, error: "" };
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
  const [coverFile, setCoverFile] = useState<File>();
  const [allocationError, setAllocationError] = useState("");
  const [stages, setStages] = useState<StageDraft[]>(
    trip?.stages.map((s) => ({
      key: s.id,
      stageId: s.id,
      manualDates: true,
      city: { id: s.cityId, name: s.cityName, countryCode: s.countryCode },
      startsOn: s.startsOn,
      endsOn: s.endsOn,
    })) ?? [
      {
        key: crypto.randomUUID(),
        city: { countryCode: "AR", name: "" },
        startsOn: today(),
        endsOn: today(),
        manualDates: false,
      },
    ],
  );
  const update = (key: string, change: Partial<StageDraft>) => {
    const next = stages.map((s) => s.key === key
      ? { ...s, ...change,
          manualDates: "startsOn" in change || "endsOn" in change ? true : s.manualDates }
      : s);
    const allocation = distributeDates(next, startsOn, endsOn);
    setStages(allocation.stages);
    setAllocationError(allocation.error);
  };
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
          maxTripPhotos,
          maxDayPhotos,
          stages: resolved,
        },
        trip?.id,
      );
    },
    onSuccess: async (saved) => {
      try {
        if (coverFile) {
          const photo = await uploadJourneyPhoto(saved.id, coverFile, "TRIP");
          await setJourneyCover(saved.id, photo.id);
        }
      } catch (reason) {
        showNotice(reason instanceof Error
          ? `El viaje se guardó, pero no pudimos subir la portada: ${reason.message}`
          : "El viaje se guardó, pero no pudimos subir la portada.");
        await client.invalidateQueries({ queryKey: ["journey", saved.id] });
        onClose();
        navigate(`/app/whither-journey/${saved.id}`);
        return;
      }
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
          El recorrido reparte las fechas disponibles entre los destinos.
        </p>
        <div className="form-columns">
          <label>Límite de fotos del viaje<input type="number" min="1" max="100" required value={maxTripPhotos} onChange={(e) => setMaxTripPhotos(Number(e.target.value))} /></label>
          <label>Límite de fotos por día<input type="number" min="1" max="100" required value={maxDayPhotos} onChange={(e) => setMaxDayPhotos(Number(e.target.value))} /></label>
        </div>
        <fieldset className="journey-cover-picker">
          <legend>Foto de portada</legend>
          <PhotoPicker maxFiles={1} onChange={(files) => setCoverFile(files[0])} selectLabel="Elegir foto de portada" />
          {coverFile && <p>Vista previa de {coverFile.name}</p>}
          {trip?.coverPhotoUrl && !coverFile && <small>La portada actual se conserva si no elegís otra.</small>}
        </fieldset>
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
                const allocation = distributeDates(stages, nextStart, endsOn);
                setStages(allocation.stages);
                setAllocationError(allocation.error);
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
              onChange={(e) => {
                const nextEnd = e.target.value;
                setEndsOn(nextEnd);
                const allocation = distributeDates(stages, startsOn, nextEnd);
                setStages(allocation.stages);
                setAllocationError(allocation.error);
              }}
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
                onClick={() => {
                  const allocation = distributeDates(stages.filter((v) => v.key !== s.key), startsOn, endsOn);
                  setStages(allocation.stages);
                  setAllocationError(allocation.error);
                }}
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
          onClick={() => {
            const allocation = distributeDates([
              ...stages,
              {
                key: crypto.randomUUID(),
                city: { countryCode: "AR", name: "" },
                startsOn,
                endsOn,
                manualDates: false,
              },
            ], startsOn, endsOn);
            setStages(allocation.stages);
            setAllocationError(allocation.error);
          }}
        >
          Agregar otro destino
        </Button>
        {allocationError && <p className="form-error" role="alert">{allocationError}</p>}
        <div className="journey-form__actions">
          <Button disabled={save.isPending || !suggestion || !!allocationError}>
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
