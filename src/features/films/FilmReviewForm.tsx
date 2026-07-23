import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { SegmentedLevel } from '../../components/ui/SegmentedLevel';
import { StarRating } from '../../components/ui/StarRating';
import type { Film, FilmReview, FilmView } from '../../types/domain';
import { deleteFilmReview, saveFilmReview, updateFilmReview } from './films';
import { filmReviewMetrics, metricLevel } from './reviewMetrics';
import { showNotice } from '../../lib/flash';

const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));

export function FilmReviewForm({ film, view, review, onClose }: { film: Film; view: FilmView; review?: FilmReview; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 4);
  const [favoriteCharacter, setFavoriteCharacter] = useState(review?.favoriteCharacter ?? "");
  const [metrics, setMetrics] = useState<Record<string, number>>(() => Object.fromEntries(filmReviewMetrics.map(metric => [metric.key, review?.metrics?.[metric.key] ?? 3])));
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input = { rating, comment: String(form.get('comment')) || undefined, favoriteCharacter: favoriteCharacter || undefined, metrics };
      return review ? updateFilmReview(film.id, review.id, input) : saveFilmReview(film.id, view.id, input);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['film', film.id] }), qc.invalidateQueries({ queryKey: ['films'] })]);
      showNotice(review ? 'Actualizamos tu reseña.' : 'Guardamos tu reseña.');
      onClose();
    },
  });
  const remove = useMutation({ mutationFn: () => deleteFilmReview(film.id, review!.id), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['film', film.id] }), qc.invalidateQueries({ queryKey: ['films'] })]); showNotice('Eliminamos la reseña.'); onClose(); } });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
    <p className="eyebrow">{review ? 'EDITAR RESEÑA' : 'RESEÑA DE LA VISTA'}</p>
    <h2>{film.tmdb?.title ?? film.title}</h2>
    <p className="muted">Vista del {dateLabel(view.watchedOn)}</p>
    <label className="film-rating">¿Cuánto te gustó?<StarRating label="Puntuación de la película" value={rating} onChange={setRating} /></label>
    {!!film.tmdb?.cast.filter(member => member.character).length && <label>Personaje favorito<select value={favoriteCharacter} onChange={event => setFavoriteCharacter(event.target.value)}><option value="">No elegir</option>{film.tmdb.cast.filter(member => member.character).map(member => <option key={`${member.name}-${member.character}`} value={member.character}>{member.character} · {member.name}</option>)}</select></label>}
    <fieldset className="film-metric-fields"><legend>¿Cómo fue la película?</legend>{filmReviewMetrics.map(metric => <div className="film-metric-field" key={metric.key}><div><strong>{metric.label}</strong><small>{metricLevel(metric.levels, metrics[metric.key])}</small></div><SegmentedLevel label={metric.label} levels={metric.levels} value={metrics[metric.key]} onChange={value => setMetrics(current => ({ ...current, [metric.key]: value }))} /></div>)}</fieldset>
    <label>Reseña<textarea name="comment" defaultValue={review?.comment} placeholder="¿Qué te pareció?" /></label>
    <Button icon={review ? '✓' : '＋'} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? 'Guardando…' : review ? 'Guardar reseña' : 'Agregar reseña'}</Button>
    {review && <Button variant="destructive" icon="×" type="button" disabled={mutation.isPending || remove.isPending} onClick={() => remove.mutate()}>Borrar reseña</Button>}
    {(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}
  </form></Modal>;
}
