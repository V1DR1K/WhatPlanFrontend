import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ExperiencePhoto } from "../../types/domain";
import { Button } from "./Button";
import { MediaImage } from "./MediaImage";
import { PhotoViewer } from "./PhotoViewer";
import { PhotoPicker } from "./PhotoPicker";
import { PhotoManagerModal } from "./PhotoManagerModal";

const AUTO_ADVANCE_MS = 5_000;
export const MAX_EXPERIENCE_PHOTOS = 4;

export const experiencePhotoSlots = (photoCount: number) =>
  Math.max(0, MAX_EXPERIENCE_PHOTOS - photoCount);

export const nextPhotoIndex = (current: number, total: number) =>
  total > 0 ? (current + 1) % total : 0;

export const previousPhotoIndex = (current: number, total: number) =>
  total > 0 ? (current - 1 + total) % total : 0;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useFinePointer() {
  const [finePointer, setFinePointer] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return finePointer;
}

type ExperienceGalleryProps = {
  accentLabel: string;
  afterActions?: ReactNode;
  coverPending?: boolean;
  coverPhotoId?: number;
  emptyIcon: string;
  name: string;
  onDelete?: (photo: ExperiencePhoto) => void;
  onSetCover?: (photo: ExperiencePhoto) => void;
  onUpload?: (files: File[]) => Promise<void>;
  photos: ExperiencePhoto[];
  manageInModal?: boolean;
};

