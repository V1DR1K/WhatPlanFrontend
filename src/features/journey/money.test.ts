import { describe, it, expect } from "vitest";
import { money } from "./journey";
describe("currency amounts", () => {
  it("keeps decimal cents beyond Javascript safe integer precision", () => {
    expect(money("99999999999999.9899", "ARS")).toContain(
      "99.999.999.999.999,99",
    );
  });
  it("rounds a negative balance without losing its sign near zero", () => {
    expect(money("-0.1250", "USD").replace(/\u00a0/g, " ")).toBe("-US$ 0,13");
  });
  it("uses the fraction digits of each currency", () => {
    expect(money("12.5000", "JPY")).toBe(
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "JPY",
      }).format(13),
    );
    expect(money("12.1234", "BHD")).toContain("12,123");
  });
});
