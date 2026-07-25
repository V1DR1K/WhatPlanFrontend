import { getPhotoOrientation, ResponsiveImage } from "../../components/ui/AdaptivePhoto";
import { CatalogMediaCard } from "../../components/ui/CatalogMediaCard";
import type { Activity } from "../../types/domain";

export function FunVenueCard({ activity }: { activity: Activity }) {
  const photo = activity.profilePhoto;
  const kpi = activity.rating != null
    ? { label: `Puntuación promedio: ${activity.rating.toFixed(1)} de 5`, value: `★ ${activity.rating.toFixed(1)}` }
    : activity.visitCount
      ? { label: `${activity.visitCount} ${activity.visitCount === 1 ? "salida registrada" : "salidas registradas"}`, value: `🎯 ${activity.visitCount}` }
      : { label: "Pendiente de salir", value: "⌛ Pendiente" };
  return (
    <CatalogMediaCard
      ariaLabel={`Ver actividad ${activity.name}`}
      badge={`${activity.category.icon} ${activity.category.name}`}
      eyebrow={activity.subcategory.name}
      footer={<><span>{activity.schedules.length ? `${activity.schedules.length} horario${activity.schedules.length === 1 ? "" : "s"}` : "Horarios por definir"}</span><span>Ver actividad →</span></>}
      image={photo ? <ResponsiveImage alt={`Foto de ${activity.name}`} className="catalog-media-card__image" fullSrc={photo.url} height={photo.height} thumbnailSrc={photo.thumbnailUrl} width={photo.width} /> : <span className="catalog-media-card__empty">{activity.subcategory.icon}</span>}
      kpi={<span aria-label={kpi.label}>{kpi.value}</span>}
      orientation={getPhotoOrientation(photo?.width, photo?.height)}
      theme="fun"
      title={activity.name}
      to={`/why-fun/${activity.id}`}
    >
      <p className="catalog-media-card__note">📍 {activity.address || "Dirección por definir"}</p>
    </CatalogMediaCard>
  );
}
