import { api } from "../../lib/api";
import type { Item, ItemReview, PlaceVisit, PlaceVisitSummary } from "../../types/domain";
export type ItemReviewInput = {
  comment?: string;
  taste: number;
  price: number;
};
export type CreateItemInput = {
  name: string;
};
export const getVisits = (placeId: number) => api<PlaceVisitSummary[]>(`/places/${placeId}/visits`);
export const getVisit = (visitId: number) => api<PlaceVisit>(`/place-visits/${visitId}`);
export const createVisit = (placeId: number, visitedOn: string) =>
  api<PlaceVisitSummary>(`/places/${placeId}/visits`, {
    method: "POST",
    body: JSON.stringify({ visitedOn }),
  });
export const updateVisit = (visitId: number, visitedOn: string) =>
  api<PlaceVisitSummary>(`/place-visits/${visitId}`, {
    method: "PUT",
    body: JSON.stringify({ visitedOn }),
  });
export const deleteVisit = (visitId: number) => api<void>(`/place-visits/${visitId}`, { method: "DELETE" });
export const createItem = (visitId: number, input: CreateItemInput) =>
  api<Item>(`/place-visits/${visitId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const renameItem = (id: number, name: string) =>
  api<Item>(`/items/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
export const saveItemReview = (id: number, input: ItemReviewInput) =>
  api<ItemReview>(`/items/${id}/reviews/me`, { method: "PUT", body: JSON.stringify(input) });
export const uploadPhoto = (id: number, file: File) => {
  const data = new FormData();
  data.append("file", file);
  return api<Item>(`/items/${id}/photo`, { method: "POST", body: data });
};
export const deleteItem = (id: number) =>
  api<void>(`/items/${id}`, { method: "DELETE" });
