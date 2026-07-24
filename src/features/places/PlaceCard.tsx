import { Link } from "react-router-dom";
import { getPhotoOrientation, photoAspectRatioStyle, ResponsiveImage } from "../../components/ui/AdaptivePhoto";
import { StarRating } from "../../components/ui/StarRating";
import type { Place } from "../../types/domain";

export function PlaceCard({ place }: { place: Place }) {
  const pending = place.status === "PENDING";
  const photoWidth = place.photoWidth ?? undefined;
  const photoHeight = place.photoHeight ?? undefined;
  const orientation = getPhotoOrientation(photoWidth, photoHeight);
  const photoStyle = photoAspectRatioStyle(photoWidth, photoHeight);
  const hasExperienceRating = place.rating > 0;
  return (
    <Link
      className={`place-card-link media-card media-card--${orientation}`}
      to={`/food/places/${place.id}`}
      aria-label={`Ver detalle de ${place.name}`}
    >
      <article className={`place-card ${pending ? "pending-card" : ""}`} style={photoStyle}>
        <div className="food-poster">
          {place.photoUrl || place.thumbnailUrl ? (
            <ResponsiveImage
              alt={`Foto de ${place.name}`}
              className="food-poster__image"
              fullSrc={place.photoUrl ?? undefined}
              height={photoHeight}
              thumbnailSrc={place.thumbnailUrl ?? undefined}
              width={photoWidth}
            />
          ) : (
            <span>{place.category.icon}</span>
          )}
          <small>{place.address || "Sin dirección"} 📍</small>
          {pending && <strong className="pending-badge">PENDIENTE</strong>}
        </div>
        <div className="card-body">
          <div className="card-top">
            <div>
              <p>{place.category.name}</p>
              <h3>{place.name}</h3>
            </div>
            {pending ? (
              <b className="pending-score">⌛ Ir</b>
            ) : (
              <b className="food-experience-kpi">
                ✨ {hasExperienceRating ? `${place.rating.toFixed(1)}/5` : "—"}
              </b>
            )}
          </div>
          {!!place.tags?.length && <div className="place-tags">{place.tags.slice(0, 3).map((tag) => <span key={tag.id}>{tag.emoji} {tag.name}</span>)}</div>}
          {pending ? (
            <p className="note">
              {place.address || "Guardado para la próxima salida"}
              {place.sourceUrl && " · Tiene link de referencia"}
            </p>
          ) : (
            <>
              <div className="rating-preview">
                <span>✨ Experiencia</span>
                <StarRating
                  label="Experiencia promedio"
                  value={Math.round(place.rating)}
                />
              </div>
              <p className="note">Añadido por {place.author}</p>
            </>
          )}
          <footer>
            <span>
              {pending ? "📌 En la lista" : "★ Visitas y reseñas"}
            </span>
            <span>Ver ficha →</span>
          </footer>
        </div>
      </article>
    </Link>
  );
}
