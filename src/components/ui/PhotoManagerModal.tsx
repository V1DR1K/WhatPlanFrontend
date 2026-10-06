import { useState } from "react";
import type { ExperiencePhoto } from "../../types/domain";
import { Button } from "./Button";
import { MediaImage } from "./MediaImage";
import { Modal } from "./Modal";
import { PhotoPicker } from "./PhotoPicker";
import { PhotoViewer } from "./PhotoViewer";

type AttachmentProps = {
  mode: "attachment";
  name: string;
  photo?: File;
  onConfirm: (photo?: File) => void;
  onPreparingChange?: (preparing: boolean) => void;
};

type GalleryProps = {
  mode: "gallery";
  name: string;
  manageLabel?: string;
  triggerClassName?: string;
  photos: ExperiencePhoto[];
  coverPhotoId?: number | string;
  maxPhotos?: number;
  limitCount?: number;
  coverPending?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpload: (files: File[], originals?: File[]) => Promise<void>;
  onSetCover?: (photo: ExperiencePhoto) => void;
  onDelete?: (photo: ExperiencePhoto) => void;
};

type Props = AttachmentProps | GalleryProps;

export function PhotoManagerModal(props: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [pickerKey, setPickerKey] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number>();
  const controlled = props.mode === "gallery" && props.open !== undefined;
  const open = controlled ? props.open : internalOpen;
  const setOpen = (next: boolean) => {
    if (controlled) {
      if (props.mode === "gallery") props.onOpenChange?.(next);
      return;
    }
    setInternalOpen(next);
  };

  const close = () => {
    if (uploading || preparing) return;
    setOpen(false);
    setFiles([]);
    setOriginalFiles([]);
    setError(undefined);
    if (props.mode === "attachment") props.onPreparingChange?.(false);
  };

  const upload = async () => {
    if (props.mode !== "gallery" || !files.length) return;
    try {
      setUploading(true);
      setError(undefined);
      await props.onUpload(files, originalFiles.length === files.length ? originalFiles : files);
      setFiles([]);
      setOriginalFiles([]);
      setPickerKey((key) => key + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos subir las fotos.");
    } finally {
      setUploading(false);
    }
  };

  const confirmAttachment = () => {
    if (props.mode !== "attachment" || preparing) return;
    props.onConfirm(files[0]);
    close();
  };

  const photoLimit = props.mode === "gallery" ? props.maxPhotos ?? 4 : 1;
  const limitCount = props.mode === "gallery" ? props.limitCount ?? props.photos.length : 0;
  const maxFiles = props.mode === "gallery" ? Math.max(0, photoLimit - limitCount) : 1;
  const selectedFile = props.mode === "attachment" ? props.photo : undefined;
  const heading = props.mode === "gallery" ? `Fotos de ${props.name}` : `Foto ${props.name}`;

  return <>
    <Button className={props.mode === "gallery" ? props.triggerClassName : undefined} type="button" variant="secondary" icon={props.mode === "gallery" ? "🖼️" : "📷"} onClick={() => { setFiles(props.mode === "attachment" && props.photo ? [props.photo] : []); setOriginalFiles([]); setError(undefined); setOpen(true); }}>
      {props.mode === "gallery" ? props.manageLabel ?? "Administrar fotos" : selectedFile ? "Cambiar foto" : "Agregar foto"}
    </Button>
    {open && <Modal size="wide" className="photo-manager-modal" onClose={close} pending={uploading || preparing} title={`Administrar ${heading.toLowerCase()}`}>
      <div className="photo-manager">
        <h2>{heading}</h2>
        <p className="muted">JPG, PNG, WebP o HEIC · hasta 10 MB</p>

        {props.mode === "attachment" ? <>
          <PhotoPicker key={selectedFile?.name ?? "attachment"} initialFiles={selectedFile ? [selectedFile] : undefined} onChange={setFiles} onPreparingChange={(value) => { setPreparing(value); props.onPreparingChange?.(value); }} />
          <div className="photo-manager__actions">
            <Button type="button" variant="secondary" disabled={preparing} onClick={close}>Cancelar</Button>
            <Button type="button" disabled={preparing || uploading} onClick={confirmAttachment}>Usar foto</Button>
          </div>
        </> : <>
          <p className="photo-manager__count">{limitCount}/{photoLimit} fotos para esta galería · podés agregar {maxFiles}</p>
          {props.photos.length > 0 && <div className="photo-manager__saved" aria-label="Fotos guardadas">
            {props.photos.map((photo, index) => {
              const isCover = photo.id === props.coverPhotoId;
              return (
                <article className="photo-manager__photo" key={photo.id}>
                  <button className="photo-manager__preview" type="button" onClick={() => setViewerIndex(index)} aria-label={`Ampliar foto ${index + 1} de ${props.name}`}>
                    <MediaImage src={photo.thumbnailUrl || photo.url} fallbackSrc={photo.url} alt={`Foto ${index + 1} de ${props.name}`} width={photo.width} height={photo.height} loading="lazy" />
                  </button>
                  <span className={`photo-manager__cover${isCover ? "" : " photo-manager__cover--empty"}`} aria-hidden={!isCover}>
                    {isCover ? "Foto de portada" : ""}
                  </span>
                  <div className="photo-manager__photo-actions">
                    {props.onSetCover && <Button type="button" className={isCover ? "photo-manager__cover-action" : undefined} variant="secondary" icon="⭐" disabled={isCover || props.coverPending || uploading} onClick={() => props.onSetCover?.(photo)}>Hacer portada</Button>}
                    {props.onDelete && <Button type="button" variant="destructive" icon="🗑️" disabled={uploading} onClick={() => props.onDelete?.(photo)}>Quitar</Button>}
                  </div>
                </article>
              );
            })}
          </div>}
          {maxFiles > 0 && <>
            <PhotoPicker key={`${props.photos.length}-${pickerKey}`} multiple maxFiles={maxFiles} disabled={uploading} onChange={(nextFiles, originals) => { setFiles(nextFiles); setOriginalFiles(originals); }} onPreparingChange={setPreparing} selectLabel="Agregar fotos" />
            {files.length > 0 && <Button type="button" disabled={uploading || preparing} onClick={() => { void upload(); }}>{uploading ? "Subiendo fotos…" : `Subir ${files.length} ${files.length === 1 ? "foto" : "fotos"}`}</Button>}
          </>}
          {props.photos.length === 0 && maxFiles === 0 && <p className="muted">No hay espacio para más fotos.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="button" variant="secondary" disabled={uploading} onClick={close}>Cerrar</Button>
        </>}
      </div>
    </Modal>}
    {viewerIndex !== undefined && props.mode === "gallery" && props.photos[viewerIndex] && <PhotoViewer photos={props.photos.map((photo, index) => ({ src: photo.url, alt: `Foto ${index + 1} de ${props.name}`, width: photo.width, height: photo.height }))} initialIndex={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(undefined)} />}
  </>;
}
