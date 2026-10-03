import { useEffect, useState } from "react";
import { useZoneContext } from "../../lib/zoneContext";
import { useQuery } from "../../lib/locationQuery";
import { getExperienceLocation, type Binding, type Section } from "./journey";
export function useLocationDraft(city?: number | null, stage?: string | null) {
  const context = useZoneContext();
  const [cityId, setCityId] = useState<number | null>(
    city ?? context.selectedZoneId ?? context.defaultZoneId,
  );
  const [stageId, setStageId] = useState<string | null>(
    stage ?? (city == null ? context.selectedStageId : null),
  );
  return { cityId, stageId, setCityId, setStageId };
}
export function useExperienceDraft(
  section: Section,
  entityId: number,
  experienceId?: number,
  physicalCity?: number,
) {
  const draft = useLocationDraft(physicalCity);
  const context = useZoneContext();
  const location = useQuery({
    queryKey: ["experience-location", section, entityId, experienceId],
    queryFn: () => getExperienceLocation({ section, entityId, experienceId }),
    enabled: !!experienceId,
  });
  const [loaded, setLoaded] = useState(!experienceId);
  useEffect(() => {
    if (location.data && !loaded) {
      draft.setCityId(location.data.cityId ?? null);
      draft.setStageId(location.data.stageId ?? null);
      setLoaded(true);
    }
  }, [draft, loaded, location.data]);
  const [pointId] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return q.get("journeySection") === section &&
      q.get("journeyEntity") === String(entityId)
      ? q.get("journeyPoint")
      : null;
  });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (
      !experienceId &&
      q.get("journeySection") === section &&
      q.get("journeyEntity") === String(entityId)
    ) {
      const selected = context.options.find(
        (o) => o.stageId === q.get("journeyStage"),
      );
      if (selected) {
        draft.setCityId(selected.cityId);
        draft.setStageId(selected.stageId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Physical venues may still inherit a matching selected destination on a new experience.
  useEffect(() => {
    if (
      !experienceId &&
      physicalCity != null &&
      context.selectedZoneId === physicalCity
    )
      draft.setStageId(context.selectedStageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const binding: Binding = {
    cityId: draft.cityId ?? undefined,
    stageId: draft.stageId,
    pointId:
      (draft.stageId === location.data?.stageId
        ? location.data?.pointId
        : undefined) ??
      (new URLSearchParams(window.location.search).get("journeyStage") ===
      draft.stageId
        ? pointId
        : null),
  };
  return {
    ...draft,
    binding,
    loading: !!experienceId && !loaded,
    error: location.error,
  };
}
export function LocationFields({
  cityId,
  stageId,
  onChange,
  physicalCity,
  disabled = false,
}: {
  cityId: number | null;
  stageId: string | null;
  onChange: (city: number, stage: string | null) => void;
  physicalCity?: number;
  disabled?: boolean;
}) {
  const { options } = useZoneContext();
  const base =
    physicalCity == null
      ? options
      : options.filter((o) => o.cityId === physicalCity);
  const cities = new Map(base.map((o) => [o.cityId, o.label.split(" · ")[0]]));
  if (cityId && !cities.has(cityId)) cities.set(cityId, "Ubicación actual");
  const choices = [
    ...base,
    ...Array.from(cities)
      .filter(([id]) => !base.some((o) => o.cityId === id && !o.stageId))
      .map(([id, name]) => ({
        key: `city-${id}`,
        cityId: id,
        stageId: null,
        journeyId: null,
        label: `${name} · Sin viaje`,
      })),
  ];
  const selected = choices.find(
    (o) => o.cityId === cityId && o.stageId === stageId,
  );
  return (
    <label className="zone-assignment-field">
      Ciudad y viaje
      <select
        required
        value={selected?.key ?? "existing"}
        disabled={disabled}
        onChange={(e) => {
          const option = choices.find((o) => o.key === e.target.value);
          if (option) onChange(option.cityId, option.stageId);
        }}
      >
        {!selected && (
          <option value="existing">
            {cityId
              ? "Ubicación actual · Sin viaje activo"
              : "Elegí una ubicación"}
          </option>
        )}
        {choices.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
