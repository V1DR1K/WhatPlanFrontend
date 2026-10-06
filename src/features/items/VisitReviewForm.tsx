import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { ReviewDialogShell } from "../../components/ui/ReviewDialogShell";
import { StarRating } from "../../components/ui/StarRating";
import type { PlaceVisit, PlaceVisitReview } from "../../types/domain";
import { createVisitReview, deleteVisitReview, updateVisitReview, type PlaceVisitReviewInput } from "./items";
import { showNotice } from "../../lib/flash";

export function VisitReviewForm({ placeId, visit, review, onClose }: { placeId: number; visit: PlaceVisit; review?: PlaceVisitReview; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [overall, setOverall] = useState(review?.overall ?? 4);
  const [taste, setTaste] = useState<number | undefined>(review?.taste);
  const [price, setPrice] = useState<number | undefined>(review?.price);
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["visit", visit.id] }),
    queryClient.invalidateQueries({ queryKey: ["visits", placeId] }),
    queryClient.invalidateQueries({ queryKey: ["place", placeId] }),
    queryClient.invalidateQueries({ queryKey: ["places"] }),
  ]);
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input: PlaceVisitReviewInput = {
        overall,
        comment: String(form.get("comment")) || undefined,
        taste,
        price,
      };
      return review ? updateVisitReview(review.id, input) : createVisitReview(visit.id, input);
    },
    onSuccess: async () => {
      await invalidate();
      showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a esta visita.");
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteVisitReview(review!.id),
    onSuccess: async () => {
      await invalidate();
      showNotice("Eliminamos la reseña.");
      onClose();
    },
  });
  const score = (label: string, value: number | undefined, setValue: (value: number | undefined) => void, optional = false, fieldClassName = "") => (
    <label className={["score-field", fieldClassName].filter(Boolean).join(" ")} key={label}>
      {label}
      <span className="place-score-input">
        <StarRating label={label} value={value} onChange={setValue} />
        {optional && value !== undefined && (
          <Button variant="tertiary" icon="✕" type="button" onClick={() => setValue(undefined)}>Quitar</Button>
        )}
      </span>
    </label>
  );

  return (
    <ReviewDialogShell
      eyebrow="RESEÑA DE LA VISITA"
      title="¿Cómo estuvo?"
      context="La puntuación general es obligatoria. Sabor y precio son opcionales."
      className="visit-review-modal"
      onClose={onClose}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}
      pending={mutation.isPending || remove.isPending}
      submitIcon={review ? "💾" : "💬"}
      submitLabel={mutation.isPending ? "Guardando…" : review ? "Guardar reseña" : "Agregar reseña"}
      error={mutation.error?.message ?? remove.error?.message}
      deleteAction={review ? {
        title: "¿Borrar esta reseña?",
        message: "La reseña se eliminará definitivamente de esta visita.",
        confirmLabel: "Borrar reseña",
        pending: remove.isPending,
        onConfirm: () => remove.mutate(),
      } : undefined}
    >
      {score("Puntuación general", overall, (value) => { if (value !== undefined) setOverall(value); }, false, "score-field--overall")}
      <div className="score-grid">
        {score("Sabor", taste, setTaste, true)}
        {score("Precio", price, setPrice, true)}
      </div>
      <label>
        Comentario <small className="tiny">Opcional</small>
        <textarea className="review-textarea" name="comment" defaultValue={review?.comment} maxLength={2000} placeholder="Contá la experiencia…" />
      </label>
    </ReviewDialogShell>
  );
}
