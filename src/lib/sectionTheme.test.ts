import { describe, expect, it } from "vitest";
import { sectionThemeStyle, sectionThemes } from "./sectionTheme";

describe("section themes", () => {
  it("defines a complete, distinct theme for every experience", () => {
    expect(Object.keys(sectionThemes)).toHaveLength(5);
    expect(new Set(Object.values(sectionThemes).map((theme) => theme.accent)).size).toBe(5);
  });

  it("exposes semantic CSS variables for the section shell", () => {
    expect(sectionThemeStyle("food")).toMatchObject({ "--section-accent": "#ff8a00", "--section-surface": "#332000" });
  });
});
