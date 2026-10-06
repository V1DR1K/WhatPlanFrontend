import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { ReviewDialogShell } from "../../components/ui/ReviewDialogShell";
import { StarRating } from "../../components/ui/StarRating";
import type { Place, PlaceReview } from "../../types/domain";
import { showNotice } from "../../lib/flash";
import { savePlaceReview } from "./places";

const metrics = [["location", "Ubicación"], ["heating", "Calefacción"], ["bathrooms", "Baños"], ["exterior", "Exterior"], ["seating", "Asientos"], ["service", "Atención"], ["ambiance", "Ambiente"]] as const;
type Metric = typeof metrics[number][0];

export function PlaceReviewForm({ place, review, onClose }: { place: Place; review?: PlaceReview; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<Metric, number | undefined>>(
    () => Object.fromEntries(metrics.map(([key]) => [key, review?.[key]])) as Record<Metric, number | undefined>,
  );
  const mutation = useMutation({
    mutationFn: (form: FormData) => savePlaceReview(place.id, {
      comment: String(form.get("comment")) || undefined,
      ...scores,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["place", place.id] }),
        queryClient.invalidateQueries({ queryKey: ["places"] }),
      ]);
      showNotice("Actualizamos la opinión del lugar.");
      onClose();
    },
  });

  const score = (key: Metric, label: string) => (
    <label className="score-field" key={key}>
      {label}
      <span className="place-score-input">
        <StarRating label={label} value={scores[key]} onChange={(value) => setScores((current) => ({ ...current, [key]: value }))} />
        {scores[key] !== undefined && (
          <Button variant="tertiary" icon="✕" type="button" onClick={() => setScores((current) => ({ ...current, [key]: undefined }))}>
            Quitar
          </Button>
        )}
      </span>
    </label>
  );

  return (
    <ReviewDialogShell
      eyebrow="OPINIÓN DEL LUGAR"
      title={place.name}
      context="Calificá el espacio, la atención y las comodidades. Esto no pertenece a una visita puntual."
      onClose={onClose}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}
      pending={mutation.isPending}
      submitIcon="💾"
      submitLabel={mutation.isPending ? "Guardando…" : "Guardar opinión del lugar"}
      error={mutation.error?.message}
    >
      <div className="venue-score-grid">{metrics.map(([key, label]) => score(key, label))}</div>
      <label>
        Comentario <small className="tiny">Opcional</small>
        <textarea className="review-textarea" name="comment" defaultValue={review?.comment} maxLength={1000} placeholder="¿Cómo es el lugar?" />
      </label>
    </ReviewDialogShell>
  );
}
