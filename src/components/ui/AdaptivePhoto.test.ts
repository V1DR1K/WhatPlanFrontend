import { describe, expect, it } from "vitest";
import { getPhotoOrientation, photoSource } from "./AdaptivePhoto";

describe("getPhotoOrientation", () => {
  it("classifies a taller image as portrait", () => {
    expect(getPhotoOrientation(894, 1600)).toBe("portrait");
  });

  it("classifies a wider image as landscape", () => {
    expect(getPhotoOrientation(1600, 1200)).toBe("landscape");
  });

  it("classifies square photos separately", () => {
    expect(getPhotoOrientation(1200, 1200)).toBe("square");
  });

  it("uses the supplied fallback when dimensions are unavailable", () => {
    expect(getPhotoOrientation(undefined, undefined, "portrait")).toBe("portrait");
  });

  it("uses a thumbnail in compact contexts and the full image in detail", () => {
    expect(photoSource("thumbnail", "/photo", "/thumbnail")).toBe("/thumbnail");
    expect(photoSource("full", "/photo", "/thumbnail")).toBe("/photo");
  });

  it("falls back safely when an API omits a local film photo", () => {
    expect(photoSource("thumbnail", null, null)).toBeUndefined();
  });
});
