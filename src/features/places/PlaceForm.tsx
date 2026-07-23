import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { showNotice } from "../../lib/flash";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import type { Place } from "../../types/domain";
import { getCategories } from "../categories/categories";
import { getHighlightTags } from "./highlightTags";
import { savePlace, uploadPlacePhoto } from "./places";

const mapsSearch = (address: string) =>
  address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : undefined;

export function PlaceForm({
  onClose,
  place,
  onSaved,
}: {
  onClose: () => void;
  place?: Place;
  onSaved?: (place: Place) => void;
}) {
  const [categoryId, setCategoryId] = useState(() =>
    place?.category.id ? String(place.category.id) : "",
  );
  const [tagIds, setTagIds] = useState<number[]>(() =>
    place?.tags.map((tag) => tag.id) ?? [],
  );
  const [photo, setPhoto] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
  const qc = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const tagsQuery = useQuery({ queryKey: ["highlight-tags"], queryFn: getHighlightTags });
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const address = String(form.get("address")).trim();
      return savePlace(
        {
          name: String(form.get("name")).trim(),
          address: address || undefined,
          sourceUrl: String(form.get("sourceUrl")) || undefined,
          mapsUrl: mapsSearch(address),
          categoryId: Number(form.get("categoryId")),
          tagIds,
        },
        place?.id,
      );
    },
    onSuccess: async (saved) => {
      let result = saved;
      let photoUploadError: string | undefined;
      if (photo) {
        try {
          result = await uploadPlacePhoto(saved.id, photo);
        } catch (error) {
          photoUploadError = error instanceof Error
            ? `El lugar se guardó, pero no pudimos subir la foto: ${error.message}`
            : "El lugar se guardó, pero no pudimos subir la foto.";
        }
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["places"] }),
        qc.invalidateQueries({ queryKey: ["place", saved.id] }),
      ]);
      showNotice(photoUploadError ?? (place
        ? "Actualizamos el lugar compartido."
        : "Lugar agregado. Ahora pueden registrar la primera visita."), photoUploadError ? "error" : "success");
      onSaved?.(result);
      onClose();
    },
  });
  const pending = mutation.isPending;

  return (
    <Modal onClose={onClose} confirmDiscard pending={pending}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <p className="eyebrow">{place ? "EDITAR LUGAR" : "NUEVO LUGAR"}</p>
        <h2>{place ? "Ajustemos el lugar" : "¿A dónde quieren ir?"}</h2>
        <label>
          Nombre
          <input name="name" defaultValue={place?.name} required autoFocus />
        </label>
        <label>
          Dirección <small className="tiny">Opcional</small>
          <input name="address" defaultValue={place?.address ?? undefined} placeholder="Calle 123, Rosario" />
        </label>
        <label>
          URL de referencia <small className="tiny">Opcional</small>
          <input name="sourceUrl" type="url" defaultValue={place?.sourceUrl ?? undefined} placeholder="https://instagram.com/reel/..." />
        </label>
        <label>
          Foto de perfil <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small>
          <input
            type="file"
            accept={photoInputAccept}
            onChange={async (event) => {
              const selected = event.target.files?.[0];
              setPhotoError(undefined);
              if (!selected) {
                setPhoto(undefined);
                return;
              }
              try {
                setPhoto(await preparePhoto(selected));
              } catch (error) {
                setPhoto(undefined);
                setPhotoError(error instanceof Error ? error.message : "No pudimos preparar la foto.");
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
        <small className="tiny">
          {photo
            ? `Se guardará ${photo.name} como foto del lugar.`
            : place?.photoUrl
              ? "La foto actual se conservará si no elegís otra."
              : "Esta foto es independiente de las galerías de cada visita."}
        </small>
        {photoError && <p className="form-error">{photoError}</p>}
        <label>
          Tipo
          <select name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">Elegí una categoría</option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="tag-picker">
          <legend>¿Por qué se destaca?</legend>
          <p>Elegí todas las etiquetas que correspondan.</p>
          <div className="tag-options">
            {tagsQuery.data?.map((tag) => (
              <label className="tag-option" key={tag.id}>
                <input
                  type="checkbox"
                  checked={tagIds.includes(tag.id)}
                  onChange={() =>
                    setTagIds((current) =>
                      current.includes(tag.id)
                        ? current.filter((id) => id !== tag.id)
                        : [...current, tag.id],
                    )
                  }
                />
                <span>{tag.emoji} {tag.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="main-button" disabled={pending}>
          {pending ? "Guardando…" : place ? "✓ Guardar lugar" : "＋ Agregar lugar"}
        </button>
        {mutation.error && <p className="form-error">{mutation.error.message}</p>}
      </form>
    </Modal>
  );
}
