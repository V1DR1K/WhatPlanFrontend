import { describe, expect, it } from "vitest";
import { normalizeQuarterTurns, rotatedDimensions } from "./photos";

describe("photo rotation helpers", () => {
  it("normalizes rotations to a clockwise quarter-turn", () => {
    expect(normalizeQuarterTurns(-1)).toBe(3);
    expect(normalizeQuarterTurns(4)).toBe(0);
    expect(normalizeQuarterTurns(5)).toBe(1);
  });

  it("swaps dimensions for portrait and landscape rotations", () => {
    expect(rotatedDimensions(1600, 900, 1)).toEqual({ width: 900, height: 1600 });
    expect(rotatedDimensions(1600, 900, 3)).toEqual({ width: 900, height: 1600 });
  });

  it("keeps dimensions for a full turn", () => {
    expect(rotatedDimensions(1600, 900, 4)).toEqual({ width: 1600, height: 900 });
  });
});
