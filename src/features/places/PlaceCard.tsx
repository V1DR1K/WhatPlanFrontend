import { getPhotoOrientation, ResponsiveImage } from "../../components/ui/AdaptivePhoto";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import { StarRating } from "../../components/ui/StarRating";
import type { Place } from "../../types/domain";

export function PlaceCard({ place }: { place: Place }) {
  const pending = place.status === "PENDING";
  const photoWidth = place.photoWidth ?? undefined;
  const photoHeight = place.photoHeight ?? undefined;
  const orientation = getPhotoOrientation(photoWidth, photoHeight);
  const hasExperienceRating = place.rating > 0;
  const kpi = pending ? { label: "Pendiente de visitar", value: "⌛ Ir" } : { label: hasExperienceRating ? `Experiencia: ${place.rating.toFixed(1)} de 5` : "Sin puntuación", value: `✨ ${hasExperienceRating ? `${place.rating.toFixed(1)}/5` : "—"}` };

  return (
    <CatalogMediaCard
      ariaLabel={`Ver detalle de ${place.name}`}
      badge={pending ? "PENDIENTE" : (place.address || "Sin dirección")}
      chips={place.tags.slice(0, 3).map((tag) => <span key={tag.id}>{tag.emoji} {tag.name}</span>)}
      eyebrow={place.category.name}
      footer={<><span>{pending ? "📌 En la lista" : "★ Visitas y reseñas"}</span><span>Ver ficha →</span></>}
      image={place.photoUrl || place.thumbnailUrl ? <ResponsiveImage alt={`Foto de ${place.name}`} className="catalog-media-card__image" fullSrc={place.photoUrl ?? undefined} height={photoHeight} thumbnailSrc={place.thumbnailUrl ?? undefined} width={photoWidth} /> : <span className="catalog-media-card__empty">{place.category.icon}</span>}
      kpi={<span aria-label={kpi.label}>{kpi.value}</span>}
      orientation={orientation}
      theme="food"
      title={place.name}
      to={`/food/places/${place.id}`}
    >
      {pending ? <p className="catalog-media-card__note">{place.address || "Guardado para la próxima salida"}{place.sourceUrl && " · Tiene link de referencia"}</p> : <div className="catalog-media-card__rating"><span>✨ Experiencia</span><StarRating label="Experiencia promedio" value={Math.round(place.rating)} /></div>}
    </CatalogMediaCard>
  );
}
