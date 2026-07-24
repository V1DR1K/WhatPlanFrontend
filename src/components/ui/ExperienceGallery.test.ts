import { describe, expect, it } from "vitest";
import { experiencePhotoSlots, MAX_EXPERIENCE_PHOTOS, nextPhotoIndex, previousPhotoIndex } from "./ExperienceGallery";

describe("experience gallery navigation", () => {
  it("wraps forward after the final photo", () => {
    expect(nextPhotoIndex(2, 3)).toBe(0);
  });

  it("wraps backward before the first photo", () => {
    expect(previousPhotoIndex(0, 3)).toBe(2);
  });

  it("keeps an empty gallery at index zero", () => {
    expect(nextPhotoIndex(0, 0)).toBe(0);
    expect(previousPhotoIndex(0, 0)).toBe(0);
  });
});

describe("experience gallery photo limit", () => {
  it("allows no more than four photos", () => {
    expect(MAX_EXPERIENCE_PHOTOS).toBe(4);
    expect(experiencePhotoSlots(0)).toBe(4);
    expect(experiencePhotoSlots(3)).toBe(1);
    expect(experiencePhotoSlots(4)).toBe(0);
    expect(experiencePhotoSlots(5)).toBe(0);
  });
});
