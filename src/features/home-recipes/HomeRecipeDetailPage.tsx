import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { StarRating } from '../../components/ui/StarRating';
import { mediaUrl, session } from '../../lib/api';
import type { HomeRecipe, HomeRecipeReview } from '../../types/domain';
import { HomeRecipeForm } from './HomeRecipeForm';
import { HomeRecipeReviewForm } from './HomeRecipeReviewForm';
import { getHomeRecipe } from './homeRecipes';

const homeName = (home: HomeRecipe['home']) => home === 'TOMAS' ? 'Tomás' : 'Avril';
const mealName = (meal: HomeRecipe['mealType']) => ({ DESAYUNO: 'Desayuno', ALMUERZO: 'Almuerzo', MERIENDA: 'Merienda', CENA: 'Cena' })[meal];
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
const reviewers = ['tomas', 'avril'];

export function HomeRecipeDetailPage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const recipeQuery = useQuery({ queryKey: ['home-recipe', id], queryFn: () => getHomeRecipe(id), enabled: validId });

  if (!validId || recipeQuery.isError || (!recipeQuery.isLoading && !recipeQuery.data)) return <p className="form-error">No pudimos abrir esa receta. Volvé a HowCook e intentá otra vez.</p>;
  if (recipeQuery.isLoading) return <p>Cargando receta…</p>;

  const recipe = recipeQuery.data!;
  const username = session.get()?.username;

  return <section className="home-recipe-detail">
    <Link to="/how-cook">← Volver a HowCook</Link>
    <div className="home-recipe-detail__head">
      <RecipePhoto key={recipe.id} recipe={recipe} />
      <div className="home-recipe-detail__summary"><p className="eyebrow">{recipe.home === 'TOMAS' ? '🏠 CASA TOMÁS' : '🏡 CASA AVRIL'} · {mealName(recipe.mealType).toUpperCase()}</p><h1>{recipe.name}</h1><div className="home-recipe-detail__author"><span>{recipe.author[0]?.toUpperCase()}</span><p><strong>Preparó {recipe.author}</strong><small>{dateLabel(recipe.preparedOn)} · Casa de {homeName(recipe.home)}</small></p></div></div>
      <div className="detail-actions home-recipe-detail__actions"><button className="secondary-button" type="button" onClick={() => setEditing(true)}><span aria-hidden="true">✎</span> Editar receta</button><button className="main-button" type="button" onClick={() => setRepeating(true)}><span aria-hidden="true">↻</span> Repetir receta</button></div>
    </div>
    <section className="home-recipe-detail__content">
      <div className="home-recipe-detail__panel"><p className="eyebrow">INGREDIENTES</p><h2>Para preparar</h2><ul>{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient.name}-${index}`}><strong>{ingredient.grams} g</strong> {ingredient.name}</li>)}</ul></div>
      <div className="home-recipe-detail__panel"><p className="eyebrow">RECETA</p><h2>Cómo se hace</h2>{recipe.recipeUrl ? <a className="main-button recipe-detail-button" href={recipe.recipeUrl} target="_blank" rel="noreferrer">Abrir receta original ↗</a> : <p className="muted">Todavía no guardaron un enlace para esta receta.</p>}</div>
    </section>
    <section className="reviews-section home-recipe-reviews">
      <div className="section-title"><div><p className="eyebrow">RESEÑAS DE LA RECETA</p><h2>Tomás y Avril</h2></div><strong>{recipe.reviews.length}/2</strong></div>
      <div className="home-recipe-review-columns">{reviewers.map(author => <ReviewCard key={author} author={author} currentUser={username} review={recipe.reviews.find(value => value.author === author)} onReview={() => setReviewing(true)} />)}</div>
    </section>
    {editing && <HomeRecipeForm home={recipe.home} recipe={recipe} onClose={() => setEditing(false)} onDeleted={() => navigate('/how-cook')} />}
    {repeating && <HomeRecipeForm home={recipe.home} copyOf={recipe} onClose={() => setRepeating(false)} />}
    {reviewing && <HomeRecipeReviewForm recipe={recipe} onClose={() => setReviewing(false)} />}
  </section>;
}

function RecipePhoto({ recipe }: { recipe: HomeRecipe }) {
  const [imageState, setImageState] = useState<'primary' | 'thumbnail' | 'unavailable'>('primary');
  const primary = recipe.photoUrl ?? recipe.thumbnailUrl;
  const thumbnail = recipe.photoUrl && recipe.thumbnailUrl ? recipe.thumbnailUrl : undefined;
  const image = imageState === 'primary' ? primary : imageState === 'thumbnail' ? thumbnail : undefined;
  const portrait = !!recipe.photoWidth && !!recipe.photoHeight && recipe.photoHeight > recipe.photoWidth;
  return <div className="home-recipe-detail__photo">{image ? <img className={portrait ? 'home-recipe-detail__image home-recipe-detail__image--portrait' : 'home-recipe-detail__image'} src={mediaUrl(image)} alt={`Foto de ${recipe.name}`} onError={() => setImageState(current => current === 'primary' && thumbnail && thumbnail !== primary ? 'thumbnail' : 'unavailable')} /> : <div className="home-recipe-detail__photo-empty"><span>🍳</span><p>Sin foto</p></div>}</div>;
}

function ReviewCard({ author, currentUser, review, onReview }: { author: string; currentUser?: string; review?: HomeRecipeReview; onReview: () => void }) {
  const name = author === 'tomas' ? 'Tomás' : 'Avril';
  const own = author === currentUser;
  return <article className="home-recipe-review"><div><span className="review-avatar">{name[0]}</span><h3>{own ? 'Tu reseña' : `Reseña de ${name}`}</h3>{own && review && <button className="icon-edit" type="button" aria-label={`Editar reseña de ${name}`} onClick={onReview}>✎</button>}</div>{review ? <><StarRating label={`Puntuación de ${name}`} value={review.rating} /><p>{review.comment || 'Sin comentario todavía.'}</p><small>Actualizada {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(review.updatedAt))}</small></> : own ? <button className="secondary-button" type="button" onClick={onReview}>Escribir mi reseña</button> : <p className="muted">{name} todavía no dejó su reseña.</p>}</article>;
}