export function ExperienceGallery({ accentLabel, afterActions, coverPending = false, coverPhotoId, emptyIcon, manageInModal = false, name, onDelete, onSetCover, onUpload, photos }: ExperienceGalleryProps) {
  const coverIndex = Math.max(0, photos.findIndex((photo) => photo.id === coverPhotoId));
  const [selected, setSelected] = useState(coverIndex);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [uploadError, setUploadError] = useState<string>();
  const touchStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const photo = photos[selected];
  const paused = hovered || focused || manualPaused || reducedMotion || !finePointer || photos.length < 2;
  useEffect(() => {
    setSelected((current) => Math.min(current, Math.max(photos.length - 1, 0)));
  }, [photos.length]);

  useEffect(() => {
    if (coverPhotoId) setSelected(coverIndex);
  }, [coverIndex, coverPhotoId]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setSelected((current) => nextPhotoIndex(current, photos.length)), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, photos.length]);

  const move = (direction: "next" | "previous") => {
    setManualPaused(true);
    setSelected((current) => direction === "next" ? nextPhotoIndex(current, photos.length) : previousPhotoIndex(current, photos.length));
  };

  const upload = async () => {
    if (!onUpload || !pendingPhotos.length) return;
    const remaining = experiencePhotoSlots(photos.length);
    if (pendingPhotos.length > remaining) {
      setUploadError(`Esta experiencia admite hasta ${MAX_EXPERIENCE_PHOTOS} fotos. Podés subir ${remaining} más.`);
      return;
    }
    try {
      setUploading(true);
      setUploadError(undefined);
      await onUpload(pendingPhotos);
      setPendingPhotos([]);
      setPickerKey((current) => current + 1);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No pudimos subir las fotos.");
    } finally {
      setUploading(false);
    }
  };

  return <section className="experience-gallery" aria-label={`Galería de ${name}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
     <div className="experience-gallery__stage" role={photos.length > 1 ? "tabpanel" : undefined} id={photos.length > 1 ? "experience-gallery-panel" : undefined} aria-live="polite" onTouchStart={(event) => { const touch = event.changedTouches[0]; if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => { const start = touchStart.current; const touch = event.changedTouches[0]; touchStart.current = undefined; if (!start || !touch) return; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return; move(dx < 0 ? "next" : "previous"); }}>
       {photo ? <button className="experience-gallery__image-button" type="button" onClick={() => { setManualPaused(true); setLightbox(true); }} aria-label={`Ampliar foto ${selected + 1} de ${photos.length} de ${name}`}><MediaImage className="catalog-media-card__image" src={photo.url} alt={`Foto ${selected + 1} de ${name}`} width={photo.width} height={photo.height} loading="eager" /></button> : <div className="experience-gallery__empty" aria-label="Sin fotos todavía"><span aria-hidden="true">{emptyIcon}</span><p>Esta experiencia todavía no tiene fotos.</p></div>}
      {photo && <span className="experience-gallery__count">{selected + 1} / {photos.length}</span>}
    </div>
    {photos.length > 1 && <div className="experience-gallery__navigation" aria-label="Navegar fotos">
      <Button icon="‹" type="button" variant="secondary" onClick={() => move("previous")} aria-label="Ver foto anterior" title="Ver foto anterior">Anterior</Button>
      <Button icon="›" type="button" variant="secondary" onClick={() => move("next")} aria-label="Ver foto siguiente" title="Ver foto siguiente">Siguiente</Button>
    </div>}
     <div className="experience-gallery__dots" role={photos.length > 1 ? "tablist" : undefined} aria-label={photos.length > 1 ? "Elegir foto" : undefined}>{photos.length > 1 && photos.map((value, index) => <button key={value.id} id={`experience-gallery-tab-${value.id}`} type="button" role="tab" aria-controls="experience-gallery-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} aria-label={`Ver foto ${index + 1}`} className={selected === index ? "is-selected" : ""} onClick={() => { setManualPaused(true); setSelected(index); }} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); const next = nextPhotoIndex(index, photos.length); setSelected(next); document.getElementById(`experience-gallery-tab-${photos[next].id}`)?.focus(); } if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); const next = previousPhotoIndex(index, photos.length); setSelected(next); document.getElementById(`experience-gallery-tab-${photos[next].id}`)?.focus(); } if (event.key === "Home" || event.key === "End") { event.preventDefault(); const next = event.key === "Home" ? 0 : photos.length - 1; setSelected(next); document.getElementById(`experience-gallery-tab-${photos[next].id}`)?.focus(); } }} />)}</div>
    <div className="experience-gallery__actions">
      {manageInModal && onUpload && <PhotoManagerModal mode="gallery" name={name} photos={photos} coverPhotoId={coverPhotoId} coverPending={coverPending} onUpload={onUpload} onSetCover={onSetCover} onDelete={onDelete} />}
      {!manageInModal && onUpload && <div className="experience-gallery__upload"><PhotoPicker key={pickerKey} multiple maxFiles={experiencePhotoSlots(photos.length)} disabled={uploading} onChange={setPendingPhotos} onPreparingChange={setPreparingPhotos} selectLabel="Agregar fotos" />{pendingPhotos.length > 0 && <Button type="button" variant="secondary" disabled={uploading || preparingPhotos} onClick={() => { void upload(); }}>{uploading ? "Subiendo fotos..." : `Subir ${pendingPhotos.length} ${pendingPhotos.length === 1 ? "foto" : "fotos"}`}</Button>}</div>}
      {!manageInModal && onSetCover && <div className="experience-gallery__cover-slot">{photo ? photo.id === coverPhotoId ? <span>⭐ Foto de portada</span> : <Button icon="⭐" variant="secondary" type="button" disabled={coverPending} onClick={() => onSetCover(photo)}>Usar de portada</Button> : null}</div>}
      {!manageInModal && photo && onDelete && <Button className="experience-gallery__delete" icon="🗑️" variant="destructive" type="button" onClick={() => onDelete(photo)}>Quitar foto</Button>}
    </div>
    {afterActions}
    <p className="experience-gallery__meta">{accentLabel} · {photos.length}/{MAX_EXPERIENCE_PHOTOS} fotos{manualPaused && photos.length > 1 ? " · carrusel pausado" : ""}</p>
    {uploadError && <p className="form-error">{uploadError}</p>}
     {lightbox && photo && <PhotoViewer photos={photos.map((value, index) => ({ src: value.url, alt: `Foto ${index + 1} de ${name}`, width: value.width, height: value.height }))} initialIndex={selected} onIndexChange={setSelected} onClose={() => setLightbox(false)} />}
  </section>;
}
