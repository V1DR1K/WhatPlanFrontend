import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { StarRating } from '../../components/ui/StarRating';
import { session } from '../../lib/api';
import type { HomeRecipe } from '../../types/domain';
import { saveHomeRecipeReview } from './homeRecipes';
import { showNotice } from '../../lib/flash';

export function HomeRecipeReviewForm({ recipe, onClose }: { recipe: HomeRecipe; onClose: () => void }) {
  const qc = useQueryClient();
  const ownReview = recipe.reviews.find(review => review.author === session.get()?.username);
  const [rating, setRating] = useState(ownReview?.rating ?? 4);
  const [comment, setComment] = useState(ownReview?.comment ?? '');
  const mutation = useMutation({
    mutationFn: () => saveHomeRecipeReview(recipe.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['home-recipe', recipe.id] }), qc.invalidateQueries({ queryKey: ['home-recipes', recipe.home] })]);
      showNotice(ownReview ? 'Actualizamos tu reseña.' : 'Guardamos tu reseña.');
      onClose();
    },
  });

  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}><form className="home-recipe-review-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
    <p className="eyebrow">TU RESEÑA</p>
    <h2>{recipe.name}</h2>
    <label>¿Qué tan rica estuvo?<StarRating label="Puntuación de la receta" value={rating} onChange={setRating} /></label>
    <label>Reseña <small className="tiny">Opcional</small><textarea value={comment} maxLength={1000} onChange={event => setComment(event.target.value)} placeholder="Contá qué te gustó o qué cambiarías…" /></label>
    <button className="main-button" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : ownReview ? 'Guardar cambios' : 'Guardar reseña'} ✦</button>
    {mutation.error && <p className="form-error">{mutation.error.message}</p>}
  </form></Modal>;
}
