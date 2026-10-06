import type { ReactNode } from "react";
import { sectionThemeStyle, type SectionId } from "../../lib/sectionTheme";

type LoadingSkeletonProps = {
  inlineKind?: "iterator" | "journey-summary" | "gallery" | "location" | "settings" | "recommendations";
  compactExperience?: boolean;
  section?: SectionId;
  variant?: "catalog" | "detail" | "experience" | "inline" | "list" | "route" | "dashboard" | "settings-page" | "manager";
};

function Line({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`loading-skeleton__line ${className}`} />;
}

function Status({ children, label, section }: { children: ReactNode; label: string; section?: SectionId }) {
  return <div className="loading-status" role="status" aria-busy="true">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="loading-skeleton" style={section ? sectionThemeStyle(section) : undefined}>{children}</div>
  </div>;
}

export function LoadingSkeleton({ variant = "route", section, inlineKind = "iterator", compactExperience = false }: LoadingSkeletonProps) {
  if (variant === "dashboard") return <Status label="Preparando el selector de secciones"><DashboardSkeleton /></Status>;
  if (variant === "settings-page") return <Status label="Cargando configuración" section={section}><SettingsPageSkeleton /></Status>;
  if (variant === "manager") return <Status label="Cargando catálogos de configuración" section={section}><ManagerSkeleton section={section ?? "food"} /></Status>;
  if (variant === "route") return <Status label="Preparando la sección" section={section}><RouteSkeleton section={section ?? "food"} /></Status>;
  if (variant === "catalog") return <Status label="Cargando experiencias" section={section}><CatalogSkeleton section={section ?? "food"} /></Status>;
  if (variant === "detail") return <Status label="Cargando ficha" section={section}><DetailSkeleton section={section ?? "food"} /></Status>;
  if (variant === "experience") return <Status label="Cargando el historial de esta experiencia" section={section}><ExperienceSkeleton section={section ?? "food"} compact={compactExperience} /></Status>;
  if (variant === "inline") return <Status label="Cargando contenido" section={section}><InlineSkeleton kind={inlineKind} /></Status>;
  return <Status label="Cargando registros" section={section}><ListSkeleton section={section} /></Status>;
}

export function LoadingSkeletonForPath({ pathname }: { pathname: string }) {
  if (pathname === "/app") return <LoadingSkeleton variant="dashboard" />;
  if (pathname === "/app/settings") return <LoadingSkeleton variant="settings-page" />;

  const routes: Array<[RegExp, SectionId, "detail" | "route" | "list" | "settings-page" | "manager"]> = [
    [/^\/app\/whither-journey\/settings$/, "journey", "manager"],
    [/^\/app\/whither-journey\/[^/]+$/, "journey", "detail"],
    [/^\/app\/whither-journey$/, "journey", "route"],
    [/^\/app\/food\/places\/[^/]+$/, "food", "detail"],
    [/^\/app\/food\/categories$/, "food", "manager"],
    [/^\/app\/food$/, "food", "route"],
    [/^\/app\/films\/platforms$/, "film", "manager"],
    [/^\/app\/films\/[^/]+$/, "film", "detail"],
    [/^\/app\/films$/, "film", "route"],
    [/^\/app\/how-cook\/[^/]+$/, "cook", "detail"],
    [/^\/app\/how-cook$/, "cook", "route"],
    [/^\/app\/why-fun\/categories$/, "fun", "manager"],
    [/^\/app\/why-fun\/[^/]+$/, "fun", "detail"],
    [/^\/app\/why-fun$/, "fun", "route"],
    [/^\/app\/when-dates\/settings$/, "dates", "manager"],
    [/^\/app\/when-dates\/\d+\/\d{4}-\d{2}-\d{2}$/, "dates", "detail"],
    [/^\/app\/when-dates$/, "dates", "route"],
  ];
  const match = routes.find(([pattern]) => pattern.test(pathname));
  if (!match) return <LoadingSkeleton variant="route" section="food" />;
  const [, section, variant] = match;
  return <LoadingSkeleton variant={variant} section={section} />;
}

function CatalogSkeleton({ section }: { section: SectionId }) {
  return <section className={`loading-skeleton__catalog loading-skeleton__catalog--${section}`}>
    <div className="loading-skeleton__catalog-grid">
      {Array.from({ length: 4 }, (_, index) => <CatalogCardSkeleton key={index} section={section} />)}
    </div>
  </section>;
}

