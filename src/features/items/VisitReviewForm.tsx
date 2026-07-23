import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { StarRating } from "../../components/ui/StarRating";
import { Button } from "../../components/ui/Button";
import type { PlaceVisit, PlaceVisitReview } from "../../types/domain";
import { createVisitReview, deleteVisitReview, updateVisitReview, type PlaceVisitReviewInput } from "./items";
import { showNotice } from "../../lib/flash";

export function VisitReviewForm({ placeId, visit, review, onClose }: { placeId: number; visit: PlaceVisit; review?: PlaceVisitReview; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [overall, setOverall] = useState(review?.overall ?? 4);
  const [taste, setTaste] = useState<number | undefined>(review?.taste);
  const [price, setPrice] = useState<number | undefined>(review?.price);
  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["visit", visit.id] }), queryClient.invalidateQueries({ queryKey: ["visits", placeId] }), queryClient.invalidateQueries({ queryKey: ["place", placeId] }), queryClient.invalidateQueries({ queryKey: ["places"] })]);
  const mutation = useMutation({ mutationFn: (form: FormData) => { const input: PlaceVisitReviewInput = { overall, comment: String(form.get("comment")).trim() || undefined, taste, price }; return review ? updateVisitReview(review.id, input) : createVisitReview(visit.id, input); }, onSuccess: async () => { await invalidate(); showNotice(review ? "Actualizamos la reseña compartida." : "Agregamos la reseña a esta visita."); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteVisitReview(review!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la reseña."); onClose(); } });
  const score = (label: string, value: number | undefined, setValue: (value: number | undefined) => void, optional = false) => <label className="score-field">{label}<span className="place-score-input"><StarRating label={label} value={value} onChange={setValue} />{optional && value !== undefined && <Button variant="tertiary" icon="×" type="button" onClick={() => setValue(undefined)}>Quitar</Button>}</span></label>;
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">RESEÑA DE LA VISITA</p><h2>¿Cómo estuvo?</h2><p className="muted">La puntuación general es obligatoria. Sabor y precio son opcionales.</p>{score("Puntuación general", overall, (value) => { if (value !== undefined) setOverall(value); })}<div className="score-grid">{score("Sabor", taste, setTaste, true)}{score("Precio", price, setPrice, true)}</div><label>Comentario <small className="tiny">Opcional</small><textarea name="comment" defaultValue={review?.comment} maxLength={2000} placeholder="Contá la experiencia…" /></label><Button icon={review ? "✓" : "＋"} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : review ? "Guardar reseña" : "Agregar reseña"}</Button>{review && <Button variant="destructive" icon="×" type="button" disabled={mutation.isPending || remove.isPending} onClick={() => remove.mutate()}>Borrar reseña</Button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
