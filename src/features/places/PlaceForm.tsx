import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "../categories/categories";
import { getHighlightTags, saveHighlightTag } from "./highlightTags";
import {
  savePlace,
  savePlaceReview,
  uploadPlacePhoto,
  type PlaceReviewInput,
} from "./places";
import { Modal } from "../../components/ui/Modal";
import { StarRating } from "../../components/ui/StarRating";
import { session } from "../../lib/api";
import type { Place } from "../../types/domain";
const mapsSearch = (address: string) =>
  address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Rosario, Santa Fe, Argentina`)}`
    : undefined;
const categories = [
  ["location", "📍 Ubicación"],
  ["heating", "🌡️ Calefacción"],
  ["bathrooms", "🚻 Baños"],
  ["exterior", "🌿 Exterior"],
  ["seating", "🪑 Asientos"],
  ["service", "🤝 Atención"],
  ["ambiance", "✨ Ambiente"],
] as const;
export function PlaceForm({
  onClose,
  place,
}: {
  onClose: () => void;
  place?: Place;
}) {
  const username = session.get()?.username;
  const canEditDetails = !place || place.author === username;
  const ownReview = place?.reviews.find((r) => r.author === username);
  const [scores, setScores] = useState<
    Record<(typeof categories)[number][0], number>
  >({
    location: ownReview?.location ?? 4,
    heating: ownReview?.heating ?? 4,
    bathrooms: ownReview?.bathrooms ?? 4,
    exterior: ownReview?.exterior ?? 4,
    seating: ownReview?.seating ?? 4,
    service: ownReview?.service ?? 4,
    ambiance: ownReview?.ambiance ?? 4,
  });
  const [file, setFile] = useState<File>();
  const [categoryId, setCategoryId] = useState(() =>
    place?.category.id ? String(place.category.id) : "",
  );
  const [tagIds, setTagIds] = useState<number[]>(() => place?.tags.map((tag) => tag.id) ?? []);
  const [newTagName, setNewTagName] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("✨");
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    enabled: canEditDetails,
  });
  const qc = useQueryClient();
  const tagsQuery = useQuery({ queryKey: ["highlight-tags"], queryFn: getHighlightTags, enabled: canEditDetails });
  const addTag = useMutation({
    mutationFn: () => saveHighlightTag({ name: newTagName.trim(), emoji: newTagEmoji.trim() }),
    onSuccess: async (tag) => { await qc.invalidateQueries({ queryKey: ["highlight-tags"] }); setTagIds((current) => [...current, tag.id]); setNewTagName(""); setNewTagEmoji("✨"); },
  });
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!place) {
        const address = String(form.get("address")).trim();
        const saved = await savePlace({
          name: String(form.get("name")),
          address: address || undefined,
          sourceUrl: String(form.get("sourceUrl")) || undefined,
          mapsUrl: mapsSearch(address),
          categoryId: Number(form.get("categoryId")),
          tagIds,
        });
        if (file) await uploadPlacePhoto(saved.id, file);
        return saved;
      }
      if (canEditDetails) {
        const address = String(form.get("address")).trim();
        await savePlace(
          {
            name: String(form.get("name")),
            address: address || undefined,
            sourceUrl: String(form.get("sourceUrl")) || undefined,
            mapsUrl: mapsSearch(address),
            categoryId: Number(form.get("categoryId")),
            tagIds,
          },
          place.id,
        );
        if (file) await uploadPlacePhoto(place.id, file);
      }
      await savePlaceReview(place.id, {
        comment: String(form.get("reviewComment")) || undefined,
        ...scores,
      } as PlaceReviewInput);
      return place;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["places"] }),
        qc.invalidateQueries({ queryKey: ["place", place?.id] }),
      ]);
      onClose();
    },
  });
  const photo = file
    ? URL.createObjectURL(file)
    : (place?.thumbnailUrl ?? place?.photoUrl);
  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(new FormData(e.currentTarget));
        }}
      >
        <p className="eyebrow">
          {place
            ? canEditDetails
              ? "EDITAR LUGAR"
              : "CALIFICAR LUGAR"
            : "NUEVO PENDIENTE"}
        </p>
        <h2>{place ? "Tu experiencia en el lugar" : "Guardalo para ir"}</h2>
        {canEditDetails && (
          <>
            <label>
              Nombre
              <input
                name="name"
                defaultValue={place?.name}
                required
                autoFocus
              />
            </label>
            <label>
              Dirección
              <input
                name="address"
                defaultValue={place?.address}
                placeholder="Calle 123, Rosario"
              />
            </label>
            <label>
              URL de referencia
              <input
                name="sourceUrl"
                type="url"
                defaultValue={place?.sourceUrl}
                placeholder="https://instagram.com/reel/..."
              />
            </label>
            <label>
              Tipo
              <select
                name="categoryId"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                <option value="">Elegí una categoría</option>
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Foto del lugar
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </label>
            <fieldset className="tag-picker">
              <legend>¿Por qué se destaca?</legend>
              <p>Elegí todas las etiquetas que correspondan.</p>
              <div className="tag-options">
                {tagsQuery.data?.map((tag) => <label className="tag-option" key={tag.id}><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => setTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])} /><span>{tag.emoji} {tag.name}</span></label>)}
              </div>
              <div className="tag-create-row">
                <input aria-label="Emoji de nueva etiqueta" value={newTagEmoji} onChange={(event) => setNewTagEmoji(event.target.value)} maxLength={8} />
                <input aria-label="Nombre de nueva etiqueta" placeholder="Nueva etiqueta" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} />
                <button type="button" className="secondary-button" disabled={!newTagName.trim() || !newTagEmoji.trim() || addTag.isPending} onClick={() => addTag.mutate()}>Añadir</button>
              </div>
              {addTag.error && <p className="form-error">No pudimos añadir la etiqueta. Probá con otro nombre.</p>}
            </fieldset>
            {photo && (
              <img
                className="form-photo-preview"
                src={photo}
                alt="Vista previa del lugar"
              />
            )}
          </>
        )}
        {place && (
          <>
            <label>
              Reseña del lugar
              <textarea
                name="reviewComment"
                defaultValue={ownReview?.comment}
                placeholder="Contá cómo estuvo el lugar…"
              />
            </label>
            <div className="venue-score-grid">
              {categories.map(([key, label]) => (
                <label className="score-field" key={key}>
                  {label}
                  <StarRating
                    label={label}
                    value={scores[key]}
                    onChange={(value) => setScores({ ...scores, [key]: value })}
                  />
                </label>
              ))}
            </div>
          </>
        )}
        <button className="main-button" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Guardando…"
            : place
              ? "Guardar experiencia"
              : "Agendar pendiente"}{" "}
          ✦
        </button>
        {mutation.error && (
          <p className="form-error">{mutation.error.message}</p>
        )}
      </form>
    </Modal>
  );
}