function CatalogCardSkeleton({ section }: { section: SectionId }) {
  return <article className={`loading-skeleton__catalog-card loading-skeleton__catalog-card--${section}`}>
    <div className="loading-skeleton__catalog-media">
      <Line className="loading-skeleton__catalog-image" />
      {section !== "cook" && <Line className="loading-skeleton__catalog-badge" />}
    </div>
    <div className="loading-skeleton__catalog-body">
      <div className="loading-skeleton__catalog-heading">
        <div><Line className="loading-skeleton__catalog-eyebrow" /><Line className="loading-skeleton__catalog-title" /></div>
        {section !== "dates" && <Line className="loading-skeleton__catalog-kpi" />}
      </div>
      {section === "food" && <>
        <div className="loading-skeleton__catalog-stars">{Array.from({ length: 5 }, (_, star) => <Line key={star} />)}</div>
        <Line className="loading-skeleton__catalog-note" />
      </>}
      {section === "film" && <div className="loading-skeleton__catalog-metrics">{Array.from({ length: 3 }, (_, metric) => <div key={metric}><Line /><Line /></div>)}</div>}
      {section === "fun" && <div className="loading-skeleton__catalog-note-group"><Line /><Line className="loading-skeleton__line--medium" /></div>}
      {section === "journey" && <div className="loading-skeleton__catalog-note-group"><Line /><Line className="loading-skeleton__line--short" /></div>}
      {(section === "food" || section === "film" || section === "dates" || section === "journey") && (
        <div className="loading-skeleton__catalog-chips">
          {Array.from({ length: section === "dates" ? 1 : 2 }, (_, chip) => <Line key={chip} />)}
        </div>
      )}
      <div className="loading-skeleton__catalog-footer"><Line /><Line /></div>
    </div>
  </article>;
}

function DetailSkeleton({ section }: { section: SectionId }) {
  if (section === "dates") return <DateDetailSkeleton />;
  if (section === "journey") return <JourneyDetailSkeleton />;
  if (section === "fun") return <FunDetailSkeleton />;
  return <EntityDetailSkeleton section={section} />;
}

function EntityDetailSkeleton({ section }: { section: "food" | "film" | "cook" }) {
  return <section className={`loading-skeleton__detail loading-skeleton__detail--${section}`}>
    <Line className="loading-skeleton__back" />
    <div className="loading-skeleton__entity-head">
      <Line className="loading-skeleton__entity-media" />
      <div className="loading-skeleton__entity-copy">
        <Line className="loading-skeleton__eyebrow" />
        <Line className="loading-skeleton__entity-title" />
        <Line className="loading-skeleton__line--medium" />
        <Line />
        {section === "film" && <><Line /><Line className="loading-skeleton__line--medium" /></>}
        {section === "food" && <Line className="loading-skeleton__line--short" />}
        <div className="loading-skeleton__entity-chips"><Line /><Line /></div>
      </div>
      <div className="loading-skeleton__entity-actions"><Line /><Line /><Line /></div>
    </div>
    {section === "food" && <>
      <div className="loading-skeleton__rating-breakdown loading-skeleton__rating-breakdown--food">
        <div><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__rating-stars" /><Line /></div>
        <div>{Array.from({ length: 3 }, (_, item) => <div key={item}><Line /><Line /></div>)}</div>
      </div>
      <HistorySkeleton />
      <GallerySkeleton />
    </>}
    {section === "film" && <>
      <div className="loading-skeleton__rating-breakdown loading-skeleton__rating-breakdown--film">
        <div><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__rating-stars" /></div>
        <div>{Array.from({ length: 3 }, (_, item) => <div key={item}><Line /><Line /></div>)}</div>
      </div>
      <div className="loading-skeleton__film-facts">{Array.from({ length: 4 }, (_, fact) => <div key={fact}><Line /><Line /></div>)}</div>
      <HistorySkeleton />
      <ReviewSkeleton />
    </>}
    {section === "cook" && <>
      <div className="loading-skeleton__rating-breakdown loading-skeleton__rating-breakdown--cook">
        <div><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__rating-stars" /></div>
        <div>{Array.from({ length: 2 }, (_, item) => <div key={item}><Line /><Line /></div>)}</div>
      </div>
      <div className="loading-skeleton__recipe-panes"><RecipePane /><RecipePane /></div>
      <HistorySkeleton />
      <GallerySkeleton />
    </>}
  </section>;
}

