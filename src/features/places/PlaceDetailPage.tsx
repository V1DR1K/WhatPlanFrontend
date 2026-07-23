import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdaptivePhoto } from "../../components/ui/AdaptivePhoto";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EntityDetailActions, EntityDetailHeader } from "../../components/ui/EntityDetailHeader";
import { Button } from "../../components/ui/Button";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { StarRating } from "../../components/ui/StarRating";
import { session } from "../../lib/api";
import { showNotice } from "../../lib/flash";
import type { ExperiencePhoto, PlaceReview, PlaceVisit, PlaceVisitReview, PlaceVisitSummary } from "../../types/domain";
import { deleteVisitPhoto, getVisit, getVisits, setVisitCover, uploadVisitPhoto } from "../items/items";
import { VisitForm } from "../items/VisitForm";
import { VisitReviewForm } from "../items/VisitReviewForm";
import { PlaceForm } from "./PlaceForm";
import { PlaceReviewForm } from "./PlaceReviewForm";
import { deletePlace, getPlace } from "./places";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
const mapsSearch = (address?: string | null) =>
  address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : undefined;
const visitMetrics = [
  ["taste", "Sabor"],
  ["price", "Precio"],
] as const;

export function PlaceDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingPlace, setEditingPlace] = useState(false);
  const [editingVisit, setEditingVisit] = useState<PlaceVisitSummary | null | undefined>();
  const [selectedVisitId, setSelectedVisitId] = useState<number>();
  const [reviewing, setReviewing] = useState<PlaceVisitReview | null>();
  const [reviewingPlace, setReviewingPlace] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<ExperiencePhoto>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const place = useQuery({ queryKey: ["place", id], queryFn: () => getPlace(id), enabled: validId });
  const visits = useQuery({ queryKey: ["visits", id], queryFn: () => getVisits(id), enabled: validId });
  const visit = useQuery({
    queryKey: ["visit", selectedVisitId],
    queryFn: () => getVisit(selectedVisitId!),
    enabled: Boolean(selectedVisitId),
  });
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["places"] }),
      qc.invalidateQueries({ queryKey: ["place", id] }),
      qc.invalidateQueries({ queryKey: ["visits", id] }),
      ...(selectedVisitId
        ? [qc.invalidateQueries({ queryKey: ["visit", selectedVisitId] })]
        : []),
    ]);
  const removePlace = useMutation({
    mutationFn: () => deletePlace(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["places"] });
      showNotice("Movimos el lugar a archivados.");
      navigate("/food");
    },
  });
  const uploadPhotos = useMutation({
    mutationFn: async (files: File[]) => {
      if (!selectedVisitId) return;
      for (const file of files) await uploadVisitPhoto(selectedVisitId, file);
    },
    onSuccess: async () => {
      await invalidate();
      showNotice("Agregamos las fotos a esta visita.");
    },
  });
  const setCover = useMutation({
    mutationFn: (photoId: number) => setVisitCover(selectedVisitId!, photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Actualizamos la portada de la visita.");
    },
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: number) => deleteVisitPhoto(photoId),
    onSuccess: async () => {
      await invalidate();
      showNotice("Quitamos la foto.");
      setDeletingPhoto(undefined);
    },
  });

  useEffect(() => {
    const list = visits.data ?? [];
    if (list.length && !list.some((value) => value.id === selectedVisitId)) {
      setSelectedVisitId(list[0].id);
    }
  }, [selectedVisitId, visits.data]);

  if (!validId || place.isError || (!place.isLoading && !place.data)) {
    return <section className="detail"><p className="form-error">No pudimos cargar este lugar.</p></section>;
  }
  if (place.isLoading) return <p className="muted" aria-busy="true">Cargando lugar…</p>;

  const venue = place.data!;
  const visitList = visits.data ?? [];
  const current = visit.data;
  const mapsUrl = venue.mapsUrl || mapsSearch(venue.address);
  const photoWidth = venue.photoWidth ?? undefined;
  const photoHeight = venue.photoHeight ?? undefined;
  const venueOwnReview = venue.reviews.find((review) => review.author === session.get()?.username);
  const ownReview = current?.reviews.find((review) => review.author === session.get()?.username);

  return (
    <section className="detail">
      <EntityDetailHeader
        actions={
          <EntityDetailActions
            destructive={{ label: "Borrar lugar", onClick: () => setConfirmingDelete(true) }}
            primary={{ label: "Registrar visita", onClick: () => setEditingVisit(null) }}
            secondary={{ label: "Editar lugar", onClick: () => setEditingPlace(true) }}
          />
        }
        className="place-detail__head"
        eyebrow={`LUGAR COMPARTIDO · ${venue.category.name}`}
        media={
          <div className="place-cover">
          {venue.photoUrl || venue.thumbnailUrl ? (
            <AdaptivePhoto
              alt={`Foto de ${venue.name}`}
              context="place"
              fullSrc={venue.photoUrl ?? undefined}
              height={photoHeight}
              thumbnailSrc={venue.thumbnailUrl ?? undefined}
              width={photoWidth}
            />
          ) : (
            <div className="place-cover-empty" aria-label="Lugar sin foto">{venue.category.icon}</div>
          )}
          </div>
        }
        metadata={
          <>
          <p>
            {mapsUrl ? (
              <a className="address-link" href={mapsUrl} target="_blank" rel="noreferrer">
                📍 {venue.address || "Abrir ubicación"} ↗
              </a>
            ) : venue.address || "Sin dirección"}
          </p>
          {venue.sourceUrl && <a className="source-link" href={venue.sourceUrl} target="_blank" rel="noreferrer">↗ Ver referencia</a>}
          <p className="byline">Agregado por {venue.author}</p>
          </>
        }
        title={venue.name}
      />
      <section className="rating-breakdown" aria-label="Promedios del lugar">
        <div><span>Experiencia</span><strong>{venue.rating ? venue.rating.toFixed(1) : "-"}</strong></div>
        <div><span>Sabor</span><strong>{venue.tasteAverage ? venue.tasteAverage.toFixed(1) : "-"}</strong></div>
        <div><span>Precio y lugar</span><strong>{venue.priceAverage || venue.venueAverage ? Math.max(venue.priceAverage, venue.venueAverage).toFixed(1) : "-"}</strong></div>
      </section>
      <section className="reviews-section place-venue-reviews">
        <div className="section-title">
          <div><p className="eyebrow">EL LUGAR</p><h2>Espacio y atención</h2></div>
          <Button icon={venueOwnReview ? "✎" : "＋"} variant="secondary" type="button" onClick={() => setReviewingPlace(true)}>{venueOwnReview ? "Editar reseña" : "Agregar reseña"}</Button>
        </div>
        {venue.reviews.length ? <div className="review-columns">{venue.reviews.map((review) => <VenueReview key={review.author} review={review} />)}</div> : <p className="empty-state">Todavía no hay opiniones sobre el lugar.</p>}
      </section>
      <section className="watch-counter">
        <div>
          <p className="eyebrow">HISTORIAL DE VISITAS</p>
          <h2>{visitList.length ? `${visitList.length} visita${visitList.length === 1 ? "" : "s"}` : "Todavía no fueron"}</h2>
          <p>{visitList[0] ? `Última: ${dateLabel(visitList[0].visitedOn)}` : "Registren una fecha al ir."}</p>
        </div>
      </section>
      {visitList.length > 0 && (
        <section className="reviews-section">
          <div className="section-title">
            <div><p className="eyebrow">DETALLE DE VISITA</p><h2>La experiencia</h2></div>
            <strong>{visitList.length} fechas</strong>
          </div>
          <div className="item-date-pager">
            <label>
              Elegir visita
              <select value={selectedVisitId ?? ""} onChange={(event) => setSelectedVisitId(Number(event.target.value))}>
                {visitList.map((entry) => <option key={entry.id} value={entry.id}>{dateLabel(entry.visitedOn)} · registrada por {entry.createdBy}</option>)}
              </select>
            </label>
            {selectedVisitId && <>
              <Button icon="✎" variant="secondary" type="button" onClick={() => setEditingVisit(visitList.find((value) => value.id === selectedVisitId)!)}>Editar visita</Button>
              <Button icon={ownReview ? "✎" : "＋"} variant="secondary" type="button" onClick={() => setReviewing(ownReview ?? null)}>{ownReview ? "Editar reseña" : "Agregar reseña"}</Button>
            </>}
          </div>
          {visit.isLoading && <p className="muted" aria-busy="true">Cargando visita…</p>}
          {current && <VisitExperience visit={current} onUpload={(files) => uploadPhotos.mutateAsync(files)} onDeletePhoto={setDeletingPhoto} onSetCover={(photo) => setCover.mutate(photo.id)} />}
        </section>
      )}
      {!visitList.length && <p className="empty-state">Todavía no hay visitas. La primera fecha abre la galería y las reseñas de esta experiencia.</p>}
      {editingPlace && <PlaceForm place={venue} onClose={() => setEditingPlace(false)} />}
      {reviewingPlace && <PlaceReviewForm place={venue} review={venue.reviews.find((review) => review.author === session.get()?.username)} onClose={() => setReviewingPlace(false)} />}
      {editingVisit !== undefined && <VisitForm placeId={venue.id} visit={editingVisit ?? undefined} onClose={() => setEditingVisit(undefined)} onSaved={(saved) => setSelectedVisitId(saved.id)} onDeleted={() => setSelectedVisitId(undefined)} />}
      {reviewing !== undefined && current && <VisitReviewForm placeId={venue.id} visit={current} review={reviewing ?? undefined} onClose={() => setReviewing(undefined)} />}
      {confirmingDelete && <ConfirmDialog title="¿Borrar este lugar?" message={removePlace.error ? removePlace.error.message : "Se archivará el lugar y se conservarán sus visitas."} confirmLabel="Borrar lugar" pending={removePlace.isPending} onClose={() => setConfirmingDelete(false)} onConfirm={() => removePlace.mutate()} />}
      {deletingPhoto && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se eliminará definitivamente de la visita." confirmLabel="Quitar foto" pending={removePhoto.isPending} onClose={() => setDeletingPhoto(undefined)} onConfirm={() => removePhoto.mutate(deletingPhoto.id)} />}
    </section>
  );
}

