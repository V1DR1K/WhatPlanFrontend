import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ReviewDialogShell } from "../../components/ui/ReviewDialogShell";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import type { ActivityReview, ActivityVisit } from "../../types/domain";
import { createActivityReview, deleteActivityReview, updateActivityReview } from "./whyFun";

export function ActivityReviewForm({ activityId, visit, review, onClose }: { activityId: number; visit: ActivityVisit; review?: ActivityReview; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [comment, setComment] = useState(review?.comment ?? "");
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["activity-visits", activityId] }),
    queryClient.invalidateQueries({ queryKey: ["activity", activityId] }),
    queryClient.invalidateQueries({ queryKey: ["activities"] }),
  ]);
  const mutation = useMutation({
    mutationFn: () => review
      ? updateActivityReview(review.id, { rating, comment: comment || undefined })
      : createActivityReview(visit.id, { rating, comment: comment || undefined }),
    onSuccess: async () => {
      await invalidate();
      showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a la salida.");
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteActivityReview(review!.id),
    onSuccess: async () => {
      await invalidate();
      showNotice("Eliminamos la reseña.");
      onClose();
    },
  });

  return (
    <ReviewDialogShell
      eyebrow="RESEÑA DE LA SALIDA"
      title="¿Cómo la pasaron?"
      onClose={onClose}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        mutation.mutate();
      }}
      pending={mutation.isPending || remove.isPending}
      submitIcon={review ? "💾" : "💬"}
      submitLabel={mutation.isPending ? "Guardando…" : review ? "Guardar reseña" : "Agregar reseña"}
      error={mutation.error?.message ?? remove.error?.message}
      deleteAction={review ? {
        title: "¿Borrar esta reseña?",
        message: "La reseña se eliminará definitivamente de esta salida.",
        confirmLabel: "Borrar reseña",
        pending: remove.isPending,
        onConfirm: () => remove.mutate(),
      } : undefined}
    >
      <label>
        Puntuación
        <StarRating label="Puntuación de la salida" value={rating} onChange={setRating} />
      </label>
      <label>
        Comentario <small className="tiny">Opcional</small>
        <textarea className="review-textarea" value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Contá la experiencia…" />
      </label>
    </ReviewDialogShell>
  );
}
