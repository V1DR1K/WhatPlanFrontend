import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "../../lib/locationQuery";
import { useZoneContext } from "../../lib/zoneContext";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { showNotice } from "../../lib/flash";
import { CityPicker, type CityDraft } from "./JourneyForm";
import { getCity, saveCity, saveOrigin } from "./journey";
export function OriginSettingsPanel() {
  const context = useZoneContext();
  const client = useQueryClient();
  const [draft, setDraft] = useState<CityDraft>();
  const city = useQuery({
    queryKey: ["origin-city", context.defaultZoneId],
    queryFn: () => getCity(context.defaultZoneId!),
    enabled: !!context.defaultZoneId,
  });
  const value = draft ?? city.data;
  const save = useMutation({
    mutationFn: async () => {
      if (!value) throw new Error("Elegí una ciudad.");
      const resolved = value.id
        ? value
        : await saveCity(value.name, value.countryCode);
      return saveOrigin(resolved.id!);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["location-context"] });
      context.selectLocation("origin");
      setDraft(undefined);
      await client.invalidateQueries({ queryKey: ["cities"] });
      showNotice("Actualizamos la ciudad de origen de ambos.");
    },
  });
  return (
    <section
      className="settings-page__panel"
      aria-labelledby="zone-default-title"
    >
      <h2 id="zone-default-title">Zona al entrar</h2>
      <p>
        Su ciudad de origen es compartida. Al entrar, ambos verán los catálogos
        de esta ciudad; los viajes agregan nuevos destinos al filtro.
      </p>
      {city.isLoading && <LoadingSkeleton variant="inline" inlineKind="location" section="journey" />}
      {city.error && (
        <p className="form-error" role="alert">
          {city.error.message}
        </p>
      )}
      {value && (
        <form
          className="journey-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <CityPicker value={value} onChange={setDraft} />
          <Button disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar ciudad de origen"}
          </Button>
          {save.error && (
            <p className="form-error" role="alert">
              {save.error.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
