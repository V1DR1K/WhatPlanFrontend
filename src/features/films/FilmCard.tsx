import { Link, useLocation } from "react-router-dom";
import {
  getPhotoOrientation,
  photoAspectRatioStyle,
  ResponsiveImage,
} from "../../components/ui/AdaptivePhoto";
import { SegmentedLevel } from "../../components/ui/SegmentedLevel";
import type { Film } from "../../types/domain";
import { filmReviewMetrics } from "./reviewMetrics";

const sharedReviewers = new Set(["tomas", "avril"]);
const sharedReviews = (film: Film) => {
  const latestByAuthor = new Map<string, Film["reviews"][number]>();
  for (const review of film.reviews) {
    const author = review.author?.toLowerCase();
    if (author && sharedReviewers.has(author) && !latestByAuthor.has(author))
      latestByAuthor.set(author, review);
  }
  return [...latestByAuthor.values()];
};
const average = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : undefined;
const watchedLabel = (date?: string) =>
  date ? `VISTA ${date.split("-").reverse().join("/")}` : "PARA VER";

export function FilmCard({ film }: { film: Film }) {
  const location = useLocation();
  const reviews = sharedReviews(film);
  const rating = average(reviews.map((review) => review.rating));
  const title = film.tmdb?.title ?? film.title;
  const posterWidth = film.posterWidth ?? undefined;
  const posterHeight = film.posterHeight ?? undefined;
  const thumbnailSrc =
    film.thumbnailUrl ??
    film.tmdb?.posterThumbnailUrl ??
    film.tmdb?.posterUrl ??
    film.posterUrl ??
    undefined;
  const fullSrc =
    film.posterUrl ?? film.tmdb?.posterFullUrl ?? film.tmdb?.posterUrl ?? undefined;
  const genres = film.tmdb?.genres.length ? film.tmdb.genres : film.genres;
  const orientation = getPhotoOrientation(
    posterWidth,
    posterHeight,
    "portrait",
  );
  const posterStyle = photoAspectRatioStyle(
    posterWidth,
    posterHeight,
    "--film-poster-ratio",
  );

  return (
    <Link
      className={`film-card-link media-card media-card--${orientation}`}
      to={`/films/${film.id}${location.search}`}
      aria-label={`Ver ficha de ${title}`}
    >
      <article className="film-card">
        <div className="film-poster" style={posterStyle}>
          {thumbnailSrc ? (
            <ResponsiveImage
              alt={`Póster de ${title}`}
              className="film-poster__image"
              fullSrc={fullSrc}
              height={posterHeight}
              thumbnailSrc={thumbnailSrc}
              width={posterWidth}
            />
          ) : (
            <span>🍿</span>
          )}
          <small>
            {film.watchedCount
              ? `${film.watchedCount} ${film.watchedCount === 1 ? "vez" : "veces"}`
              : "PARA VER"}
          </small>
        </div>
        <div className="film-card__body">
          <div>
            <p>
              {watchedLabel(film.lastWatchedOn)}{" "}
              {film.platform && `· ${film.platform.icon} ${film.platform.name}`}
            </p>
            <h3>{title}</h3>
          </div>
          {rating !== undefined && (
            <div
              className="film-card__rating"
              aria-label={`Promedio de opiniones actuales: ${rating.toFixed(1)} de 5 estrellas`}
            >
              <span>Opinión actual</span>
              <i aria-hidden="true">
                {[1, 2, 3, 4, 5].map((value) => (
                  <b
                    key={value}
                    className={value <= Math.round(rating) ? "filled" : ""}
                  >
                    ★
                  </b>
                ))}
              </i>
            </div>
          )}
          <div className="film-card__metrics">
            {filmReviewMetrics.map((metric) => {
              const value = average(
                reviews
                  .map((review) => review.metrics?.[metric.key])
                  .filter((score): score is number => score !== undefined),
              );
              return (
                <div key={metric.key}>
                  <span>{metric.shortLabel}</span>
                  <SegmentedLevel
                    label={`${metric.label} de ${title}`}
                    levels={metric.levels}
                    value={value}
                  />
                </div>
              );
            })}
          </div>
          <div className="genre-pills">
            {genres.slice(0, 2).map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
            {genres.length > 2 && (
              <span className="genre-pills__more">+{genres.length - 2}</span>
            )}
          </div>
          <footer>
            <span>
              {film.reviews.length
                ? `💬 ${film.reviews.length} reseña${film.reviews.length === 1 ? "" : "s"} en historial`
                : "✦ Sin reseñas"}
            </span>
            <span>Ver ficha →</span>
          </footer>
        </div>
      </article>
    </Link>
  );
}
