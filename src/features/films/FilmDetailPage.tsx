import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SegmentedLevel } from '../../components/ui/SegmentedLevel';
import { StarRating } from '../../components/ui/StarRating';
import { mediaUrl, session } from '../../lib/api';
import type { FilmReview } from '../../types/domain';
import { FilmForm } from './FilmForm';
import { FilmReviewForm } from './FilmReviewForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { deleteFilm, getFilm } from './films';
import { filmReviewMetrics, metricLevel } from './reviewMetrics';

const viewedLabel = (date?: string) => date ? `VISTA ${date.split('-').reverse().join('/')}` : 'PARA VER';

export function FilmDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [editingReview, setEditingReview] = useState<FilmReview>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedReviewDate, setSelectedReviewDate] = useState('');
  const filmQuery = useQuery({ queryKey: ['film', id], queryFn: () => getFilm(id), enabled: validId });
  const reviewDates = [...new Set((filmQuery.data?.reviews ?? []).map(review => review.watchedOn).filter((date): date is string => Boolean(date)))];
  useEffect(() => { if (reviewDates.length && !reviewDates.includes(selectedReviewDate)) setSelectedReviewDate(reviewDates[0]); }, [reviewDates, selectedReviewDate]);
  const remove = useMutation({ mutationFn: () => deleteFilm(id), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['films'] }); navigate('/films'); } });

  if (!validId || filmQuery.isError || (!filmQuery.isLoading && !filmQuery.data)) return <p className="form-error">No pudimos abrir esa película. Volvé a la sala e intentá otra vez.</p>;
  if (filmQuery.isLoading) return <p>Cargando película…</p>;

  const film = filmQuery.data!;
  const tmdb = film.tmdb;
  const title = tmdb?.title ?? film.title;
  const posterUrl = tmdb?.posterUrl ?? film.posterUrl;
  const genres = tmdb?.genres.length ? tmdb.genres : film.genres;
  const synopsis = tmdb?.synopsis ?? film.synopsis;
  const releaseDate = tmdb?.releaseDate ?? film.releaseDate;
  const selectedReviewIndex = reviewDates.indexOf(selectedReviewDate);
  const reviewsForDate = film.reviews.filter(review => review.watchedOn === selectedReviewDate);
  const visitNumber = reviewDates.length - selectedReviewIndex;

  return <section className="film-detail">
    <Link to="/films">← Volver a WhichFilm</Link>
    <div className="film-detail__head">
      <div className="film-detail__poster">{posterUrl ? <img src={mediaUrl(posterUrl)} alt={`Póster de ${title}`} /> : <span>🍿</span>}</div>
      <div>
        <p className="eyebrow">{viewedLabel(film.lastWatchedOn)} · {film.platform ? `${film.platform.icon} ${film.platform.name}` : 'PLATAFORMA PENDIENTE'}</p>
        <h1>{title}</h1>
        {tmdb?.originalTitle && tmdb.originalTitle !== title && <p className="tmdb-original-title">{tmdb.originalTitle}</p>}
        <div className="genre-pills genre-pills--detail">{genres.map(genre => <span key={genre}>{genre}</span>)}</div>
        <p className="film-synopsis">{synopsis || 'Todavía no hay una sinopsis disponible.'}</p>
      </div>
      <div className="detail-actions">
        <button className="secondary-button" onClick={() => setEditing(true)}>✎ Editar ficha</button>
        <button className="main-button" onClick={() => setReviewing(true)}>La vimos de nuevo 🍿</button>
        <button className="text-button" disabled={remove.isPending} onClick={() => setConfirmingDelete(true)}>{remove.isPending ? 'Borrando…' : 'Borrar película'}</button>
      </div>
    </div>
    {tmdb && <section className="tmdb-film-info">
      <div className="tmdb-film-stats">
        <article><span>Estreno</span><strong>{releaseDate ? releaseDate.slice(0, 4) : 'Sin fecha'}</strong></article>
        <article><span>Duración</span><strong>{tmdb.runtime ? `${tmdb.runtime} min` : 'Sin dato'}</strong></article>
        <article><span>Dirección</span><strong>{tmdb.director ?? 'Sin dato'}</strong></article>
        <article><span>TMDB</span><strong>{tmdb.voteAverage !== undefined ? `${tmdb.voteAverage.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10` : 'Sin puntaje'}</strong>{tmdb.voteCount !== undefined && <small>{tmdb.voteCount.toLocaleString('es-AR')} votos</small>}</article>
      </div>
      {tmdb.trailerUrl && <a className="tmdb-trailer-link" href={tmdb.trailerUrl} target="_blank" rel="noreferrer">Ver tráiler en YouTube <span aria-hidden="true">↗</span></a>}
      {!!tmdb.cast.length && <section className="tmdb-cast"><div className="section-title"><div><p className="eyebrow">DESDE TMDB</p><h2>El reparto</h2></div><strong>{tmdb.cast.length} integrantes</strong></div><div className="tmdb-cast-grid">{tmdb.cast.map(member => <article key={`${member.name}-${member.character ?? ''}`}>{member.profileUrl ? <img src={mediaUrl(member.profileUrl)} alt={`Foto de ${member.name}`} loading="lazy" /> : <span aria-hidden="true">🎭</span>}<div><h3>{member.name}</h3><p>{member.character || 'Reparto'}</p></div></article>)}</div></section>}
      <p className="tmdb-attribution">Datos e imágenes de <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </section>}
    <section className="watch-counter" aria-label="Contador de veces vistas">
      <div><p className="eyebrow">CONTADOR COMPARTIDO</p><h2>{film.watchedCount === 0 ? 'Todavía no la vieron' : `${film.watchedCount} ${film.watchedCount === 1 ? 'vez' : 'veces'}`}</h2><p>Última vista: {viewedLabel(film.lastWatchedOn)}</p></div>
      <div><button className="counter-add" onClick={() => setReviewing(true)}>La vimos de nuevo 🍿</button></div>
    </section>
    <section className="reviews-section">
      <div className="section-title"><div><p className="eyebrow">HISTORIAL DE VISTAS</p><h2>Reseñas</h2></div><strong>{film.reviews.length}</strong></div>
      {!!reviewDates.length && <div className="item-date-pager" aria-label="Navegar reseñas por fecha"><button type="button" className="date-chevron" aria-label="Ver vista más reciente" disabled={selectedReviewIndex <= 0} onClick={() => setSelectedReviewDate(reviewDates[selectedReviewIndex - 1])}>‹</button><label>Vista #{visitNumber}<select value={selectedReviewDate} onChange={event => setSelectedReviewDate(event.target.value)}>{reviewDates.map((date, index) => <option key={date} value={date}>Vista #{reviewDates.length - index} · {viewedLabel(date)}</option>)}</select></label><button type="button" className="date-chevron" aria-label="Ver vista anterior" disabled={selectedReviewIndex < 0 || selectedReviewIndex >= reviewDates.length - 1} onClick={() => setSelectedReviewDate(reviewDates[selectedReviewIndex + 1])}>›</button></div>}
      <div className="film-review-columns">{reviewsForDate.map(review => <ReviewCard key={review.id} review={review} visitNumber={visitNumber} own={review.author === session.get()?.username} onEdit={() => setEditingReview(review)} />)}</div>
      {!film.reviews.length && <p className="empty-state">Todavía no hay reseñas. Registren la primera vista.</p>}
    </section>
    {editing && <FilmForm film={film} onClose={() => setEditing(false)} />}
    {reviewing && <FilmReviewForm film={film} onClose={() => setReviewing(false)} />}
    {editingReview && <FilmReviewForm film={film} review={editingReview} onClose={() => setEditingReview(undefined)} />}
    {confirmingDelete && <ConfirmDialog title="¿Borrar esta película?" message="Se eliminará de la lista junto con sus reseñas." confirmLabel="Borrar película" pending={remove.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => remove.mutate()} />}
  </section>;
}

function ReviewCard({ review, visitNumber, own, onEdit }: { review: FilmReview; visitNumber: number; own: boolean; onEdit: () => void }) {
  return <article className="film-review-card"><div><span className="review-avatar">{review.author[0].toUpperCase()}</span><h3>{review.author === 'tomas' ? 'Tomás' : 'Avril'}</h3>{own && <button className="icon-edit" type="button" aria-label="Editar reseña" onClick={onEdit}>✎</button>}</div><StarRating label={`Puntuación de ${review.author}`} value={review.rating} /><div className="film-review-metrics">{filmReviewMetrics.map(metric => { const value = review.metrics?.[metric.key]; return <div key={metric.key}><span>{metric.shortLabel}</span><SegmentedLevel label={`${metric.label} de ${review.author}`} levels={metric.levels} value={value} /><small>{metricLevel(metric.levels, value)}</small></div>; })}</div><p className="film-review-comment">{review.comment || 'Sin comentario todavía.'}</p><small>Vista #{visitNumber} · {viewedLabel(review.watchedOn)}</small></article>;
}
