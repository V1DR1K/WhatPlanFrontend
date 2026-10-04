import { describe, expect, it } from "vitest";
import { distributeDates } from "./JourneyForm";
import {
  formatAmountInput,
  normalizeAmountInput,
  offsetJourneyDate,
} from "./journey";

describe("journey rules", () => {
  it("distributes leftover days to the first automatic destinations", () => {
    const result = distributeDates(
      [false, false, false].map((manualDates) => ({ manualDates, startsOn: "", endsOn: "" })),
      "2026-01-01",
      "2026-01-07",
    );

    expect(result.error).toBe("");
    expect(result.stages.map(({ startsOn, endsOn }) => [startsOn, endsOn])).toEqual([
      ["2026-01-01", "2026-01-03"],
      ["2026-01-04", "2026-01-05"],
      ["2026-01-06", "2026-01-07"],
    ]);
  });

  it("keeps a fixed destination and distributes the surrounding days", () => {
    const result = distributeDates([
      { manualDates: false, startsOn: "", endsOn: "" },
      { manualDates: true, startsOn: "2026-01-03", endsOn: "2026-01-04" },
      { manualDates: false, startsOn: "", endsOn: "" },
    ], "2026-01-01", "2026-01-07");

    expect(result.error).toBe("");
    expect(result.stages.map(({ startsOn, endsOn }) => [startsOn, endsOn])).toEqual([
      ["2026-01-01", "2026-01-02"],
      ["2026-01-03", "2026-01-04"],
      ["2026-01-05", "2026-01-07"],
    ]);
  });

  it("blocks uncovered dates and periods too short for all destinations", () => {
    const gap = distributeDates([
      { manualDates: true, startsOn: "2026-01-02", endsOn: "2026-01-03" },
    ], "2026-01-01", "2026-01-04");
    const short = distributeDates(
      [false, false, false].map((manualDates) => ({ manualDates, startsOn: "", endsOn: "" })),
      "2026-01-01",
      "2026-01-02",
    );

    expect(gap.error).toMatch(/consecutivas/);
    expect(short.error).toMatch(/suficientes días/);
  });

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
