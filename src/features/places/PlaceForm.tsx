import { useLocationDraft } from '../journey/LocationFields';
import { useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '../../lib/locationQuery';
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { PhotoManagerModal } from "../../components/ui/PhotoManagerModal";
import { showNotice } from "../../lib/flash";
import type { Place } from "../../types/domain";
import { getCategories } from "../categories/categories";
import { getHighlightTags } from "./highlightTags";
import { savePlace, uploadPlacePhoto } from "./places";
import { ZoneAssignmentField } from "../zones/ZoneAssignmentField";

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
  const { cityId: zoneId, setCityId: setZoneId, stageId, setStageId } = useLocationDraft(place?.zoneId);
  const [tagIds, setTagIds] = useState<number[]>(() =>
    place?.tags.map((tag) => tag.id) ?? [],
  );
  const [photo, setPhoto] = useState<File>();
  const [preparingPhoto, setPreparingPhoto] = useState(false);
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
          acceptsReservations: form.get("acceptsReservations") === "on",
          categoryId: Number(form.get("categoryId")),
          tagIds,
          zoneId: zoneId ?? undefined, stageId: !place ? stageId : null,
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
    <Modal size="wide" onClose={onClose} confirmDiscard pending={pending}>
      <form
        className="place-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <p className="eyebrow">{place ? "EDITAR LUGAR" : "NUEVO LUGAR"}</p>
        <h2>{place ? "Ajustemos el lugar" : "¿A dónde quieren ir?"}</h2>
        <div className="place-editor-form__fields">
        <label>
          Nombre
          <input name="name" defaultValue={place?.name} required autoFocus />
        </label>
        <ZoneAssignmentField value={zoneId} onChange={setZoneId} stageId={stageId} onStageChange={setStageId} />
        <label>
          Dirección <small className="tiny">Opcional</small>
          <input name="address" defaultValue={place?.address ?? undefined} placeholder="Calle 123, Rosario" />
        </label>
        <label>
          URL de referencia <small className="tiny">Opcional</small>
          <input name="sourceUrl" type="url" defaultValue={place?.sourceUrl ?? undefined} placeholder="https://instagram.com/reel/..." />
        </label>
        <label className="place-reservation-toggle">
          <input name="acceptsReservations" type="checkbox" defaultChecked={place?.acceptsReservations} />
          <span>📅 Acepta reservas</span>
          <small className="tiny">Marcá esta opción si el lugar permite reservar antes de ir.</small>
        </label>
        <div className="photo-field">
          <span>Foto de perfil <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small></span>
          <PhotoManagerModal mode="attachment" name="del lugar" photo={photo} onConfirm={setPhoto} onPreparingChange={setPreparingPhoto} />
        </div>
        <small className="tiny">
          {photo
            ? `Se guardará ${photo.name} como foto del lugar.`
            : place?.photoUrl
              ? "La foto actual se conservará si no elegís otra."
              : "Esta foto es independiente de las galerías de cada visita."}
        </small>
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
        </div>
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
        <div className="modal-form__actions"><Button icon={place ? "💾" : "➕"} disabled={pending || preparingPhoto || (zoneId === null)}>
          {pending ? "Guardando…" : place ? "Guardar lugar" : "Agregar lugar"}
        </Button></div>
        {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      </form>
    </Modal>
  );
}
