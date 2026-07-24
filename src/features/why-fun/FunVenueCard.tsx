import { Link } from "react-router-dom";
import { mediaUrl } from "../../lib/api";
import type { Activity } from "../../types/domain";

export function FunVenueCard({ activity }: { activity: Activity }) {
  const photo = activity.profilePhoto?.thumbnailUrl ?? activity.profilePhoto?.url;
  const kpi = activity.rating != null
    ? { label: `Puntuación promedio: ${activity.rating.toFixed(1)} de 5`, value: `★ ${activity.rating.toFixed(1)}` }
    : activity.visitCount
      ? { label: `${activity.visitCount} ${activity.visitCount === 1 ? "salida registrada" : "salidas registradas"}`, value: `🎯 ${activity.visitCount}` }
      : { label: "Pendiente de salir", value: "⌛ Pendiente" };
  return (
    <Link className="fun-card-link" to={`/why-fun/${activity.id}`} aria-label={`Ver actividad ${activity.name}`}>
      <article className="fun-card">
        <div className="fun-card__photo">
          {photo ? <img className="fun-card__photo-image" src={mediaUrl(photo)} alt={`Foto de ${activity.name}`} loading="lazy" /> : <span>{activity.subcategory.icon}</span>}
          <small>{activity.category.icon} {activity.category.name}</small>
        </div>
        <div className="fun-card__body">
          <div><p>{activity.subcategory.name}</p><h3>{activity.name}</h3></div>
          <b aria-label={kpi.label}>{kpi.value}</b>
          <address>📍 {activity.address}</address>
          <footer><span>{activity.schedules.length ? `${activity.schedules.length} horario${activity.schedules.length === 1 ? "" : "s"}` : "Horarios por definir"}</span><span>Ver actividad →</span></footer>
        </div>
      </article>
    </Link>
  );
}
