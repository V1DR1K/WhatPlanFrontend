import { api } from '../../lib/api';
import type { Cooking, CookingReview, Home, MealType, Recipe, RecipeIngredient, RecipeStep, Slice } from '../../types/domain';

export type RecipeInput = { name: string; sourceUrl?: string; ingredients: RecipeIngredient[]; steps: RecipeStep[] };
export type CookingInput = { home: Home; servings: number; cookedOn: string; mealType: MealType };
export const getRecipes = (filters: { search?: string; home?: Home; cooked?: boolean; sort?: string; cursor?: number; size?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.home) query.set('home', filters.home);
  if (filters.cooked !== undefined) query.set('cooked', String(filters.cooked));
  if (filters.sort) query.set('sort', filters.sort);
  if (filters.cursor !== undefined) query.set('cursor', String(filters.cursor));
  if (filters.size !== undefined) query.set('size', String(filters.size));
  return api<Slice<Recipe>>(`/how-cook/recipes${query.size ? `?${query}` : ''}`);
};
export const getRecipe = (id: number) => api<Recipe>(`/how-cook/recipes/${id}`);
export const saveRecipe = (input: RecipeInput, id?: number) => api<Recipe>(`/how-cook/recipes${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const deleteRecipe = (id: number) => api<void>(`/how-cook/recipes/${id}`, { method: 'DELETE' });
export const uploadRecipePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<Recipe>(`/how-cook/recipes/${id}/photo`, { method: 'POST', body: data }); };
export const getCookings = (filters: { home?: Home; recipeId?: number } = {}) => { const query = new URLSearchParams(); if (filters.home) query.set('home', filters.home); if (filters.recipeId) query.set('recipeId', String(filters.recipeId)); return api<Cooking[]>(`/how-cook/cookings${query.size ? `?${query}` : ''}`); };
export const getCooking = (id: number) => api<Cooking>(`/how-cook/cookings/${id}`);
export const createCooking = (recipeId: number, input: CookingInput) => api<Cooking>(`/how-cook/recipes/${recipeId}/cookings`, { method: 'POST', body: JSON.stringify(input) });
export const updateCooking = (id: number, input: CookingInput) => api<Cooking>(`/how-cook/cookings/${id}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteCooking = (id: number) => api<void>(`/how-cook/cookings/${id}`, { method: 'DELETE' });
export const createCookingReview = (cookingId: number, input: Pick<CookingReview, 'rating' | 'complexity' | 'comment'>) => api<CookingReview>(`/how-cook/cookings/${cookingId}/reviews`, { method: 'POST', body: JSON.stringify(input) });
export const updateCookingReview = (reviewId: number, input: Pick<CookingReview, 'rating' | 'complexity' | 'comment'>) => api<CookingReview>(`/how-cook/cooking-reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteCookingReview = (reviewId: number) => api<void>(`/how-cook/cooking-reviews/${reviewId}`, { method: 'DELETE' });
