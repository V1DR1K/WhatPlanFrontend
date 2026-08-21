import { api } from "../../lib/api";
import type { PlaceVisit, PlaceVisitReview, PlaceVisitSummary } from "../../types/domain";
export type PlaceVisitReviewInput = Omit<PlaceVisitReview, "id" | "author" | "updatedBy" | "createdAt" | "updatedAt">;
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
export const uploadVisitPhoto = (id: number, file: File) => {
  const data = new FormData();
  data.append("file", file);
  return api<PlaceVisit>(`/place-visits/${id}/photos`, { method: "POST", body: data });
};
export const setVisitCover = (visitId: number, photoId: number) => api<PlaceVisit>(`/place-visits/${visitId}/cover/${photoId}`, { method: "PUT" });
export const deleteVisitPhoto = (photoId: number) => api<void>(`/place-visit-photos/${photoId}`, { method: "DELETE" });
export const createVisitReview = (visitId: number, input: PlaceVisitReviewInput) => api<PlaceVisitReview>(`/place-visits/${visitId}/reviews`, { method: "POST", body: JSON.stringify(input) });
export const updateVisitReview = (reviewId: number, input: PlaceVisitReviewInput) => api<PlaceVisitReview>(`/place-visit-reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(input) });
export const deleteVisitReview = (reviewId: number) => api<void>(`/place-visit-reviews/${reviewId}`, { method: "DELETE" });
