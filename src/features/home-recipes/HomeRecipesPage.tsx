import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { mediaUrl, session } from '../../lib/api';
import type { Home, HomeRecipe } from '../../types/domain';
import { HomeRecipeForm } from './HomeRecipeForm';
import { getHomeRecipes } from './homeRecipes';

const homeName = (home: Home) => home === 'TOMAS' ? 'Tomás' : 'Avril';
const mealName = (meal: HomeRecipe['mealType']) => ({ DESAYUNO: 'Desayuno', ALMUERZO: 'Almuerzo', MERIENDA: 'Merienda', CENA: 'Cena' })[meal];
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));

function RecipeSection({ home, onAdd, onEdit, onRepeat }: { home: Home; onAdd: (home: Home) => void; onEdit: (recipe: HomeRecipe) => void; onRepeat: (recipe: HomeRecipe) => void }) {
 const recipes = useQuery({ queryKey: ['home-recipes', home], queryFn: () => getHomeRecipes(home) });
 const list = recipes.data ?? [];
 return <section className="home-recipe-section"><div className="section-title"><div><p className="eyebrow">{home === 'TOMAS' ? '🏠 CASA TOMÁS' : '🏡 CASA AVRIL'}</p><h2>En casa de {homeName(home)}</h2></div></div><button className="module-add-button module-add-button--cook home-recipe-add" onClick={() => onAdd(home)}><span className="module-add-icon">＋</span><span><small>RECETA CASERA</small>Anotar</span><b>🍳</b></button>{recipes.isError && <p className="form-error">{recipes.error.message}</p>}<div className="home-recipe-grid">{list.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onEdit={onEdit} onRepeat={onRepeat} />)}</div>{!recipes.isLoading && !list.length && <p className="empty-state">Todavía no anotaron recetas en esta casa.</p>}</section>;
}

function RecipeCard({ recipe, onEdit, onRepeat }: { recipe: HomeRecipe; onEdit: (recipe: HomeRecipe) => void; onRepeat: (recipe: HomeRecipe) => void }) {
 const own = recipe.author === session.get()?.username;
 const image = recipe.photoUrl ?? recipe.thumbnailUrl;
 return <article className="home-recipe-card">{image ? <img src={mediaUrl(image)} alt={`Foto de ${recipe.name}`} /> : <div className="home-recipe-card__empty">🍳</div>}<div className="home-recipe-card__body"><div className="home-recipe-card__heading"><div><p>{mealName(recipe.mealType)} · {dateLabel(recipe.preparedOn)}</p><h3>{recipe.name}</h3></div>{own && <button className="icon-edit" type="button" onClick={() => onEdit(recipe)} aria-label={`Editar ${recipe.name}`}>✎</button>}</div><div className="ingredient-pills">{recipe.ingredients.map((ingredient, index) => <span key={`${ingredient.name}-${index}`}>{ingredient.grams} g · {ingredient.name}</span>)}</div>{recipe.recipeUrl && <a className="recipe-link" href={recipe.recipeUrl} target="_blank" rel="noreferrer">↗ Ver receta</a>}<div className="recipe-card-actions"><small>Preparó {recipe.author}</small><button className="text-button" type="button" onClick={() => onRepeat(recipe)}>↻ Repetir</button></div></div></article>;
}

export function HomeRecipesPage() {
 const [formHome, setFormHome] = useState<Home>();
 const [editing, setEditing] = useState<HomeRecipe>();
 const [repeating, setRepeating] = useState<HomeRecipe>();
 return <section className="home-recipes"><Link to="/">← Volver a WhatPlan</Link><section className="home-recipes__hero"><div><p className="eyebrow">HOWCOOK · RECETAS CON CARIÑO</p><h1>¿Qué salió de<br/><em>la cocina</em>?</h1><p>Las comidas de todos los días, guardadas para repetir las que valieron la pena.</p></div><span>🏠</span></section><RecipeSection home="TOMAS" onAdd={setFormHome} onEdit={setEditing} onRepeat={setRepeating} /><RecipeSection home="AVRIL" onAdd={setFormHome} onEdit={setEditing} onRepeat={setRepeating} />{formHome && <HomeRecipeForm home={formHome} onClose={() => setFormHome(undefined)} />}{editing && <HomeRecipeForm home={editing.home} recipe={editing} onClose={() => setEditing(undefined)} />}{repeating && <HomeRecipeForm home={repeating.home} copyOf={repeating} onClose={() => setRepeating(undefined)} />}</section>;
}
