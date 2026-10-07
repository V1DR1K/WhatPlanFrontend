import { ExperienceJourneyPanel } from '../journey/ExperienceJourneyPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useInAppBackGuard } from "../../lib/backGuard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EntityDetailActions, EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { RecordIterator } from "../../components/ui/RecordIterator";
import { Button } from "../../components/ui/Button";
import { AddressIcon } from "../../components/ui/AddressIcon";
import { ImportantDatesLink } from "../../components/ui/ImportantDatesLink";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { StarRating } from "../../components/ui/StarRating";
import { RatingStars } from "../../components/ui/RatingStars";
import { session } from "../../lib/api";
import { ExpandablePhoto } from "../../components/ui/ExpandablePhoto";
import { showNotice } from "../../lib/flash";
import type { ActivityReview, ActivityVisit, ExperiencePhoto } from "../../types/domain";
import { ActivityForm } from "./ActivityForm";
import { ActivityReviewForm } from "./ActivityReviewForm";
import { ActivityVisitForm } from "./ActivityVisitForm";
import { deleteActivity, deleteActivityPhoto, formatActivityDateRange, getActivity, getActivityVisits, setActivityCover, uploadActivityPhoto } from "./whyFun";
import { SpecialDateLabels, specialDateOptionSuffix } from "../special-dates/SpecialDateLabels";
import { getSpecialDates } from "../special-dates/specialDates";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { mapsSearch } from "../places/places";

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
  useInAppBackGuard("/app/why-fun");
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ActivityVisit | null | undefined>(() => new URLSearchParams(window.location.search).get("journeyAction") === "register" ? null : undefined);
  const [selectedVisitId, setSelectedVisitId] = useState<number>();
  const [reviewing, setReviewing] = useState<ActivityReview | null>();
  const [deletingPhoto, setDeletingPhoto] = useState<ExperiencePhoto>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const activity = useQuery({ queryKey: ["activity", id], queryFn: () => getActivity(id), enabled: validId });
  const visits = useQuery({ queryKey: ["activity-visits", id], queryFn: () => getActivityVisits(id), enabled: validId });
  const specialDates = useQuery({ queryKey: ["special-dates"], queryFn: getSpecialDates, enabled: validId });
  const list = visits.data ?? [];
  const specialDateList = specialDates.data ?? [];
  const current = list.find((visit) => visit.id === selectedVisitId);
  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["activities"] }),
    qc.invalidateQueries({ queryKey: ["activity", id] }),
    qc.invalidateQueries({ queryKey: ["activity-visits", id] }),
    qc.invalidateQueries({ queryKey: ["journey-day"] }),
  ]);
  const removeActivity = useMutation({
    mutationFn: () => deleteActivity(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["activities"] });
      showNotice("Eliminamos la actividad y su historial.");
      navigate("/app/why-fun");
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
    return <section className="fun-detail"><p className="form-error" role="alert">No pudimos abrir esta actividad.</p></section>;
  }
  if (activity.isLoading) return <LoadingSkeleton variant="detail" section="fun" />;

  const value = activity.data!;
  const profilePhoto = value.profilePhoto?.url ?? value.profilePhoto?.thumbnailUrl;
  const occurrenceDateRange = value.singleOccurrence
    ? formatActivityDateRange(value.startDate, value.endDate)
    : undefined;
  const ownReview = current?.reviews.find((review) => review.author === session.get()?.username);
  const addressUrl = mapsSearch(value.address);
  return (
    <section className="fun-detail">
      <Link className="section-back" to="/app/why-fun">← Volver a WhyFun</Link>
      <EntityDetailHeader
        actions={
          <EntityDetailActions
            destructive={{ label: "Borrar actividad", onClick: () => setConfirmingDelete(true) }}
            primary={{ icon: value.subcategory.icon, label: "Registrar salida", onClick: () => setEditingVisit(null) }}
            secondary={{ label: "Editar actividad", onClick: () => setEditing(true) }}
          />
        }
        className="fun-detail__head"
        eyebrow={`ACTIVIDAD COMPARTIDA · ${value.category.icon} ${value.category.name}`}
        media={
          <div className="fun-detail__cover">
          {profilePhoto ? <ExpandablePhoto src={profilePhoto} alt={`Foto de ${value.name}`} width={720} height={480} /> : <span>{value.subcategory.icon}</span>}
          </div>
        }
        metadata={
          <>
          {value.address && <p className="fun-plan-date">{value.address}</p>}
          {addressUrl && <div className="fun-detail__external-actions">
            <a className="button button--primary address-link" href={addressUrl} target="_blank" rel="noreferrer" aria-label={`Abrir dirección de ${value.name} en Google Maps`}><AddressIcon /> Dirección ↗</a>
          </div>}
          <p className="byline">Creada por {value.createdBy} · editada por {value.updatedBy}</p>
          </>
        }
        summary={<ImportantDatesLink date={current?.scheduledAt} specialDates={specialDateList} />}
        title={value.name}
      />
      <section className="rating-breakdown rating-breakdown--fun" aria-label="Puntuación promedio de la actividad">
        <div className="rating-breakdown__experience">
          <span>🎯 Puntuación promedio</span>
          <RatingStars label="Puntuación promedio de la actividad" value={value.rating ?? undefined} />
          <small>Calculada sobre todas las reseñas de sus salidas.</small>
        </div>
      </section>
      <section className="fun-detail-grid">
        <div className="fun-detail-panel">
          <p className="eyebrow">HORARIOS</p>
          <h2>Cuándo se puede ir</h2>
          {occurrenceDateRange && <p className="fun-single-occurrence"><span>Fecha única</span><strong>{occurrenceDateRange}</strong></p>}
          {value.schedules.length ? <div className="fun-hours">{value.schedules.map((schedule) => <div key={`${schedule.dayOfWeek}-${schedule.opensAt}`}><strong>{dayLabel[schedule.dayOfWeek]}</strong><span>{schedule.opensAt} a {schedule.closesAt}</span></div>)}</div> : <p className="muted">No cargaron horarios para esta actividad.</p>}
        </div>
        <div className="fun-detail-panel"><p className="eyebrow">HISTORIAL</p><h2>{list.length} salida{list.length === 1 ? "" : "s"}</h2><p className="muted">Cada fecha conserva su propia galería y reseñas.</p></div>
      </section>
      <section className="reviews-section">
        <div className="section-title section-title--with-actions"><div><p className="eyebrow">SALIDAS</p><h2>El historial</h2></div><strong>{list.length}</strong>{current && <div className="section-title__actions"><Button icon="✏️" variant="secondary" type="button" onClick={() => setEditingVisit(current)}>Editar salida</Button></div>}</div>
        {visits.isLoading ? <LoadingSkeleton variant="experience" section="fun" compactExperience /> : list.length ? <>
          <div className="item-date-pager">
            <RecordIterator
              ariaLabel="Navegar salidas"
              label="Salida"
              value={String(selectedVisitId ?? "")}
              options={list.map((visit) => ({ value: String(visit.id), label: `${dateLabel(visit.scheduledAt)}${specialDateOptionSuffix(visit.scheduledAt, specialDateList)}`, detail: `Registrada por ${visit.createdBy}` }))}
              onChange={(value) => setSelectedVisitId(Number(value))}
            />
          </div>
          {current && <div className="experience-detail"><p className="muted">Salida del {dateLabel(current.scheduledAt)}<SpecialDateLabels date={current.scheduledAt} specialDates={specialDateList} />. Registrada por {current.createdBy}; última edición de {current.updatedBy}.</p><ExperienceGallery accentLabel="SALIDA" emptyIcon="🎯" manageInModal name={`${value.name}, ${dateLabel(current.scheduledAt)}`} photos={current.photos} coverPhotoId={current.coverPhoto?.id} onUpload={(files) => uploadPhotos.mutateAsync(files)} onSetCover={(photo) => cover.mutate(Number(photo.id))} onDelete={setDeletingPhoto} /><ReviewList ownReview={Boolean(ownReview)} onReview={() => setReviewing(ownReview ?? null)} reviews={current.reviews} /></div>}
        </> : <p className="empty-state">Todavía no hay salidas. Registren la primera fecha para guardar fotos y reseñas.</p>}
      </section>
      {current?.id && <ExperienceJourneyPanel key={current?.id} source={{section:"FUN",entityId:id,experienceId:current?.id}} />}
      {editing && <ActivityForm activity={value} onClose={() => setEditing(false)} />}
      {editingVisit !== undefined && <ActivityVisitForm activity={value} visit={editingVisit ?? undefined} onClose={() => setEditingVisit(undefined)} onSaved={(saved) => setSelectedVisitId(saved.id)} />}
      {reviewing !== undefined && current && <ActivityReviewForm activityId={value.id} visit={current} review={reviewing ?? undefined} onClose={() => setReviewing(undefined)} />}
      {confirmingDelete && <ConfirmDialog title="¿Borrar esta actividad?" message={removeActivity.error ? removeActivity.error.message : "También se eliminarán sus salidas, fotos y reseñas."} confirmLabel="Borrar actividad" pending={removeActivity.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removeActivity.mutate()} />}
      {deletingPhoto && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se eliminará definitivamente de esta salida." confirmLabel="Quitar foto" pending={removePhoto.isPending} onClose={() => setDeletingPhoto(undefined)} onConfirm={() => removePhoto.mutate(Number(deletingPhoto.id))} />}
    </section>
  );
}

