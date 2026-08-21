import { createContext } from "react";
import type { CSSProperties } from "react";

export type SectionId = "food" | "film" | "cook" | "fun" | "dates";

export const SectionThemeContext = createContext<SectionId | undefined>(undefined);

export type SectionTheme = {
  accent: string;
  contrast: string;
  focus: string;
  shadow: string;
  surface: string;
  surfaceSoft: string;
};

export const sectionThemes: Record<SectionId, SectionTheme> = {
  food: { accent: "#ff8a00", contrast: "#2a1600", focus: "#a978ff", shadow: "#6b3600", surface: "#332000", surfaceSoft: "#241600" },
  film: { accent: "#b8adff", contrast: "#291f43", focus: "#a978ff", shadow: "#4f427e", surface: "#29243c", surfaceSoft: "#1d1b27" },
  cook: { accent: "#d4ef55", contrast: "#26351d", focus: "#a978ff", shadow: "#394321", surface: "#2b3120", surfaceSoft: "#222d1a" },
  fun: { accent: "#ffd166", contrast: "#342500", focus: "#a978ff", shadow: "#8a6418", surface: "#33270d", surfaceSoft: "#211c10" },
  dates: { accent: "#ff8bca", contrast: "#351528", focus: "#a978ff", shadow: "#7c376b", surface: "#3a1f46", surfaceSoft: "#21182b" },
};

export function sectionThemeStyle(section: SectionId): CSSProperties {
  const theme = sectionThemes[section];
  return {
    "--section-accent": theme.accent,
    "--section-contrast": theme.contrast,
    "--section-focus": theme.focus,
    "--section-shadow": theme.shadow,
    "--section-surface": theme.surface,
    "--section-surface-soft": theme.surfaceSoft,
    "--wf-surface": theme.surface,
    "--wf-surface-soft": theme.surfaceSoft,
  } as CSSProperties;
}
