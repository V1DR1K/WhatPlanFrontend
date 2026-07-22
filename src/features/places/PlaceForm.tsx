import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "../categories/categories";
import { getHighlightTags, saveHighlightTag } from "./highlightTags";
import { savePlace, savePlaceReview, uploadPlacePhoto, type PlaceReviewInput } from "./places";
import { Modal } from "../../components/ui/Modal";
import { ReviewPrompt } from "../../components/ui/ReviewPrompt";
import { StarRating } from "../../components/ui/StarRating";
import { showNotice } from "../../lib/flash";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import { session } from "../../lib/api";
import type { Place } from "../../types/domain";

const mapsSearch = (address: string) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined;
const scoreCategories = [
  ["location", "📍 Ubicación"], ["heating", "🌡️ Calefacción"], ["bathrooms", "🚻 Baños"], ["exterior", "🌿 Exterior"], ["seating", "🪑 Asientos"], ["service", "🤝 Atención"], ["ambiance", "✨ Ambiente"],
] as const;
type ScoreKey = (typeof scoreCategories)[number][0];
type Scores = Record<ScoreKey, number | undefined>;

export function PlaceForm({ onClose, place, mode = "details" }: { onClose: () => void; place?: Place; mode?: "details" | "review" }) {
  const username = session.get()?.username;
  const canEditDetails = !place || place.author === username;
  const reviewing = Boolean(place && mode === "review");
  const ownReview = place?.reviews.find(review => review.author === username);
  const [scores, setScores] = useState<Scores>({
    location: ownReview?.location, heating: ownReview?.heating, bathrooms: ownReview?.bathrooms, exterior: ownReview?.exterior, seating: ownReview?.seating, service: ownReview?.service, ambiance: ownReview?.ambiance,
  });
  const [file, setFile] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
  const [created, setCreated] = useState<Place>();
  const [categoryId, setCategoryId] = useState(() => place?.category.id ? String(place.category.id) : "");
  const [tagIds, setTagIds] = useState<number[]>(() => place?.tags.map(tag => tag.id) ?? []);
  const [newTagName, setNewTagName] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("✨");
  const qc = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories, enabled: canEditDetails && !reviewing });
  const tagsQuery = useQuery({ queryKey: ["highlight-tags"], queryFn: getHighlightTags, enabled: canEditDetails && !reviewing });
  const addTag = useMutation({
    mutationFn: () => saveHighlightTag({ name: newTagName.trim(), emoji: newTagEmoji.trim() }),
    onSuccess: async tag => { await qc.invalidateQueries({ queryKey: ["highlight-tags"] }); setTagIds(current => [...current, tag.id]); setNewTagName(""); setNewTagEmoji("✨"); },
  });
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (reviewing && place) {
        await savePlaceReview(place.id, { comment: String(form.get("reviewComment")) || undefined, ...scores } as PlaceReviewInput);
        return { place, review: true };
      }
      const address = String(form.get("address")).trim();
      const input = { name: String(form.get("name")).trim(), address: address || undefined, sourceUrl: String(form.get("sourceUrl")) || undefined, mapsUrl: mapsSearch(address), categoryId: Number(form.get("categoryId")), tagIds };
      const saved = await savePlace(input, place?.id);
      try {
        return { place: file ? await uploadPlacePhoto(saved.id, file) : saved };
      } catch (error) {
        return { place: saved, photoError: error instanceof Error ? error.message : "No pudimos subir la foto" };
      }
    },
    onSuccess: async result => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["places"] }), qc.invalidateQueries({ queryKey: ["place", place?.id ?? result.place.id] })]);
      if (!place) {
        setCreated(result.place);
        if (result.photoError) showNotice(`Guardamos el lugar, pero la foto no se subió: ${result.photoError}`, "error");
        return;
      }
      showNotice(result.photoError ? `Guardamos los cambios, pero la foto no se subió: ${result.photoError}` : reviewing ? "Guardamos tu reseña del lugar." : "Actualizamos el lugar.", result.photoError ? "error" : "success");
      onClose();
    },
  });
  if (created) return <ReviewPrompt name={created.name} reviewTo={`/food/places/${created.id}`} onClose={onClose} actionLabel="Registrar una visita" message="El lugar ya está guardado. Cuando vayan, registren la visita y después agreguen los ítems." />;

  const pending = mutation.isPending;
  return <Modal onClose={onClose} confirmDiscard pending={pending}><form onSubmit={event => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><p className="eyebrow">{reviewing ? "CALIFICAR LUGAR" : place ? "EDITAR LUGAR" : "NUEVO PENDIENTE"}</p><h2>{reviewing ? "Tu experiencia en el lugar" : place ? "Ajustemos los datos" : "Guardalo para ir"}</h2>{!reviewing && <>
    <label>Nombre<input name="name" defaultValue={place?.name} required autoFocus /></label>
    <label>Dirección <small className="tiny">Opcional</small><input name="address" defaultValue={place?.address} placeholder="Calle 123, Rosario" /></label>
    <label>URL de referencia <small className="tiny">Opcional</small><input name="sourceUrl" type="url" defaultValue={place?.sourceUrl} placeholder="https://instagram.com/reel/..." /></label>
    <label>Tipo<select name="categoryId" value={categoryId} onChange={event => setCategoryId(event.target.value)} required><option value="">Elegí una categoría</option>{categoriesQuery.data?.map(category => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</select></label>
    <label>Foto del lugar <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small><input type="file" accept={photoInputAccept} onChange={async event => { const selected = event.target.files?.[0]; setPhotoError(undefined); if (!selected) return setFile(undefined); try { setFile(await preparePhoto(selected)); } catch (error) { setFile(undefined); setPhotoError(error instanceof Error ? error.message : "No pudimos preparar la foto"); event.currentTarget.value = ""; } }} /></label>
    {photoError && <p className="form-error">{photoError}</p>}
    {place?.photoUrl && !file && <small className="tiny">La foto actual se conservará si no elegís otra.</small>}
    <fieldset className="tag-picker"><legend>¿Por qué se destaca?</legend><p>Elegí todas las etiquetas que correspondan.</p><div className="tag-options">{tagsQuery.data?.map(tag => <label className="tag-option" key={tag.id}><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => setTagIds(current => current.includes(tag.id) ? current.filter(id => id !== tag.id) : [...current, tag.id])} /><span>{tag.emoji} {tag.name}</span></label>)}</div><div className="tag-create-row"><input aria-label="Emoji de nueva etiqueta" value={newTagEmoji} onChange={event => setNewTagEmoji(event.target.value)} maxLength={8} /><input aria-label="Nombre de nueva etiqueta" placeholder="Nueva etiqueta" value={newTagName} onChange={event => setNewTagName(event.target.value)} /><button type="button" className="secondary-button" disabled={!newTagName.trim() || !newTagEmoji.trim() || addTag.isPending} onClick={() => addTag.mutate()}>Añadir</button></div>{addTag.error && <p className="form-error">No pudimos añadir la etiqueta. Probá con otro nombre.</p>}</fieldset>
  </>}{reviewing && <>
    <label>Reseña del lugar<textarea name="reviewComment" defaultValue={ownReview?.comment} placeholder="Contá cómo estuvo el lugar…" /></label>
    <p className="tiny">Calificá sólo lo que aplique a este lugar. Podés dejar los demás aspectos sin puntuar.</p>
    <div className="venue-score-grid">{scoreCategories.map(([key, label]) => <label className="score-field" key={key}>{label}<span className="place-score-input"><StarRating label={label} value={scores[key]} onChange={value => setScores(current => ({ ...current, [key]: value }))} /><button className="text-button" type="button" onClick={() => setScores(current => ({ ...current, [key]: undefined }))} disabled={scores[key] === undefined}>No aplica</button></span></label>)}</div>
  </>}
  <button className="main-button" disabled={pending || Boolean(photoError)}>{mutation.isPending ? "Guardando…" : reviewing ? "Guardar reseña" : place ? "Guardar lugar" : "Agendar pendiente"} ✦</button>
  {mutation.error && <p className="form-error">{mutation.error.message}</p>}
  </form></Modal>;
}
