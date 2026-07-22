import { describe, expect, it } from "vitest";
import { mediaUrl } from "./api";

describe("mediaUrl", () => {
  it("does not prefix an API path twice", () => {
    expect(mediaUrl("/api/places/7/photo")).toBe("/api/places/7/photo");
  });
});