function FunDetailSkeleton() {
  return <section className="loading-skeleton__detail loading-skeleton__detail--fun">
    <Line className="loading-skeleton__back" />
    <Line className="loading-skeleton__fun-cover" />
    <div className="loading-skeleton__fun-heading"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__entity-title" /><Line className="loading-skeleton__line--medium" /><Line /></div>
    <div className="loading-skeleton__entity-actions loading-skeleton__entity-actions--horizontal"><Line /><Line /><Line /></div>
    <div className="loading-skeleton__rating-breakdown loading-skeleton__rating-breakdown--fun"><div><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__rating-stars" /><Line /></div></div>
    <div className="loading-skeleton__fun-panels"><RecipePane /><RecipePane /></div>
    <HistorySkeleton />
    <GallerySkeleton />
  </section>;
}

function DateDetailSkeleton() {
  return <section className="loading-skeleton__detail loading-skeleton__detail--dates">
    <Line className="loading-skeleton__back" />
    <header className="loading-skeleton__date-heading"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__date-title" /><Line className="loading-skeleton__line--medium" /></header>
    <section className="loading-skeleton__date-gallery"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><GalleryTiles /></section>
    <section className="loading-skeleton__date-entries"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div>{Array.from({ length: 3 }, (_, row) => <div className="loading-skeleton__date-entry" key={row}><Line /><div><Line /><Line className="loading-skeleton__line--medium" /></div><Line /></div>)}</section>
    <section className="loading-skeleton__date-comments"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><ReviewSkeleton /></section>
  </section>;
}

function JourneyDetailSkeleton() {
  return <section className="loading-skeleton__detail loading-skeleton__detail--journey">
    <Line className="loading-skeleton__back" />
    <div className="loading-skeleton__journey-head">
      <Line className="loading-skeleton__journey-cover" />
      <div className="loading-skeleton__entity-copy"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__entity-title" /><Line className="loading-skeleton__line--medium" /><Line /><div className="loading-skeleton__journey-summary"><Line /><Line /><Line /></div></div>
      <div className="loading-skeleton__entity-actions"><Line /><Line /></div>
    </div>
    <div className="loading-skeleton__journey-tabs">{Array.from({ length: 7 }, (_, tab) => <Line key={tab} />)}</div>
    <div className="loading-skeleton__journey-overview"><Line className="loading-skeleton__line--medium" /><Line /><div>{Array.from({ length: 3 }, (_, card) => <div key={card}><Line /><Line className="loading-skeleton__line--medium" /></div>)}</div></div>
    <div className="loading-skeleton__journey-day"><Line /><Line className="loading-skeleton__line--medium" /><Line /></div>
    <div className="loading-skeleton__journey-panels"><RecipePane /><RecipePane /></div>
  </section>;
}

function HistorySkeleton() {
  return <section className="loading-skeleton__history"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><div className="loading-skeleton__iterator"><Line /><Line className="loading-skeleton__line--medium" /><Line /></div></section>;
}

function GallerySkeleton() {
  return <section className="loading-skeleton__gallery"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><GalleryTiles /></section>;
}

function GalleryTiles() {
  return <div className="loading-skeleton__gallery-tiles">{Array.from({ length: 3 }, (_, photo) => <Line key={photo} />)}</div>;
}

function ReviewSkeleton() {
  return <div className="loading-skeleton__review-cards">{Array.from({ length: 2 }, (_, review) => <div key={review}><Line /><Line className="loading-skeleton__line--short" /><Line /><Line className="loading-skeleton__line--medium" /></div>)}</div>;
}

function RecipePane() {
  return <div className="loading-skeleton__content-pane"><Line className="loading-skeleton__line--medium" />{Array.from({ length: 4 }, (_, line) => <Line key={line} />)}</div>;
}

function ExperienceSkeleton({ section, compact }: { section: SectionId; compact: boolean }) {
  return <section className={`loading-skeleton__experience loading-skeleton__experience--${section}${compact ? " loading-skeleton__experience--compact" : ""}`}>
    {!compact && <div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div>}
    <div className="loading-skeleton__experience-meta"><Line /><Line className="loading-skeleton__line--medium" /></div>
    <GalleryTiles />
    <div className="loading-skeleton__experience-reviews"><div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><ReviewSkeleton /></div>
  </section>;
}

