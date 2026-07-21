import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { SegmentedLevel } from '../../components/ui/SegmentedLevel';
import { mediaUrl } from '../../lib/api';
import type { Film } from '../../types/domain';
import { filmReviewMetrics } from './reviewMetrics';

const sharedReviewers = new Set(['tomas', 'avril']);
const sharedReviews = (film: Film) => {
 const latestByAuthor = new Map<string, Film['reviews'][number]>();
 for (const review of film.reviews) {
  const author = review.author.toLowerCase();
  if (sharedReviewers.has(author) && !latestByAuthor.has(author)) latestByAuthor.set(author, review);
 }
 return [...latestByAuthor.values()];
};
const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;
const watchedLabel = (date?: string) => date ? `VISTA ${date.split('-').reverse().join('/')}` : 'PARA VER';

export function FilmCard({ film }: { film: Film }) {
  const reviews = sharedReviews(film);
  const rating = average(reviews.map(review => review.rating));
  const title = film.tmdb?.title ?? film.title;
  const image = film.thumbnailUrl ?? film.tmdb?.posterUrl ?? film.posterUrl;
  const genres = film.tmdb?.genres.length ? film.tmdb.genres : film.genres;
  const posterStyle = film.posterWidth && film.posterHeight ? { '--film-poster-ratio': `${film.posterWidth} / ${film.posterHeight}` } as CSSProperties : undefined;

  return <Link className="film-card-link" to={`/films/${film.id}`} aria-label={`Ver ficha de ${title}`}><article className="film-card"><div className="film-poster" style={posterStyle}>{image ? <img src={mediaUrl(image)} alt={`Póster de ${title}`} loading="lazy" /> : <span>🍿</span>}<small>{film.watchedCount ? `${film.watchedCount} ${film.watchedCount === 1 ? 'vez' : 'veces'}` : 'PARA VER'}</small></div><div className="film-card__body"><div><p>{watchedLabel(film.lastWatchedOn)} {film.platform && `· ${film.platform.icon} ${film.platform.name}`}</p><h3>{title}</h3></div>{rating !== undefined && <div className="film-card__rating" aria-label={`Promedio general: ${rating.toFixed(1)} de 5 estrellas`}><span>Promedio</span><i aria-hidden="true">{[1, 2, 3, 4, 5].map(value => <b key={value} className={value <= Math.round(rating) ? 'filled' : ''}>★</b>)}</i><strong>{rating.toFixed(1)}</strong></div>}<div className="film-card__metrics">{filmReviewMetrics.map(metric => { const value = average(reviews.map(review => review.metrics?.[metric.key]).filter((score): score is number => score !== undefined)); return <div key={metric.key}><span>{metric.shortLabel}</span><SegmentedLevel label={`${metric.label} de ${title}`} levels={metric.levels} value={value} />{value !== undefined && <b>{value.toFixed(1)}</b>}</div>; })}</div><div className="genre-pills">{genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div><footer><span>{film.reviews.length ? `💬 ${film.reviews.length} reseña${film.reviews.length === 1 ? '' : 's'}` : '✦ Sin reseñas'}</span><span>Ver ficha →</span></footer></div></article></Link>;
}
