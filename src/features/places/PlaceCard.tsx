import { Link } from "react-router-dom";
import type { Place } from "../../types/domain";
import { StarRating } from "../../components/ui/StarRating";
import { mediaUrl } from "../../lib/api";
export function PlaceCard({ place }: { place: Place }) {
  const pending = place.status === "PENDING";
  const photo = place.thumbnailUrl ?? place.photoUrl;
  const photoSrc = photo ? mediaUrl(photo) : undefined;
  return (
    <Link
      className="place-card-link"
      to={`/places/${place.id}`}
      aria-label={`Ver detalle de ${place.name}`}
    >
      <article className={`place-card ${pending ? "pending-card" : ""}`}>
        <div className="food-poster">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`Foto de ${place.name}`}
              decoding="async"
              loading="lazy"
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
              <b>
                {place.rating.toFixed(1)} <span>★</span>
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
                <span>Promedio global</span>
                <StarRating
                  label="Puntuación promedio"
                  value={Math.round(place.rating)}
                />
              </div>
              <p className="note">Añadido por {place.author}</p>
            </>
          )}
          <footer>
            <span>
              {pending ? "📌 En la lista" : "💬 " + place.itemCount + " ítems"}
            </span>
            <span>Ver ficha →</span>
          </footer>
        </div>
      </article>
    </Link>
  );
}
