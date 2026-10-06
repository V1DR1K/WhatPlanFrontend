import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useQuery } from "../../lib/locationQuery";
import { ExperienceGallery } from "../../components/ui/ExperienceGallery";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { photoDateOrNow } from "../../lib/photoMetadata";
import { formatDate, getJourneyGallery, uploadJourneyPhoto, setJourneyCover, deleteResource, type Detail, type JourneyFile } from "./journey";
import type { ExperiencePhoto } from "../../types/domain";

const sectionNames: Record<string, string> = {
  FOOD: "WhereFood",
  FILM: "WhichMovie",
  COOK: "WhoCook",
  FUN: "WhyFun",
};

type PhotoOrigin =
  | { kind: "trip" }
  | { kind: "day"; date: string }
  | { kind: "linked"; date: string; section: string; title: string; href: string };

type GalleryItem = { photo: ExperiencePhoto; origin: PhotoOrigin; date: string; position: number };

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

function appHref(href: string) {
  return href.startsWith("/app/") ? href : `/app${href}`;
}

export function JourneyGalleryTab({ detail, editable, onRefresh, managerOpen, onManagerOpenChange }: {
  detail: Detail;
  editable: boolean;
  onRefresh: () => Promise<unknown>;
  managerOpen?: boolean;
  onManagerOpenChange?: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const [removing, setRemoving] = useState<JourneyFile>();
  const tripPhotos = detail.files.filter((file) => file.purpose === "TRIP");
  const dayPhotos = detail.files.filter((file) => file.purpose === "DAY");
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
  const upload = async (files: File[], originals: File[] = files) => {
    for (const [index, file] of files.entries()) {
      const capturedAt = await photoDateOrNow(originals[index] ?? file);
      await uploadJourneyPhoto(detail.trip.id, file, "TRIP", undefined, capturedAt.toISOString());
    }
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
  const items = useMemo(() => {
    const result: GalleryItem[] = [];
    let position = 0;
    for (const file of tripPhotos) {
      result.push({ photo: galleryPhoto(file, position++), origin: { kind: "trip" }, date: "", position });
    }
    for (const file of dayPhotos) {
      if (!file.day) continue;
      result.push({ photo: galleryPhoto(file, position++), origin: { kind: "day", date: file.day }, date: file.day, position });
    }
    for (const entry of linked.data ?? []) {
      for (const [photoIndex, photo] of entry.photos.entries()) {
        result.push({
          photo: {
            id: `source:${photo.id}`,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || photo.url,
            width: photo.width || 640,
            height: photo.height || 480,
            position: position++,
            createdBy: "",
            createdAt: "",
          },
          origin: { kind: "linked", date: entry.date, section: entry.section, title: entry.title, href: entry.href },
          date: entry.date,
          position: photoIndex,
        });
      }
    }
    return result.sort((left, right) => {
      if (!left.date && right.date) return -1;
      if (left.date && !right.date) return 1;
      return left.date.localeCompare(right.date) || left.position - right.position;
    });
  }, [tripPhotos, dayPhotos, linked.data]);
  const origins = useMemo(() => new Map(items.map((item) => [String(item.photo.id), item.origin])), [items]);
  const ownFiles = useMemo(() => new Map([...tripPhotos, ...dayPhotos].map((file) => [file.id, file])), [tripPhotos, dayPhotos]);
  const linkedCount = items.filter((item) => item.origin.kind === "linked").length;
  const ownedCount = items.length - linkedCount;
  const galleryPhotos = items.map((item) => item.photo);

  const photoDetails = (photo: ExperiencePhoto) => {
    const origin = origins.get(String(photo.id));
    if (!origin) return null;
    const isCover = photo.id === detail.trip.coverPhotoId;
    if (origin.kind === "linked") return <div className="journey-gallery-origin" aria-live="polite">
      <div className="journey-gallery-origin__badges">
        <span className="journey-gallery-origin__badge journey-gallery-origin__badge--linked">Vinculada · {sectionNames[origin.section] ?? origin.section}</span>
        <time dateTime={origin.date}>{formatDate(origin.date)}</time>
      </div>
      <div className="journey-gallery-origin__description">
        <strong>{origin.title}</strong>
        <Link to={appHref(origin.href)}>Abrir ficha <span aria-hidden="true">↗</span></Link>
      </div>
    </div>;
    if (origin.kind === "day") return <div className="journey-gallery-origin" aria-live="polite">
      <div className="journey-gallery-origin__badges">
        <span className="journey-gallery-origin__badge">Foto propia · viaje</span>
        <time dateTime={origin.date}>{formatDate(origin.date)}</time>
        {isCover && <span className="journey-gallery-origin__badge journey-gallery-origin__badge--cover">Portada</span>}
      </div>
      <strong>Recuerdo del viaje</strong>
    </div>;
    return <div className="journey-gallery-origin" aria-live="polite">
      <div className="journey-gallery-origin__badges">
        <span className="journey-gallery-origin__badge">Foto propia · todo el viaje</span>
        {isCover && <span className="journey-gallery-origin__badge journey-gallery-origin__badge--cover">Portada</span>}
      </div>
      <strong>Recuerdo general del viaje</strong>
    </div>;
  };

  const askToRemove = (photo: ExperiencePhoto) => {
    const file = ownFiles.get(String(photo.id));
    if (file) setRemoving(file);
  };

  return <div className="journey-gallery-tab">
    <section className="journey-gallery" aria-labelledby="journey-gallery-title">
      <div className="journey-panel__heading">
        <div>
          <h2 id="journey-gallery-title">Galería del viaje</h2>
          <p className="muted">Recuerdos propios y fotos vinculadas a sus experiencias, ordenados por fecha.</p>
        </div>
        <div className="journey-gallery__totals" aria-label="Resumen de fotos">
          <strong>{items.length} {items.length === 1 ? "foto" : "fotos"}</strong>
          <span>{ownedCount} propias · {linkedCount} vinculadas</span>
        </div>
      </div>
      {linked.isLoading && <LoadingSkeleton variant="inline" inlineKind="gallery" section="journey" />}
      {linked.error && <div className="journey-gallery__error"><p className="form-error" role="alert">No pudimos cargar las fotos vinculadas: {linked.error.message}</p><Button variant="secondary" onClick={() => void linked.refetch()}>Reintentar</Button></div>}
      <ExperienceGallery
        accentLabel="GALERÍA COMPARTIDA"
        emptyIcon="✦"
        emptyMessage="Todavía no hay recuerdos. Agregá fotos del viaje o vinculá experiencias con imágenes."
        name={detail.trip.name}
        photos={galleryPhotos}
        manageInModal={editable}
        managerPhotos={[...tripPhotos, ...dayPhotos].map(galleryPhoto)}
        managerLabel="Administrar fotos"
        managerLimitCount={tripPhotos.length + dayPhotos.length}
        managerOpen={managerOpen}
        onManagerOpenChange={onManagerOpenChange}
        maxPhotos={detail.trip.maxTripPhotos}
        limitCount={tripPhotos.length + dayPhotos.length}
        coverPhotoId={detail.trip.coverPhotoId ?? undefined}
        photoDetails={photoDetails}
        metaLabel={`${items.length} fotos · ${ownedCount} propias · ${linkedCount} vinculadas`}
        onSetCover={editable ? cover : undefined}
        canSetCover={(photo) => ownFiles.has(String(photo.id))}
        onDelete={editable ? askToRemove : undefined}
        canDelete={(photo) => ownFiles.has(String(photo.id))}
        onUpload={editable ? (files, originals) => upload(files, originals) : undefined}
      />
    </section>

    {removing && <ConfirmDialog title="¿Quitar esta foto?" message="La foto se quitará del viaje." confirmLabel="Quitar foto" pending={removePhoto.isPending}
      onClose={() => setRemoving(undefined)} onConfirm={() => removePhoto.mutate(removing)} />}
  </div>;
}
