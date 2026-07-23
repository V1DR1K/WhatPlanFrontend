import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EntityDetailActions, EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { Button } from "../../components/ui/Button";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { StarRating } from "../../components/ui/StarRating";
import { mediaUrl, session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import type { ActivityReview, ActivityVisit, ExperiencePhoto } from "../../types/domain";
import { ActivityForm } from "./ActivityForm";
import { ActivityReviewForm } from "./ActivityReviewForm";
import { ActivityVisitForm } from "./ActivityVisitForm";
import { deleteActivity, deleteActivityPhoto, getActivity, getActivityVisits, setActivityCover, uploadActivityPhoto } from "./whyFun";

const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`))
    : "Sin fecha";
const dayLabel = { MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles", THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo" } as const;

export function FunVenueDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ActivityVisit | null | undefined>();
  const [selectedVisitId, setSelectedVisitId] = useState<number>();
  const [reviewing, setReviewing] = useState<ActivityReview | null>();
  const [deletingPhoto, setDeletingPhoto] = useState<ExperiencePhoto>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const activity = useQuery({ queryKey: ["activity", id], queryFn: () => getActivity(id), enabled: validId });
  const visits = useQuery({ queryKey: ["activity-visits", id], queryFn: () => getActivityVisits(id), enabled: validId });
  const list = visits.data ?? [];
  const current = list.find((visit) => visit.id === selectedVisitId);
  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["activities"] }),
    qc.invalidateQueries({ queryKey: ["activity", id] }),
    qc.invalidateQueries({ queryKey: ["activity-visits", id] }),
  ]);
  const removeActivity = useMutation({
    mutationFn: () => deleteActivity(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["activities"] });
      showNotice("Eliminamos la actividad y su historial.");
      navigate("/why-fun");
    },
  });
  const uploadPhotos = useMutation({
    mutationFn: async (files: File[]) => {
      if (!current) return;
      for (const file of files) await uploadActivityPhoto(current.id, file);
    },
    onSuccess: async () => {
      await invalidate();
      showNotice("Agregamos las fotos a la salida.");
    },
  });
  const cover = useMutation({
    mutationFn: (photoId: number) => setActivityCover(current!.id, photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Actualizamos la portada.");
    },
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: number) => deleteActivityPhoto(photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Quitamos la foto.");
      setDeletingPhoto(undefined);
    },
  });

  useEffect(() => {
    if (list.length && !list.some((visit) => visit.id === selectedVisitId)) {
      setSelectedVisitId(list[0].id);
    }
  }, [list, selectedVisitId]);

  if (!validId || activity.isError || (!activity.isLoading && !activity.data)) {
    return <section className="fun-detail"><p className="form-error">No pudimos abrir esta actividad.</p></section>;
  }
  if (activity.isLoading) return <p className="muted" aria-busy="true">Cargando actividad…</p>;

  const value = activity.data!;
  const profilePhoto = value.profilePhoto?.url ?? value.profilePhoto?.thumbnailUrl;
  const ownReview = current?.reviews.find((review) => review.author === session.get()?.username);
  return (
    <section className="fun-detail">
      <EntityDetailHeader
        actions={
          <EntityDetailActions
            destructive={{ label: "Borrar actividad", onClick: () => setConfirmingDelete(true) }}
            primary={{ label: "Registrar salida", onClick: () => setEditingVisit(null) }}
            secondary={{ label: "Editar actividad", onClick: () => setEditing(true) }}
          />
        }
        className="fun-detail__head"
        eyebrow={`ACTIVIDAD COMPARTIDA · ${value.category.icon} ${value.category.name}`}
        media={
          <div className="fun-detail__cover">
          {profilePhoto ? <img src={mediaUrl(profilePhoto)} alt={`Foto de ${value.name}`} /> : <span>{value.subcategory.icon}</span>}
          </div>
        }
        metadata={
          <>
          <p className="fun-plan-date">📍 {value.address}</p>
          <p className="byline">Creada por {value.createdBy} · editada por {value.updatedBy}</p>
          </>
        }
        title={value.name}
      />
      <section className="fun-detail-grid">
        <div className="fun-detail-panel">
          <p className="eyebrow">HORARIOS</p>
          <h2>Cuándo se puede ir</h2>
          {value.schedules.length ? <div className="fun-hours">{value.schedules.map((schedule) => <div key={`${schedule.dayOfWeek}-${schedule.opensAt}`}><strong>{dayLabel[schedule.dayOfWeek]}</strong><span>{schedule.opensAt} a {schedule.closesAt}</span></div>)}</div> : <p className="muted">No cargaron horarios para esta actividad.</p>}
        </div>
        <div className="fun-detail-panel"><p className="eyebrow">HISTORIAL</p><h2>{list.length} salida{list.length === 1 ? "" : "s"}</h2><p className="muted">Cada fecha conserva su propia galería y reseñas.</p></div>
      </section>
      <section className="reviews-section">
        <div className="section-title"><div><p className="eyebrow">SALIDAS</p><h2>El historial</h2></div><strong>{list.length}</strong></div>
        {list.length ? <>
          <div className="item-date-pager">
            <label>
              Elegir salida
              <select value={selectedVisitId ?? ""} onChange={(event) => setSelectedVisitId(Number(event.target.value))}>
                {list.map((visit) => <option key={visit.id} value={visit.id}>{dateLabel(visit.scheduledAt)} · {visit.createdBy}</option>)}
              </select>
            </label>
            {current && <>
              <Button icon="✎" variant="secondary" type="button" onClick={() => setEditingVisit(current)}>Editar salida</Button>
              <Button icon={ownReview ? "✎" : "＋"} variant="secondary" type="button" onClick={() => setReviewing(ownReview ?? null)}>{ownReview ? "Editar reseña" : "Agregar reseña"}</Button>
            </>}
          </div>
          {current && <div className="experience-detail"><ExperienceGallery accentLabel="SALIDA" emptyIcon="🎯" name={`${value.name}, ${dateLabel(current.scheduledAt)}`} photos={current.photos} coverPhotoId={current.coverPhoto?.id} onUpload={(files) => uploadPhotos.mutateAsync(files)} onSetCover={(photo) => cover.mutate(photo.id)} onDelete={setDeletingPhoto} /><ReviewList reviews={current.reviews} /></div>}
        </> : <p className="empty-state">Todavía no hay salidas. Registren la primera fecha para guardar fotos y reseñas.</p>}
      </section>
      {editing && <ActivityForm activity={value} onClose={() => setEditing(false)} />}
      {editingVisit !== undefined && <ActivityVisitForm activity={value} visit={editingVisit ?? undefined} onClose={() => setEditingVisit(undefined)} onSaved={(saved) => setSelectedVisitId(saved.id)} />}
      {reviewing !== undefined && current && <ActivityReviewForm activityId={value.id} visit={current} review={reviewing ?? undefined} onClose={() => setReviewing(undefined)} />}
      {confirmingDelete && <ConfirmDialog title="¿Borrar esta actividad?" message={removeActivity.error ? removeActivity.error.message : "También se eliminarán sus salidas, fotos y reseñas."} confirmLabel="Borrar actividad" pending={removeActivity.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removeActivity.mutate()} />}
      {deletingPhoto && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se eliminará definitivamente de esta salida." confirmLabel="Quitar foto" pending={removePhoto.isPending} onClose={() => setDeletingPhoto(undefined)} onConfirm={() => removePhoto.mutate(deletingPhoto.id)} />}
    </section>
  );
}

function ReviewList({ reviews }: { reviews: ActivityReview[] }) {
  return (
    <section className="reviews-section">
      <div className="section-title section-title--compact"><div><p className="eyebrow">RESEÑAS DE ESTA SALIDA</p><h2>Cómo la pasaron</h2></div><strong>{reviews.length}</strong></div>
      {reviews.length ? <div className="fun-review-columns">{reviews.map((review) => <article className="fun-review-card" key={review.id}><div><span className="review-avatar">{review.author[0]?.toUpperCase()}</span><h3>Reseña de {review.author}</h3></div><StarRating label={`Puntuación de ${review.author}`} value={review.rating} /><p>{review.comment || "Sin comentario."}</p><small>Creada por {review.author} · editada por {review.updatedBy}</small></article>)}</div> : <p className="empty-state">Todavía no hay reseñas.</p>}
    </section>
  );
}
