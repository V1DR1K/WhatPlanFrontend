import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { StarRating } from '../../components/ui/StarRating';
import { showNotice } from '../../lib/flash';
import { photoInputAccept, preparePhoto } from '../../lib/photos';
import { session } from '../../lib/api';
import type { FunPlan } from '../../types/domain';
import { getAllFunCategories, saveFunReview, saveFunPlan, uploadFunPhoto } from './whyFun';

const localDateTime = () => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16); };

export function FunVenueForm({ plan, reviewOnly = false, onClose }: { plan?: FunPlan; reviewOnly?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const username = session.get()?.username;
  const ownReview = plan?.reviews.find(review => review.author === username);
  const canEditDetails = !plan || session.get()?.role === "ADMIN" || plan.author === username;
  const [categoryId, setCategoryId] = useState<number | undefined>(plan?.category.id);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(plan?.subcategory.id);
  const [files, setFiles] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string>();
  const [rating, setRating] = useState(ownReview?.rating ?? 4);
  const [comment, setComment] = useState(ownReview?.comment ?? '');
  const categories = useQuery({ queryKey: ['fun-categories', 'all'], queryFn: getAllFunCategories, enabled: !reviewOnly && canEditDetails });
  const roots = (categories.data ?? []).filter(category => !category.parentId && (category.active || category.id === categoryId));
  const subcategories = (categories.data ?? []).filter(category => category.parentId === categoryId && (category.active || category.id === subcategoryId));
  const mutation = useMutation({
    mutationFn: async (details: { name: string; address: string; scheduledAt: string }) => {
      if (reviewOnly) {
        if (!plan) throw new Error('No encontramos la salida para reseñar');
        return { review: true, plan: await saveFunReview(plan.id, { rating, comment: comment.trim() || undefined }) };
      }
      if (!canEditDetails || !categoryId || !subcategoryId) throw new Error('Elegí una categoría y una subcategoría');
      if ((plan?.photos.length ?? 0) + files.length > 12) throw new Error('Cada plan admite hasta 12 fotos');
      const input = { name: details.name.trim(), address: details.address.trim(), scheduledAt: details.scheduledAt, categoryId, subcategoryId };
      if (!input.name || !input.address || !input.scheduledAt) throw new Error('Completá el nombre, la dirección y la fecha de la salida');
      const saved = await saveFunPlan(input, plan?.id);
      try {
        for (const file of files) await uploadFunPhoto(saved.id, file);
        return { plan: saved };
      } catch (error) {
        return { plan: saved, photoError: error instanceof Error ? error.message : 'No pudimos subir todas las fotos' };
      }
    },
    onSuccess: async result => { await Promise.all([qc.invalidateQueries({ queryKey: ['fun-plans'] }), ...(plan ? [qc.invalidateQueries({ queryKey: ['fun-plan', plan.id] })] : [])]); showNotice('review' in result ? 'Guardamos tu opinión de esta salida.' : result.photoError ? `Guardamos la salida, pero algunas fotos no se subieron: ${result.photoError}` : plan ? 'Actualizamos la salida.' : 'Salida agendada.', 'photoError' in result && result.photoError ? 'error' : 'success'); onClose(); },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ name: String(form.get('name') ?? ''), address: String(form.get('address') ?? ''), scheduledAt: String(form.get('scheduledAt') ?? '') }); };

  if (reviewOnly) return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form className="fun-review-form" onSubmit={submit}><p className="eyebrow">TU OPINIÓN</p><h2>{ownReview ? 'Actualizá tu experiencia' : '¿Cómo la pasaron?'}</h2><label>Tu puntuación<StarRating label="Puntuación de la salida" value={rating} onChange={setRating} /></label><label>Reseña <small className="tiny">Opcional</small><textarea value={comment} maxLength={1000} onChange={event => setComment(event.target.value)} placeholder="Contá qué hicieron y qué les gustó…" /></label><button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar opinión'} ✦</button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form className="fun-venue-form" onSubmit={submit}><p className="eyebrow">{plan ? 'EDITAR SALIDA' : 'NUEVA SALIDA'}</p><h2>{plan ? 'Ajustemos el plan' : '¿Qué quieren hacer?'}</h2><label>Plan<input name="name" defaultValue={plan?.name} placeholder="Ej. Bowling del centro" required autoFocus /></label><label>Dirección<input name="address" defaultValue={plan?.address} placeholder="Calle 123, Rosario" required /></label><label>¿Cuándo?<input name="scheduledAt" type="datetime-local" defaultValue={plan?.scheduledAt?.slice(0, 16) ?? localDateTime()} required /></label><fieldset className="tag-picker fun-category-picker"><legend>Categoría</legend><p>Elegí el tipo de salida.</p>{categories.isError && <p className="form-error">No pudimos cargar categorías. Reintentá antes de guardar.</p>}<div className="tag-options">{roots.map(category => <label className="tag-option" key={category.id}><input type="radio" name="fun-category" checked={categoryId === category.id} onChange={() => { if (categoryId !== category.id) { setCategoryId(category.id); setSubcategoryId(undefined); } }} /><span>{category.icon} {category.name}</span></label>)}</div></fieldset><fieldset className="tag-picker fun-category-picker" disabled={!categoryId}><legend>Subcategoría</legend><p>{categoryId ? 'Elegí una opción para la salida.' : 'Primero elegí una categoría.'}</p><div className="tag-options">{subcategories.map(category => <label className="tag-option" key={category.id}><input type="radio" name="fun-subcategory" checked={subcategoryId === category.id} onChange={() => setSubcategoryId(category.id)} /><span>{category.icon} {category.name}</span></label>)}</div></fieldset><label>Fotos <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB cada una · máximo 12</small><input type="file" accept={photoInputAccept} multiple onChange={async event => { const selected = [...(event.target.files ?? [])]; setPhotoError(undefined); try { setFiles(await Promise.all(selected.map(preparePhoto))); } catch (error) { setFiles([]); setPhotoError(error instanceof Error ? error.message : 'No pudimos preparar las fotos'); event.currentTarget.value = ''; } }} /></label>{photoError && <p className="form-error">{photoError}</p>}{files.length > 0 && <p className="tiny">Se cargarán {files.length} foto{files.length === 1 ? '' : 's'} al guardar.</p>}<button className="main-button" disabled={mutation.isPending || Boolean(photoError) || categories.isError}>{mutation.isPending ? 'Guardando…' : plan ? 'Guardar salida' : 'Agendar salida'} ✦</button>{mutation.error && <p className="form-error">{mutation.error.message}</p>}</form></Modal>;
}
