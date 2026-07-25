import { useLocation } from "react-router-dom";
import {
  getPhotoOrientation,
  photoAspectRatioStyle,
  ResponsiveImage,
} from "../../components/ui/AdaptivePhoto";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import { SegmentedLevel } from "../../components/ui/SegmentedLevel";
import type { Film } from "../../types/domain";
import { filmReviewMetrics } from "./reviewMetrics";

const sharedReviewers = new Set(["tomas", "avril"]);
const sharedReviews = (film: Film) => {
  const latestByAuthor = new Map<string, Film["reviews"][number]>();
  for (const review of film.reviews) {
    const author = review.author?.toLowerCase();
    if (author && sharedReviewers.has(author) && !latestByAuthor.has(author)) {
      latestByAuthor.set(author, review);
    }
  }
  return [...latestByAuthor.values()];
};
const average = (values: number[]) => values.length
  ? values.reduce((total, value) => total + value, 0) / values.length
  : undefined;
const watchedLabel = (date?: string) => date ? `VISTA ${date.split("-").reverse().join("/")}` : "PARA VER";

export function FilmCard({ film }: { film: Film }) {
  const location = useLocation();
  const reviews = sharedReviews(film);
  const rating = average(reviews.map((review) => review.rating));
  const title = film.tmdb?.title ?? film.title;
  const posterWidth = film.posterWidth ?? undefined;
  const posterHeight = film.posterHeight ?? undefined;
  const thumbnailSrc = film.thumbnailUrl ?? film.tmdb?.posterThumbnailUrl ?? film.tmdb?.posterUrl ?? film.posterUrl ?? undefined;
  const fullSrc = film.posterUrl ?? film.tmdb?.posterFullUrl ?? film.tmdb?.posterUrl ?? undefined;
  const genres = film.tmdb?.genres.length ? film.tmdb.genres : film.genres;
  const orientation = getPhotoOrientation(posterWidth, posterHeight, "portrait");
  const posterStyle = photoAspectRatioStyle(posterWidth, posterHeight, "--film-poster-ratio");
  const kpi = rating !== undefined
    ? { label: `Opinión actual: ${rating.toFixed(1)} de 5`, value: `★ ${rating.toFixed(1)}` }
    : film.watchedCount
      ? { label: `${film.watchedCount} ${film.watchedCount === 1 ? "vista" : "vistas"} registradas`, value: `👁 ${film.watchedCount}` }
      : { label: "Pendiente de ver", value: "⌛ Pendiente" };

  return (
    <CatalogMediaCard
      ariaLabel={`Ver ficha de ${title}`}
      badge={film.watchedCount ? `${film.watchedCount} ${film.watchedCount === 1 ? "vez" : "veces"}` : "PARA VER"}
      eyebrow={<>{watchedLabel(film.lastWatchedOn)} {film.platform && `· ${film.platform.icon} ${film.platform.name}`}</>}
      footer={<><span>{film.reviews.length ? `💬 ${film.reviews.length} reseña${film.reviews.length === 1 ? "" : "s"} en historial` : "✦ Sin reseñas"}</span><span>Ver ficha →</span></>}
      image={<div className="catalog-media-card__media-frame" style={posterStyle}>{thumbnailSrc ? <ResponsiveImage alt={`Póster de ${title}`} className="catalog-media-card__image" fullSrc={fullSrc} height={posterHeight} thumbnailSrc={thumbnailSrc} width={posterWidth} /> : <span className="catalog-media-card__empty">🍿</span>}</div>}
      kpi={<span aria-label={kpi.label}>{kpi.value}</span>}
      orientation={orientation}
      theme="film"
      title={title}
      to={`/films/${film.id}${location.search}`}
    >
      {rating !== undefined && (
        <div className="catalog-media-card__rating" aria-label={`Promedio de opiniones actuales: ${rating.toFixed(1)} de 5 estrellas`}>
          <span>Opinión actual</span>
          <i aria-hidden="true">{[1, 2, 3, 4, 5].map((value) => <b key={value} className={value <= Math.round(rating) ? "filled" : ""}>★</b>)}</i>
        </div>
      )}
      <div className="catalog-media-card__metrics">
        {filmReviewMetrics.map((metric) => {
          const value = average(reviews.map((review) => review.metrics?.[metric.key]).filter((score): score is number => score !== undefined));
          return <div key={metric.key}><span>{metric.shortLabel}</span><SegmentedLevel label={`${metric.label} de ${title}`} levels={metric.levels} value={value} /></div>;
        })}
      </div>
      <div className="catalog-media-card__pills">
        {genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}
        {genres.length > 2 && <span>+{genres.length - 2}</span>}
      </div>
    </CatalogMediaCard>
  );
}
