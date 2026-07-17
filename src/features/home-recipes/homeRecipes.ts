import { api } from '../../lib/api';
import type { Home, HomeRecipe, HomeRecipeIngredient, MealType } from '../../types/domain';

export type HomeRecipeInput = { home: Home; name: string; recipeUrl?: string; preparedOn: string; mealType: MealType; ingredients: HomeRecipeIngredient[] };
export const getHomeRecipes = (home: Home) => api<HomeRecipe[]>(`/home-recipes?home=${home}`);
export const saveHomeRecipe = (input: HomeRecipeInput, id?: number) => api<HomeRecipe>(`/home-recipes${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const uploadHomeRecipePhoto = (id: number, file: File) => { const data = new FormData(); data.append('file', file); return api<HomeRecipe>(`/home-recipes/${id}/photo`, { method: 'POST', body: data }); };
export const deleteHomeRecipe = (id: number) => api<void>(`/home-recipes/${id}`, { method: 'DELETE' });
