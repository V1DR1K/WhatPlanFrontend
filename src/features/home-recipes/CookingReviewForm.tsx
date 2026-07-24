import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import type { Cooking, CookingReview } from "../../types/domain";
import { createCookingReview, deleteCookingReview, updateCookingReview } from "./homeRecipes";

export function CookingReviewForm({ cooking, review, onClose }: { cooking: Cooking; review?: CookingReview; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [comment, setComment] = useState(review?.comment ?? "");
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["cookings"] }), qc.invalidateQueries({ queryKey: ["recipe", cooking.recipe.id] }), qc.invalidateQueries({ queryKey: ["recipes"] })]);
  const mutation = useMutation({ mutationFn: () => review ? updateCookingReview(review.id, { rating, comment: comment.trim() || undefined }) : createCookingReview(cooking.id, { rating, comment: comment.trim() || undefined }), onSuccess: async () => { await invalidate(); showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a esta cocinada."); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteCookingReview(review!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la reseña."); onClose(); } });
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">RESEÑA DE LA COCINADA</p><h2>¿Cómo salió?</h2><label>Puntuación<StarRating label="Puntuación de la cocinada" value={rating} onChange={setRating} /></label><label>Comentario <small className="tiny">Opcional</small><textarea className="review-textarea" value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Contá qué gustó o cambiarías…" /></label><Button icon={review ? "💾" : "💬"} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : review ? "Guardar reseña" : "Agregar reseña"}</Button>{review && <Button variant="destructive" icon="🗑️" type="button" onClick={() => remove.mutate()}>Borrar reseña</Button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