function VisitExperience({
  visit,
  onUpload,
  onDeletePhoto,
  onSetCover,
}: {
  visit: PlaceVisit;
  onUpload: (files: File[]) => Promise<unknown>;
  onDeletePhoto: (photo: ExperiencePhoto) => void;
  onSetCover: (photo: ExperiencePhoto) => void;
}) {
  return (
    <div className="experience-detail">
      <p className="muted">Visita del {dateLabel(visit.visitedOn)}. Registrada por {visit.createdBy}; última edición de {visit.updatedBy}.</p>
      <ExperienceGallery accentLabel="VISITA" emptyIcon="🍽️" name={`la visita del ${dateLabel(visit.visitedOn)}`} photos={visit.photos} coverPhotoId={visit.coverPhoto?.id} onUpload={async (files) => { await onUpload(files); }} onDelete={onDeletePhoto} onSetCover={onSetCover} />
      <div className="section-title section-title--compact">
        <div><p className="eyebrow">RESEÑAS</p><h2>Cómo estuvo</h2></div>
        <strong>{visit.reviews.length}</strong>
      </div>
      {visit.reviews.length ? (
        <div className="review-columns">
          {visit.reviews.map((review) => (
            <article className="place-review" key={review.id}>
              <div className="place-review__heading">
                <h3>Reseña de {review.author}</h3>
              </div>
              <div className="place-review__rating">
                <StarRating label={`Puntuación de ${review.author}`} value={review.overall} />
                <span>{review.overall}/5</span>
              </div>
              <p>{review.comment || "Sin comentario."}</p>
              <div className="place-review__metrics">
                {visitMetrics.map(([key, label]) => (
                  <span key={key}>
                    <b>{label}</b>
                    <strong>{review[key] ?? "-"}</strong>
                  </span>
                ))}
              </div>
              <small>Creada por {review.author} · editada por {review.updatedBy}</small>
            </article>
          ))}
        </div>
      ) : <p className="empty-state">Todavía no hay reseñas para esta visita.</p>}
    </div>
  );
}

function VenueReview({ review }: { review: PlaceReview }) {
  const metrics = [
    ["location", "Ubicación"], ["heating", "Calefacción"], ["bathrooms", "Baños"], ["exterior", "Exterior"], ["seating", "Asientos"], ["service", "Atención"], ["ambiance", "Ambiente"],
  ] as const;
  return <article className="place-review"><div className="place-review__heading"><h3>Opinión de {review.author}</h3></div>{review.comment && <p>{review.comment}</p>}<div className="place-review__metrics">{metrics.map(([key, label]) => <span key={key}><b>{label}</b><strong>{review[key] ?? "-"}</strong></span>)}</div></article>;
}
