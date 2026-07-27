import { useEffect, useRef, useState } from "react";
import { photoInputAccept, preparePhoto, rotatePhoto } from "../../lib/photos";
import { Button, buttonClassName } from "./Button";

type PhotoDraft = {
  file: File;
  id: string;
  rotation: number;
  source: File;
  url: string;
};

type PhotoPickerProps = {
  disabled?: boolean;
  maxFiles?: number;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  onPreparingChange?: (preparing: boolean) => void;
  selectLabel?: string;
};

export function PhotoPicker({
  disabled = false,
  maxFiles = 1,
  multiple = false,
  onChange,
  onPreparingChange,
  selectLabel = "Elegir foto",
}: PhotoPickerProps) {
  const [drafts, setDrafts] = useState<PhotoDraft[]>([]);
  const [error, setError] = useState<string>();
  const [preparing, setPreparing] = useState(false);
  const urls = useRef(new Set<string>());
  const sequence = useRef(0);

  const registerUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  };

  const revokeUrl = (url: string) => {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  };

  const setBusy = (value: boolean) => {
    setPreparing(value);
    onPreparingChange?.(value);
  };

  const publish = (next: PhotoDraft[]) => {
    setDrafts(next);
    onChange(next.map((draft) => draft.file));
  };

  const clear = () => {
    drafts.forEach((draft) => revokeUrl(draft.url));
    publish([]);
  };

  useEffect(() => () => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const select = async (selected: FileList | null) => {
    if (!selected?.length || disabled || preparing) return;
    const files = [...selected];
    const remaining = Math.max(0, maxFiles - (multiple ? drafts.length : 0));
    if (files.length > remaining) {
      setError(`Podés elegir hasta ${maxFiles} ${maxFiles === 1 ? "foto" : "fotos"}.`);
      return;
    }

    try {
      setBusy(true);
      setError(undefined);
      const prepared = await Promise.all(files.map(preparePhoto));
      const nextDrafts = prepared.map((source) => ({
        file: source,
        id: `${source.name}-${sequence.current++}`,
        rotation: 0,
        source,
        url: registerUrl(source),
      }));
      if (!multiple) clear();
      publish(multiple ? [...drafts, ...nextDrafts] : nextDrafts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos preparar la foto.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async (id: string, direction: -1 | 1) => {
    const draft = drafts.find((value) => value.id === id);
    if (!draft || preparing) return;
    try {
      setBusy(true);
      setError(undefined);
      const rotation = draft.rotation + direction;
      const file = await rotatePhoto(draft.source, rotation);
      const url = registerUrl(file);
      const next = drafts.map((value) => value.id === id ? { ...value, file, rotation, url } : value);
      revokeUrl(draft.url);
      publish(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos rotar la foto.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    const draft = drafts.find((value) => value.id === id);
    if (!draft || preparing) return;
    revokeUrl(draft.url);
    publish(drafts.filter((value) => value.id !== id));
  };

  return <div className="photo-picker">
    <label className={buttonClassName("secondary", "photo-picker__select")}>
      <span className="button__icon" aria-hidden="true">{multiple ? "🖼️" : "📷"}</span>
      <span className="button__label">{preparing ? "Preparando foto..." : selectLabel}</span>
      <input type="file" accept={photoInputAccept} multiple={multiple} disabled={disabled || preparing || drafts.length >= maxFiles} onChange={(event) => { void select(event.target.files); event.currentTarget.value = ""; }} />
    </label>
    {drafts.length > 0 && <div className="photo-picker__previews" aria-label="Fotos seleccionadas">
      {drafts.map((draft, index) => <figure className="photo-picker__preview" key={draft.id}>
        <img className="form-photo-preview" src={draft.url} alt={`Vista previa de la foto ${index + 1}`} />
        <figcaption>
          <span>{draft.file.name}</span>
          <div className="photo-picker__controls">
            <Button type="button" variant="secondary" disabled={disabled || preparing} onClick={() => { void rotate(draft.id, -1); }}>Rotar izquierda</Button>
            <Button type="button" variant="secondary" disabled={disabled || preparing} onClick={() => { void rotate(draft.id, 1); }}>Rotar derecha</Button>
            <Button type="button" variant="tertiary" disabled={disabled || preparing} onClick={() => remove(draft.id)}>Quitar</Button>
          </div>
        </figcaption>
      </figure>)}
    </div>}
    {error && <p className="form-error">{error}</p>}
  </div>;
}
