import { describe, expect, it } from "vitest";
import {
  formatAmountInput,
  normalizeAmountInput,
  offsetJourneyDate,
} from "./journey";

describe("journey rules", () => {
  it("normalizes pasted Argentine amounts and formats large values without losing four decimals", () => {
    expect(normalizeAmountInput("1.234.567,8900")).toBe("1234567.8900");
    expect(normalizeAmountInput("1.234.567")).toBe("1234567");
    expect(formatAmountInput("99999999999999.9999")).toBe("99.999.999.999.999,9999");
    expect(formatAmountInput("1.234,50")).toBe("1.234,50");
  });

  it("steps through journey dates across month and year boundaries", () => {
    expect(offsetJourneyDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(offsetJourneyDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(offsetJourneyDate("2027-01-01", -1)).toBe("2026-12-31");
  });
});
