import { api } from "../../lib/api";
import type { CatalogSort } from "../../lib/catalogSort";
import type {
  Place,
  PlaceReview,
  PlaceStatus,
  Slice,
} from "../../types/domain";
export type PlaceInput = {
  name: string;
  address?: string;
  sourceUrl?: string;
  mapsUrl?: string;
  acceptsReservations: boolean;
  categoryId: number;
  tagIds: number[];
};
export type PlaceReviewInput = Omit<PlaceReview, "author">;
export const getPlaces = (
  categoryId?: number,
  cursor?: number,
  status?: PlaceStatus,
  highlightTagId?: number,
  search?: string,
  sort?: CatalogSort,
) => {
  const query = new URLSearchParams({ size: "12" });
  if (categoryId) query.set("categoryId", String(categoryId));
  if (cursor !== undefined) query.set("cursor", String(cursor));
  if (status) query.set("status", status);
  if (highlightTagId) query.set("highlightTagId", String(highlightTagId));
  if (search) query.set("search", search);
  if (sort) query.set("sort", sort);
  return api<Slice<Place>>(`/places?${query}`);
};
export const getPlace = (id: number) => api<Place>(`/places/${id}`);
export const savePlace = (input: PlaceInput, id?: number) =>
  api<Place>(`/places${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input),
  });
export const savePlaceReview = (id: number, input: PlaceReviewInput) =>
  api<PlaceReview>(`/places/${id}/review`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
export const uploadPlacePhoto = (id: number, file: File) => {
  const data = new FormData();
  data.append("file", file);
  return api<Place>(`/places/${id}/photo`, { method: "POST", body: data });
};
export const deletePlace = (id: number) =>
  api<void>(`/places/${id}`, { method: "DELETE" });
export const getArchivedPlaces = () => api<Place[]>("/places/archived");
export const restorePlace = (id: number) => api<Place>(`/places/${id}/restore`, { method: "POST" });