function ReviewList({ onReview, ownReview, reviews }: { onReview: () => void; ownReview: boolean; reviews: ActivityReview[] }) {
  return (
    <section className="reviews-section">
      <div className="section-title section-title--compact section-title--with-actions"><div><p className="eyebrow">RESEÑAS DE ESTA SALIDA</p><h2>Cómo la pasaron</h2></div><strong>{reviews.length}</strong><div className="section-title__actions"><Button icon={ownReview ? "✏️" : "💬"} variant="secondary" type="button" onClick={onReview}>{ownReview ? "Editar reseña" : "Agregar reseña"}</Button></div></div>
       {reviews.length ? <div className="fun-review-columns">{reviews.map((review) => <article className="fun-review-card" key={review.id}><div><span className="review-avatar">{review.author[0]?.toUpperCase()}</span><h3>Reseña de {review.author}</h3></div><div className="review-score"><StarRating label={`Puntuación de ${review.author}`} value={review.rating} /><span>{scoreLabel(review.rating)}</span></div><p className="review-comment">{review.comment || "Sin comentario."}</p><small>Creada por {review.author} · editada por {review.updatedBy}</small></article>)}</div> : <p className="empty-state">Todavía no hay reseñas.</p>}
    </section>
  );
}

function scoreLabel(value?: number) {
  return value === undefined || value === null ? "—" : `${value}/5`;
}
