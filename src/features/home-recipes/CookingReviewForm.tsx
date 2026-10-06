import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ReviewDialogShell } from "../../components/ui/ReviewDialogShell";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import type { Cooking, CookingReview } from "../../types/domain";
import { createCookingReview, deleteCookingReview, updateCookingReview } from "./homeRecipes";

export function CookingReviewForm({ cooking, review, onClose }: { cooking: Cooking; review?: CookingReview; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [complexity, setComplexity] = useState(review?.complexity ?? 1);
  const [taste, setTaste] = useState(review?.taste ?? 4);
  const [comment, setComment] = useState(review?.comment ?? "");
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["cookings"] }),
    queryClient.invalidateQueries({ queryKey: ["recipe", cooking.recipe.id] }),
    queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  ]);
  const mutation = useMutation({
    mutationFn: () => review
      ? updateCookingReview(review.id, { rating, complexity, taste, comment: comment || undefined })
      : createCookingReview(cooking.id, { rating, complexity, taste, comment: comment || undefined }),
    onSuccess: async () => {
      await invalidate();
      showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a esta cocinada.");
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteCookingReview(review!.id),
    onSuccess: async () => {
      await invalidate();
      showNotice("Eliminamos la reseña.");
      onClose();
    },
  });

  return (
    <ReviewDialogShell
      eyebrow="RESEÑA DE LA COCINADA"
      title="¿Cómo salió?"
      context={cooking.recipe.name}
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
        message: "La reseña se eliminará definitivamente de esta cocinada.",
        confirmLabel: "Borrar reseña",
        pending: remove.isPending,
        onConfirm: () => remove.mutate(),
      } : undefined}
    >
      <label>
        Puntuación
        <StarRating label="Puntuación de la cocinada" value={rating} onChange={setRating} />
      </label>
      <div className="form-columns">
        <label>Sabor<StarRating label="Sabor de la receta" value={taste} onChange={setTaste} /></label>
        <label>Complejidad<StarRating label="Complejidad de la receta" value={complexity} onChange={setComplexity} /></label>
      </div>
      <label>
        Comentario <small className="tiny">Opcional</small>
        <textarea className="review-textarea" value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Contá qué gustó o cambiarías…" />
      </label>
    </ReviewDialogShell>
  );
}
