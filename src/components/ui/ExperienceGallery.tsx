import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "../../lib/api";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import type { ExperiencePhoto } from "../../types/domain";

const AUTO_ADVANCE_MS = 5_000;

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

type ExperienceGalleryProps = {
  accentLabel: string;
  coverPhotoId?: number;
  emptyIcon: string;
  name: string;
  onDelete?: (photo: ExperiencePhoto) => void;
  onSetCover?: (photo: ExperiencePhoto) => void;
  onUpload?: (files: File[]) => Promise<void>;
  photos: ExperiencePhoto[];
};

export function ExperienceGallery({ accentLabel, coverPhotoId, emptyIcon, name, onDelete, onSetCover, onUpload, photos }: ExperienceGalleryProps) {
  const coverIndex = Math.max(0, photos.findIndex((photo) => photo.id === coverPhotoId));
  const [selected, setSelected] = useState(coverIndex);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const touchStart = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const photo = photos[selected];
  const paused = hovered || focused || manualPaused || reducedMotion || photos.length < 2;

  useEffect(() => {
    setSelected((current) => Math.min(current, Math.max(photos.length - 1, 0)));
  }, [photos.length]);

  useEffect(() => {
    if (coverPhotoId && selected >= photos.length) setSelected(coverIndex);
  }, [coverIndex, coverPhotoId, photos.length, selected]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setSelected((current) => nextPhotoIndex(current, photos.length)), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, photos.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") setSelected((current) => nextPhotoIndex(current, photos.length));
      if (event.key === "ArrowLeft") setSelected((current) => previousPhotoIndex(current, photos.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, photos.length]);

  const move = (direction: "next" | "previous") => {
    setManualPaused(true);
    setSelected((current) => direction === "next" ? nextPhotoIndex(current, photos.length) : previousPhotoIndex(current, photos.length));
  };

  const upload = async (files: FileList | null) => {
    if (!onUpload || !files?.length) return;
    const remaining = 12 - photos.length;
    if (files.length > remaining) {
      setUploadError(`Esta experiencia admite hasta 12 fotos. Podés subir ${remaining} más.`);
      return;
    }
    try {
      setUploading(true);
      setUploadError(undefined);
      await onUpload(await Promise.all([...files].map(preparePhoto)));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No pudimos subir las fotos.");
    } finally {
      setUploading(false);
    }
  };

  return <section className="experience-gallery" aria-label={`Galería de ${name}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="experience-gallery__stage" onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX; }} onTouchEnd={(event) => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; touchStart.current = undefined; if (start === undefined || end === undefined || Math.abs(start - end) < 36) return; move(start > end ? "next" : "previous"); }}>
      {photo ? <button className="experience-gallery__image-button" type="button" onClick={() => { setManualPaused(true); setLightbox(true); }} aria-label={`Ampliar foto ${selected + 1} de ${photos.length} de ${name}`}><img src={mediaUrl(photo.url)} alt={`Foto ${selected + 1} de ${name}`} /></button> : <div className="experience-gallery__empty" aria-label="Sin fotos todavía"><span aria-hidden="true">{emptyIcon}</span><p>Esta experiencia todavía no tiene fotos.</p></div>}
      {photos.length > 1 && <>
        <button className="experience-gallery__arrow experience-gallery__arrow--previous" type="button" onClick={() => move("previous")} aria-label="Ver foto anterior">←</button>
        <button className="experience-gallery__arrow experience-gallery__arrow--next" type="button" onClick={() => move("next")} aria-label="Ver foto siguiente">→</button>
      </>}
      {photo && <span className="experience-gallery__count">{selected + 1} / {photos.length}</span>}
    </div>
    {photos.length > 1 && <div className="experience-gallery__dots" role="tablist" aria-label="Elegir foto">{photos.map((value, index) => <button key={value.id} type="button" role="tab" aria-selected={selected === index} aria-label={`Ver foto ${index + 1}`} className={selected === index ? "is-selected" : ""} onClick={() => { setManualPaused(true); setSelected(index); }} />)}</div>}
    <div className="experience-gallery__actions">
      {onUpload && <label className="secondary-button experience-gallery__upload">{uploading ? "Subiendo fotos…" : "＋ Agregar fotos"}<input type="file" accept={photoInputAccept} multiple disabled={uploading || photos.length >= 12} onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ""; }} /></label>}
      {photo && onSetCover && photo.id !== coverPhotoId && <button className="secondary-button" type="button" onClick={() => onSetCover(photo)}>★ Usar de portada</button>}
      {photo && onDelete && <button className="danger-button experience-gallery__delete" type="button" onClick={() => onDelete(photo)}>× Quitar foto</button>}
    </div>
    <p className="experience-gallery__meta">{accentLabel} · {photos.length}/12 fotos{manualPaused && photos.length > 1 ? " · carrusel pausado" : ""}</p>
    {uploadError && <p className="form-error">{uploadError}</p>}
    {lightbox && photo && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Foto ampliada de ${name}`} onMouseDown={() => setLightbox(false)}><button className="photo-lightbox-close" type="button" onMouseDown={(event) => event.stopPropagation()} onClick={() => setLightbox(false)} aria-label="Cerrar foto ampliada">×</button><img src={mediaUrl(photo.url)} alt={`Foto ampliada ${selected + 1} de ${name}`} onMouseDown={(event) => event.stopPropagation()} />{photos.length > 1 && <div className="photo-lightbox__controls" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="secondary-button" onClick={() => move("previous")}>← Anterior</button><button type="button" className="secondary-button" onClick={() => move("next")}>Siguiente →</button></div>}</div>}
  </section>;
}
