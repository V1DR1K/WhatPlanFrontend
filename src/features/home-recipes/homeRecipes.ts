import { api } from '../../lib/api';
import type { Home, HomeRecipe, HomeRecipeIngredient, HomeRecipeReview, HomeRecipeStep, MealType } from '../../types/domain';

export type HomeRecipeInput = { home: Home; name: string; servings: number; recipeUrl?: string; preparedOn: string; mealType: MealType; ingredients: HomeRecipeIngredient[]; steps: HomeRecipeStep[]; repeatedFromId?: number };
export const getHomeRecipes = (home: Home, search?: string) => api<HomeRecipe[]>(`/how-cook?${new URLSearchParams({ home, ...(search ? { search } : {}) })}`);
export const getHomeRecipe = (id: number) => api<HomeRecipe>(`/how-cook/${id}`);
export const saveHomeRecipe = (input: HomeRecipeInput, id?: number) => api<HomeRecipe>(`/how-cook${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const uploadHomeRecipePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<HomeRecipe>(`/how-cook/${id}/photo`, { method: 'POST', body: data }); };
export const deleteHomeRecipe = (id: number) => api<void>(`/how-cook/${id}`, { method: 'DELETE' });
export const saveHomeRecipeReview = (id: number, input: Pick<HomeRecipeReview, 'rating' | 'comment'>) => api<HomeRecipeReview>(`/how-cook/${id}/reviews/me`, { method: 'PUT', body: JSON.stringify(input) });
export const updateHomeRecipeReview = (recipeId: number, reviewId: number, input: Pick<HomeRecipeReview, 'rating' | 'comment'>) => api<HomeRecipeReview>(`/how-cook/${recipeId}/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) });
