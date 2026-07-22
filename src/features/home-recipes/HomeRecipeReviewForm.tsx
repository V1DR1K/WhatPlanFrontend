import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { StarRating } from '../../components/ui/StarRating';
import { session } from '../../lib/api';
import type { HomeRecipe, HomeRecipeReview } from '../../types/domain';
import { saveHomeRecipeReview, updateHomeRecipeReview } from './homeRecipes';
import { showNotice } from '../../lib/flash';

export function HomeRecipeReviewForm({ recipe, review, onClose }: { recipe: HomeRecipe; review?: HomeRecipeReview; onClose: () => void }) {
  const qc = useQueryClient();
  const ownReview = recipe.reviews.find(value => value.author === session.get()?.username);
  const editingReview = review ?? ownReview;
  const [rating, setRating] = useState(editingReview?.rating ?? 4);
  const [comment, setComment] = useState(editingReview?.comment ?? '');
  const mutation = useMutation({
    mutationFn: () => editingReview ? updateHomeRecipeReview(recipe.id, editingReview.id, { rating, comment: comment.trim() || undefined }) : saveHomeRecipeReview(recipe.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['home-recipe', recipe.id] }), qc.invalidateQueries({ queryKey: ['home-recipes', recipe.home] })]);
      showNotice(editingReview ? 'Actualizamos la reseña.' : 'Guardamos tu reseña.');
      onClose();
    },
  });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form className="home-recipe-review-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
    <p className="eyebrow">TU RESEÑA</p>
    <h2>{recipe.name}</h2>
    <label>¿Qué tan rica estuvo?<StarRating label="Puntuación de la receta" value={rating} onChange={setRating} /></label>
    <label>Reseña <small className="tiny">Opcional</small><textarea value={comment} maxLength={1000} onChange={event => setComment(event.target.value)} placeholder="Contá qué te gustó o qué cambiarías…" /></label>
    <button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : editingReview ? 'Guardar cambios' : 'Guardar reseña'} ✦</button>
    {mutation.error && <p className="form-error">{mutation.error.message}</p>}
  </form></Modal>;
}
