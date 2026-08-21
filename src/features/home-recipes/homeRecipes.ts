import { api } from '../../lib/api';
import type { Home, HomeRecipe, HomeRecipeIngredient, MealType } from '../../types/domain';

export type HomeRecipeInput = { home: Home; name: string; recipeUrl?: string; preparedOn: string; mealType: MealType; ingredients: HomeRecipeIngredient[] };
type CookingPayload = { id: number; recipe: { id: number; name: string; sourceUrl?: string; photoUrl?: string; thumbnailUrl?: string; ingredients: { name: string; quantity: number; unit: string }[] }; home: Home; cookedOn: string; mealType: MealType; createdBy: string; createdAt: string };
export const getHomeRecipes = (home: Home) => api<CookingPayload[]>(`/how-cook/cookings?home=${home}`).then(cookings => cookings.map(cooking => ({
  id: cooking.id,
  recipeId: cooking.recipe.id,
  cookingId: cooking.id,
  home: cooking.home,
  name: cooking.recipe.name,
  recipeUrl: cooking.recipe.sourceUrl,
  preparedOn: cooking.cookedOn,
  mealType: cooking.mealType,
  ingredients: cooking.recipe.ingredients.map(ingredient => ({ name: ingredient.name, grams: Number(ingredient.quantity), unit: ingredient.unit })),
  author: cooking.createdBy,
  photoUrl: cooking.recipe.photoUrl,
  thumbnailUrl: cooking.recipe.thumbnailUrl,
  createdAt: cooking.createdAt,
})) as HomeRecipe[]);
export const saveHomeRecipe = async (input: HomeRecipeInput, existing?: { recipeId: number; cookingId?: number }) => {
  const recipeRequest = { name: input.name, sourceUrl: input.recipeUrl, ingredients: input.ingredients.map(ingredient => ({ name: ingredient.name, quantity: ingredient.grams, unit: ingredient.unit ?? 'g' })), steps: [] };
  const recipe = existing?.recipeId ? await api<{ id: number }>(`/how-cook/recipes/${existing.recipeId}`, { method: 'PUT', body: JSON.stringify(recipeRequest) }) : await api<{ id: number }>('/how-cook/recipes', { method: 'POST', body: JSON.stringify(recipeRequest) });
  const cookingRequest = { home: input.home, servings: 1, cookedOn: input.preparedOn, mealType: input.mealType };
  if (existing?.cookingId) await api(`/how-cook/cookings/${existing.cookingId}`, { method: 'PUT', body: JSON.stringify(cookingRequest) });
  else await api(`/how-cook/recipes/${recipe.id}/cookings`, { method: 'POST', body: JSON.stringify(cookingRequest) });
  return recipe;
};
export const uploadHomeRecipePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api(`/how-cook/recipes/${id}/photo`, { method: 'POST', body: data }); };
export const deleteHomeRecipe = (id: number) => api<void>(`/how-cook/cookings/${id}`, { method: 'DELETE' });
