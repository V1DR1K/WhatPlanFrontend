import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import type { ActivityReview, ActivityVisit } from "../../types/domain";
import { createActivityReview, deleteActivityReview, updateActivityReview } from "./whyFun";

export function ActivityReviewForm({ activityId, visit, review, onClose }: { activityId: number; visit: ActivityVisit; review?: ActivityReview; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [comment, setComment] = useState(review?.comment ?? "");
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["activity-visits", activityId] }), qc.invalidateQueries({ queryKey: ["activity", activityId] }), qc.invalidateQueries({ queryKey: ["activities"] })]);
  const mutation = useMutation({ mutationFn: () => review ? updateActivityReview(review.id, { rating, comment: comment.trim() || undefined }) : createActivityReview(visit.id, { rating, comment: comment.trim() || undefined }), onSuccess: async () => { await invalidate(); showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a la salida."); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteActivityReview(review!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la reseña."); onClose(); } });
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">RESEÑA DE LA SALIDA</p><h2>¿Cómo la pasaron?</h2><label>Puntuación<StarRating label="Puntuación de la salida" value={rating} onChange={setRating} /></label><label>Comentario <small className="tiny">Opcional</small><textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Contá la experiencia…" /></label><Button icon={review ? "💾" : "💬"} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : review ? "Guardar reseña" : "Agregar reseña"}</Button>{review && <Button variant="destructive" icon="🗑️" type="button" onClick={() => remove.mutate()}>Borrar reseña</Button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
