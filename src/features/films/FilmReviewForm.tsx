import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { SegmentedLevel } from '../../components/ui/SegmentedLevel';
import { StarRating } from '../../components/ui/StarRating';
import type { Film, FilmReview, FilmView } from '../../types/domain';
import { saveFilmReview, updateFilmReview } from './films';
import { filmReviewMetrics, metricLevel } from './reviewMetrics';
import { showNotice } from '../../lib/flash';

const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));

export function FilmReviewForm({ film, view, review, onClose }: { film: Film; view: FilmView; review?: FilmReview; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [metrics, setMetrics] = useState<Record<string, number>>(() => Object.fromEntries(filmReviewMetrics.map(metric => [metric.key, review?.metrics?.[metric.key] ?? 3])));
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input = { rating, comment: String(form.get('comment')) || undefined, metrics };
      return review ? updateFilmReview(film.id, review.id, input) : saveFilmReview(film.id, view.id, input);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['film', film.id] }), qc.invalidateQueries({ queryKey: ['films'] })]);
      showNotice(review ? 'Actualizamos tu reseña.' : 'Guardamos tu reseña.');
      onClose();
    },
  });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
    <p className="eyebrow">{review ? 'EDITAR RESEÑA' : 'RESEÑA DE LA VISTA'}</p>
    <h2>{film.tmdb?.title ?? film.title}</h2>
    <p className="muted">Vista del {dateLabel(view.watchedOn)}</p>
    <label className="film-rating">¿Cuánto te gustó?<StarRating label="Puntuación de la película" value={rating} onChange={setRating} /></label>
    <fieldset className="film-metric-fields"><legend>¿Cómo fue la película?</legend>{filmReviewMetrics.map(metric => <div className="film-metric-field" key={metric.key}><div><strong>{metric.label}</strong><small>{metricLevel(metric.levels, metrics[metric.key])}</small></div><SegmentedLevel label={metric.label} levels={metric.levels} value={metrics[metric.key]} onChange={value => setMetrics(current => ({ ...current, [metric.key]: value }))} /></div>)}</fieldset>
    <label>Reseña<textarea name="comment" defaultValue={review?.comment} placeholder="¿Qué te pareció?" /></label>
    <button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : review ? 'Guardar cambios' : 'Guardar reseña'} ✦</button>
    {mutation.error && <p className="form-error">{mutation.error.message}</p>}
  </form></Modal>;
}
