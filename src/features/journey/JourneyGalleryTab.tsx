import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useQuery } from "../../lib/locationQuery";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { MediaImage } from "../../components/ui/MediaImage";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatDate, getJourneyGallery, offsetJourneyDate, uploadJourneyPhoto, setJourneyCover, deleteResource, type Detail, type JourneyFile, type JourneySourcePhoto } from "./journey";
import type { ExperiencePhoto } from "../../types/domain";

const sectionNames: Record<string, string> = {
  FOOD: "WhereFood",
  FILM: "WhichMovie",
  COOK: "WhoCook",
  FUN: "WhyFun",
};

function galleryPhoto(file: JourneyFile, position: number): ExperiencePhoto {
  return {
    id: file.id,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl ?? file.url,
    width: file.width ?? 640,
    height: file.height ?? 480,
    position,
    createdBy: "",
    createdAt: "",
  };
}

function dayList(from: string, to: string) {
  const result: string[] = [];
  for (let day = from; day <= to; day = offsetJourneyDate(day, 1)) result.push(day);
  return result;
}

export function JourneyGalleryTab({ detail, editable, onRefresh }: {
  detail: Detail;
  editable: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const client = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(detail.trip.startsOn);
  const [removing, setRemoving] = useState<JourneyFile>();
  const tripPhotos = detail.files.filter((file) => file.purpose === "TRIP");
  const dayPhotos = detail.files.filter((file) => file.purpose === "DAY" && file.day === selectedDay);
  const dates = useMemo(() => dayList(detail.trip.startsOn, detail.trip.endsOn), [detail.trip.startsOn, detail.trip.endsOn]);
  const linked = useQuery({
    // Source sections already invalidate this prefix when their experiences or photos change.
    queryKey: ["journey-day", "gallery", detail.trip.id],
    queryFn: () => getJourneyGallery(detail.trip.id),
  });
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["journey", detail.trip.id] }),
      client.invalidateQueries({ queryKey: ["journey-day", "gallery", detail.trip.id] }),
      client.invalidateQueries({ queryKey: ["journeys"] }),
    ]);
  };
  const upload = async (files: File[], purpose: "TRIP" | "DAY", day?: string) => {
    for (const file of files) await uploadJourneyPhoto(detail.trip.id, file, purpose, day);
    await Promise.all([invalidate(), onRefresh()]);
  };
  const cover = async (photo: ExperiencePhoto) => {
    await setJourneyCover(detail.trip.id, String(photo.id));
    await onRefresh();
  };
  const removePhoto = useMutation({
    mutationFn: (file: JourneyFile) => deleteResource("files", file.id),
    onSuccess: async () => {
      await Promise.all([invalidate(), onRefresh()]);
      setRemoving(undefined);
    },
  });
  const ownTripPhotos = tripPhotos.map(galleryPhoto);
  const ownDayPhotos = dayPhotos.map(galleryPhoto);

  return <div className="journey-gallery-tab">
    <section className="journey-gallery-owned" aria-labelledby="journey-gallery-own-title">
      <div className="journey-panel__heading">
        <div><p className="eyebrow">FOTOS PROPIAS</p><h2 id="journey-gallery-own-title">Recuerdos del viaje</h2><p className="muted">Fotos generales y extras que agregaron ustedes.</p></div>
      </div>
      <ExperienceGallery accentLabel="FOTOS DEL VIAJE" emptyIcon="✦" name={detail.trip.name}
        photos={ownTripPhotos} coverPhotoId={detail.trip.coverPhotoId ?? undefined}
        maxPhotos={detail.trip.maxTripPhotos} limitCount={tripPhotos.length} manageInModal
        onUpload={editable ? (files) => upload(files, "TRIP") : undefined}
        onSetCover={editable ? cover : undefined}
        onDelete={editable ? (photo) => {
          const file = tripPhotos.find((item) => item.id === photo.id);
          if (file) setRemoving(file);
        } : undefined} />
    </section>

    <section className="journey-gallery-days" aria-labelledby="journey-gallery-days-title">
      <div className="journey-panel__heading">
        <div><p className="eyebrow">FOTOS POR DÍA</p><h2 id="journey-gallery-days-title">Extras de cada día</h2><p className="muted">Elegí una fecha para ver o sumar sus fotos.</p></div>
        <label className="journey-gallery-day-select">Día del viaje
          <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
            {dates.map((date) => <option value={date} key={date}>{formatDate(date)}</option>)}
          </select>
        </label>
      </div>
      <ExperienceGallery accentLabel={`FOTOS DEL ${formatDate(selectedDay).toUpperCase()}`} emptyIcon="✦" name={`${detail.trip.name} · ${formatDate(selectedDay)}`}
        photos={ownDayPhotos} coverPhotoId={detail.trip.coverPhotoId ?? undefined}
        maxPhotos={detail.trip.maxDayPhotos} limitCount={dayPhotos.length} manageInModal
        onUpload={editable ? (files) => upload(files, "DAY", selectedDay) : undefined}
        onSetCover={editable ? cover : undefined}
        onDelete={editable ? (photo) => {
          const file = dayPhotos.find((item) => item.id === photo.id);
          if (file) setRemoving(file);
        } : undefined} />
    </section>

    <section className="journey-gallery-linked" aria-labelledby="journey-gallery-linked-title">
      <div className="journey-panel__heading">
        <div><p className="eyebrow">RECOPILADO</p><h2 id="journey-gallery-linked-title">Fotos de sus secciones</h2><p className="muted">Imágenes de experiencias vinculadas al viaje, agrupadas por día y sección.</p></div>
        <span className="journey-gallery-linked__count">{(linked.data ?? []).reduce((count, entry) => count + entry.photos.length, 0)} fotos</span>
      </div>
      {linked.isLoading && <p className="muted" role="status">Buscando fotos vinculadas…</p>}
      {linked.error && <div className="journey-gallery-linked__error"><p className="form-error" role="alert">{linked.error.message}</p><Button variant="secondary" onClick={() => void linked.refetch()}>Reintentar</Button></div>}
      {linked.data?.length === 0 && <p className="journey-empty">Todavía no hay fotos en las experiencias vinculadas a este viaje.</p>}
      {linked.data && linked.data.length > 0 && <div className="journey-gallery-linked__groups">
        {linked.data.map((entry, entryIndex) => <article className="journey-gallery-linked__group" key={`${entry.date}:${entry.section}:${entry.title}:${entryIndex}`}>
          <header><span className="journey-gallery-linked__section">{sectionNames[entry.section] ?? entry.section}</span><time dateTime={entry.date}>{formatDate(entry.date)}</time><Link to={entry.href.startsWith("/app/") ? entry.href : `/app${entry.href}`}>{entry.title} ↗</Link></header>
          <div className="journey-gallery-linked__photos">
            {entry.photos.map((photo: JourneySourcePhoto) => <a href={entry.href.startsWith("/app/") ? entry.href : `/app${entry.href}`} key={photo.id} aria-label={`Abrir ${entry.title}`}>
              <MediaImage src={photo.thumbnailUrl || photo.url} fallbackSrc={photo.url} alt={`Foto de ${entry.title}`} width={photo.width || 320} height={photo.height || 200} loading="lazy" />
            </a>)}
          </div>
        </article>)}
      </div>}
    </section>

    {removing && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se quitará del viaje." confirmLabel="Quitar foto" pending={removePhoto.isPending}
      onClose={() => setRemoving(undefined)} onConfirm={() => removePhoto.mutate(removing)} />}
  </div>;
}
