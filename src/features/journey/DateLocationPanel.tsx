import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { LocationFields, useLocationDraft } from "./LocationFields";
import { saveDateLocation } from "./journey";
export function DateLocationPanel({
  specialDateId,
  date,
  cityId,
  stageId,
}: {
  specialDateId: number;
  date: string;
  cityId?: number;
  stageId?: string | null;
}) {
  const draft = useLocationDraft(cityId, stageId);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      saveDateLocation(specialDateId, date, {
        cityId: draft.cityId ?? undefined,
        stageId: draft.stageId,
      }),
    onSuccess: async () => {
      await Promise.all(
        ["when-date", "when-dates", "journey"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setOpen(false);
    },
  });
  return (
    <section className="experience-journey-panel">
      <Button variant="secondary" onClick={() => setOpen(!open)}>
        Ubicación / viaje de esta fecha
      </Button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <LocationFields
            cityId={draft.cityId}
            stageId={draft.stageId}
            onChange={(city, stage) => {
              draft.setCityId(city);
              draft.setStageId(stage);
            }}
          />
          <Button disabled={save.isPending}>Guardar ubicación</Button>
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
