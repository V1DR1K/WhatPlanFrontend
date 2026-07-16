import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../../lib/api';
import type { Film } from '../../types/domain';

const average = (film: Film) => film.reviews.length ? film.reviews.reduce((total, review) => total + review.rating, 0) / film.reviews.length : undefined;
const watchedLabel = (date?: string) => date ? `VISTA ${date.split('-').reverse().join('/')}` : 'PARA VER';
export function FilmCard({ film }: { film: Film }) {
  const rating = average(film);
  const image = film.thumbnailUrl ?? film.posterUrl;
  const posterStyle = film.posterWidth && film.posterHeight ? { '--film-poster-ratio': `${film.posterWidth} / ${film.posterHeight}` } as CSSProperties : undefined;
  return <Link className="film-card-link" to={`/films/${film.id}`} aria-label={`Ver ficha de ${film.title}`}><article className="film-card"><div className="film-poster" style={posterStyle}>{image ? <img src={mediaUrl(image)} alt={`Póster de ${film.title}`} loading="lazy" /> : <span>🍿</span>}<small>{film.watchedCount ? `${film.watchedCount} ${film.watchedCount === 1 ? 'vez' : 'veces'}` : 'PARA VER'}</small></div><div className="film-card__body"><div><p>{watchedLabel(film.lastWatchedOn)} {film.platform && `· ${film.platform.icon} ${film.platform.name}`}</p><h3>{film.title}</h3></div>{rating && <b>{rating.toFixed(1)} <span>★</span></b>}<div className="genre-pills">{film.genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div><footer><span>{film.reviews.length ? `💬 ${film.reviews.length} reseña${film.reviews.length === 1 ? '' : 's'}` : '✦ Sin reseñas'}</span><span>Ver ficha →</span></footer></div></article></Link>;
}
