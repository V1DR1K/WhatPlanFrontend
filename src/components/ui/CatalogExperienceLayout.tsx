import type { ReactNode } from "react";
import type { SectionId } from "../../lib/sectionTheme";
import { SectionShell } from "./SectionShell";

type CatalogExperienceLayoutProps = {
  children: ReactNode;
  className?: string;
  createAction: ReactNode;
  hero: ReactNode;
  controls: ReactNode;
  section: Exclude<SectionId, "dates">;
};

/** Shared hierarchy for experiences that collect plans: orient, create, refine, explore. */
export function CatalogExperienceLayout({ children, className, createAction, controls, hero, section }: CatalogExperienceLayoutProps) {
  return <SectionShell className={["catalog-experience", className].filter(Boolean).join(" ")} section={section}>
    {hero}
    <div className="catalog-experience__create">{createAction}</div>
    {controls}
    <div className="catalog-experience__results">{children}</div>
  </SectionShell>;
}
