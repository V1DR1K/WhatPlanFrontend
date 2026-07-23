import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import type { Place, PlaceReview } from "../../types/domain";
import { showNotice } from "../../lib/flash";
import { savePlaceReview } from "./places";

const metrics = [["location", "Ubicación"], ["heating", "Calefacción"], ["bathrooms", "Baños"], ["exterior", "Exterior"], ["seating", "Asientos"], ["service", "Atención"], ["ambiance", "Ambiente"]] as const;
type Metric = typeof metrics[number][0];

export function PlaceReviewForm({ place, review, onClose }: { place: Place; review?: PlaceReview; onClose: () => void }) {
 const qc = useQueryClient();
 const [scores, setScores] = useState<Record<Metric, number | undefined>>(() => Object.fromEntries(metrics.map(([key]) => [key, review?.[key]])) as Record<Metric, number | undefined>);
 const mutation = useMutation({
  mutationFn: (form: FormData) => savePlaceReview(place.id, { comment: String(form.get("comment")).trim() || undefined, ...scores }),
  onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["place", place.id] }), qc.invalidateQueries({ queryKey: ["places"] })]); showNotice("Actualizamos la opinión del lugar."); onClose(); },
 });
  const score = (key: Metric, label: string) => <label className="score-field" key={key}>{label}<span className="place-score-input"><StarRating label={label} value={scores[key]} onChange={(value) => setScores((current) => ({ ...current, [key]: value }))} />{scores[key] !== undefined && <Button variant="tertiary" icon="✕" type="button" onClick={() => setScores((current) => ({ ...current, [key]: undefined }))}>Quitar</Button>}</span></label>;
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">OPINIÓN DEL LUGAR</p><h2>{place.name}</h2><p className="muted">Calificá el espacio, la atención y las comodidades. Esto no pertenece a una visita puntual.</p><div className="venue-score-grid">{metrics.map(([key, label]) => score(key, label))}</div><label>Comentario <small className="tiny">Opcional</small><textarea name="comment" defaultValue={review?.comment} maxLength={1000} placeholder="¿Cómo es el lugar?" /></label><Button icon="💾" disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : "Guardar opinión del lugar"}</Button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;
}