function ListSkeleton({ section }: { section?: SectionId }) {
  if (section === "dates") return <ul className="loading-skeleton__date-list">{Array.from({ length: 3 }, (_, row) => <li key={row}><div><Line className="loading-skeleton__date" /><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><div><Line /><Line /></div></li>)}</ul>;
  if (section === "food") return <div className="loading-skeleton__archive-list">{Array.from({ length: 3 }, (_, row) => <div key={row}><Line /><div><Line className="loading-skeleton__line--medium" /><Line /></div><Line /></div>)}</div>;
  return <div className="loading-skeleton__list">{Array.from({ length: 3 }, (_, row) => <div className="loading-skeleton__list-row" key={row}><Line /><div><Line className="loading-skeleton__line--medium" /><Line /></div></div>)}</div>;
}

function InlineSkeleton({ kind }: { kind: NonNullable<LoadingSkeletonProps["inlineKind"]> }) {
  if (kind === "iterator") return <div className="loading-skeleton__inline loading-skeleton__inline--iterator"><Line /><div><Line className="loading-skeleton__line--medium" /><Line /></div><Line /></div>;
  if (kind === "journey-summary") return <div className="loading-skeleton__inline loading-skeleton__inline--summary"><Line className="loading-skeleton__line--medium" /><div><RecipePane /><RecipePane /></div></div>;
  if (kind === "gallery") return <div className="loading-skeleton__inline loading-skeleton__inline--gallery"><GalleryTiles /></div>;
  if (kind === "recommendations") return <div className="loading-skeleton__inline loading-skeleton__inline--recommendations">{Array.from({ length: 5 }, (_, card) => <div key={card}><Line /><div><Line /><Line className="loading-skeleton__line--short" /></div></div>)}</div>;
  if (kind === "settings") return <div className="loading-skeleton__inline loading-skeleton__inline--settings"><Line className="loading-skeleton__line--medium" /><Line /><Line /><Line className="loading-skeleton__inline-button" /></div>;
  return <div className="loading-skeleton__inline loading-skeleton__inline--location"><Line /><Line className="loading-skeleton__line--medium" /></div>;
}

function RouteSkeleton({ section }: { section: SectionId }) {
  return <section className={`loading-skeleton__route loading-skeleton__route--${section}`}>
    <div className="loading-skeleton__route-hero">
      <div><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__route-title" /><Line className="loading-skeleton__line--medium" /><Line /></div>
      {section !== "journey" && <Line className="loading-skeleton__route-art" />}
    </div>
    <div className="loading-skeleton__route-filters"><Line /><Line /><Line /></div>
    <div className="loading-skeleton__section-heading"><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div>
    <CatalogSkeleton section={section} />
  </section>;
}

const dashboardSections: SectionId[] = ["food", "film", "cook", "fun", "dates", "journey"];

function DashboardSkeleton() {
  return <section className="loading-skeleton__dashboard">
    <div className="loading-skeleton__dashboard-intro"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__dashboard-title" /><Line className="loading-skeleton__line--medium" /></div>
    <div className="loading-skeleton__dashboard-grid">{dashboardSections.map((section) => <article key={section} style={sectionThemeStyle(section)}><Line /><Line className="loading-skeleton__line--medium" /><Line /><Line className="loading-skeleton__line--short" /></article>)}</div>
  </section>;
}

function SettingsPageSkeleton() {
  return <section className="loading-skeleton__settings-page">
    <div className="loading-skeleton__settings-intro"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__settings-title" /><Line className="loading-skeleton__line--medium" /></div>
    <article className="loading-skeleton__settings-form"><div><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__line--medium" /><Line /></div><Line /><Line className="loading-skeleton__settings-button" /></article>
  </section>;
}

function ManagerSkeleton({ section }: { section: SectionId }) {
  const panelCount = section === "dates" || section === "journey" ? 1 : 2;
  return <section className={`loading-skeleton__manager loading-skeleton__manager--${section}`}>
    <div className="loading-skeleton__settings-intro"><Line className="loading-skeleton__eyebrow" /><Line className="loading-skeleton__settings-title" /><Line className="loading-skeleton__line--medium" /></div>
    <div className="loading-skeleton__settings-panels">
      {Array.from({ length: panelCount }, (_, panel) => <article key={panel}>
        <div><Line className="loading-skeleton__line--medium" /><Line /></div>
        <Line className="loading-skeleton__settings-button" />
        {Array.from({ length: 3 }, (_, row) => <div className="loading-skeleton__settings-row" key={row}><Line /><div><Line className="loading-skeleton__line--medium" /><Line className="loading-skeleton__line--short" /></div><Line /><Line /></div>)}
      </article>)}
    </div>
  </section>;
}
