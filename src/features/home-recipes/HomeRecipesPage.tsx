import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPhotoOrientation, photoAspectRatioStyle, ResponsiveImage } from '../../components/ui/AdaptivePhoto';
import type { Home, HomeRecipe } from '../../types/domain';
import { HomeRecipeForm } from './HomeRecipeForm';
import { getHomeRecipes } from './homeRecipes';

const homeName = (home: Home) => home === 'TOMAS' ? 'Tomás' : 'Avril';
const mealName = (meal: HomeRecipe['mealType']) => ({ DESAYUNO: 'Desayuno', ALMUERZO: 'Almuerzo', MERIENDA: 'Merienda', CENA: 'Cena' })[meal];
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;
const ingredientLabel = (ingredient: HomeRecipe['ingredients'][number]) => `${ingredient.quantity === undefined ? '' : `${ingredient.quantity} `}${ingredient.unit} · ${ingredient.name}`;

function RecipeSection({ home, search, onAdd }: { home: Home; search: string; onAdd: (home: Home) => void }) {
  const recipes = useQuery({ queryKey: ['home-recipes', home, search], queryFn: () => getHomeRecipes(home, search) });
  const list = recipes.data ?? [];
  const [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => setVisibleCount(12), [search]);
  const visible = list.slice(0, visibleCount);
  return <section className="home-recipe-section">
    <div className="section-title"><div><p className="eyebrow">{home === 'TOMAS' ? '🏠 CASA TOMÁS' : '🏡 CASA AVRIL'}</p><h2>En casa de {homeName(home)}</h2></div><strong>{visible.length} de {list.length} receta{list.length === 1 ? '' : 's'}</strong></div>
    <button className="add-cook-button home-recipe-add" onClick={() => onAdd(home)}><span className="add-cook-icon">＋</span><span><small>RECETA CASERA</small>Anotar</span><b>🍳</b></button>
    {recipes.isError && <p className="form-error">{recipes.error.message}</p>}
    {recipes.isLoading ? <p className="muted" aria-busy="true">Cargando recetas…</p> : <div className="home-recipe-grid">{visible.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>}
    {!recipes.isLoading && !list.length && <p className="empty-state">{search ? 'No hay recetas que coincidan con esta búsqueda.' : 'Todavía no anotaron recetas en esta casa.'}</p>}
    {visible.length < list.length && <button className="secondary-button load-more" type="button" onClick={() => setVisibleCount(current => current + 12)}>Ver más recetas</button>}
  </section>;
}

function RecipeCard({ recipe }: { recipe: HomeRecipe }) {
  const hasImage = recipe.photoUrl ?? recipe.thumbnailUrl;
  const rating = average(recipe.reviews.map(review => review.rating));
  const orientation = getPhotoOrientation(recipe.photoWidth, recipe.photoHeight);
  return <Link className={`home-recipe-card-link media-card media-card--${orientation}`} style={photoAspectRatioStyle(recipe.photoWidth, recipe.photoHeight)} to={`/how-cook/${recipe.id}`} aria-label={`Ver detalle de ${recipe.name}`}>
    <article className="home-recipe-card">
      {hasImage ? <ResponsiveImage alt={`Foto de ${recipe.name}`} className="home-recipe-card__image" fullSrc={recipe.photoUrl} height={recipe.photoHeight} thumbnailSrc={recipe.thumbnailUrl} width={recipe.photoWidth} /> : <div className="home-recipe-card__empty">🍳</div>}
      <div className="home-recipe-card__body">
        <div className="home-recipe-card__heading"><div><p>{mealName(recipe.mealType)} · {dateLabel(recipe.preparedOn)}</p><h3>{recipe.name}</h3></div>{rating !== undefined && <span className="home-recipe-card__rating">{rating.toFixed(1)} ★</span>}</div>
        <div className="ingredient-pills">{recipe.ingredients.slice(0, 4).map((ingredient, index) => <span key={`${ingredient.name}-${index}`}>{ingredientLabel(ingredient)}</span>)}</div>
        <footer className="recipe-card-actions"><small>{recipe.repeatedFrom ? `↻ Repite ${recipe.repeatedFrom.name}` : `Preparó ${recipe.author}`} · {recipe.servings} porciones</small><span>{recipe.reviews.length ? `💬 ${recipe.reviews.length} reseña${recipe.reviews.length === 1 ? '' : 's'}` : 'Ver detalle'} →</span></footer>
      </div>
    </article>
  </Link>;
}

export function HomeRecipesPage() {
  const [formHome, setFormHome] = useState<Home>();
  const [search, setSearch] = useState('');
  return <section className="home-recipes">
    <Link to="/">← Volver a WhatPlan</Link>
    <section className="home-recipes__hero"><div><p className="eyebrow">HOWCOOK · RECETAS CON CARIÑO</p><h1>¿Qué vamos a <em>cocinar</em> hoy?</h1><p>Las comidas de todos los días, guardadas para repetir las que valieron la pena.</p></div><span>🏠</span></section>
    <label className="home-recipe-search">Buscar receta<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Ej. risotto, pasta, arroz…" /></label>
    <RecipeSection home="TOMAS" search={search} onAdd={setFormHome} />
    <RecipeSection home="AVRIL" search={search} onAdd={setFormHome} />
    {formHome && <HomeRecipeForm home={formHome} onClose={() => setFormHome(undefined)} />}
  </section>;
}
