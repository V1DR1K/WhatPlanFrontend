import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PhotoOrientation } from "./AdaptivePhoto";

type CatalogMediaCardProps = {
  ariaLabel: string;
  badge?: ReactNode;
  chips?: ReactNode;
  children?: ReactNode;
  eyebrow: ReactNode;
  footer: ReactNode;
  image: ReactNode;
  kpi?: ReactNode;
  orientation: PhotoOrientation;
  theme: "food" | "film" | "cook" | "fun" | "dates";
  title: ReactNode;
  to: string;
};

/** Shared catalogue-card shell; each section provides its own content slots. */
export function CatalogMediaCard({
  ariaLabel, badge, chips, children, eyebrow, footer, image, kpi,
  orientation, theme, title, to,
}: CatalogMediaCardProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={`catalog-media-card-link catalog-media-card-link--${theme} media-card media-card--${orientation}`}
      to={to}
    >
      <article className={`catalog-media-card catalog-media-card--${theme}`}>
        <div className="catalog-media-card__media">
          {image}
          {badge && <small className="catalog-media-card__badge">{badge}</small>}
        </div>
        <div className="catalog-media-card__body">
          <div className="catalog-media-card__heading">
            <div>
              <p className="catalog-media-card__eyebrow">{eyebrow}</p>
              <h3>{title}</h3>
            </div>
            {kpi && <b className="catalog-media-card__kpi">{kpi}</b>}
          </div>
          {children && <div className="catalog-media-card__details">{children}</div>}
          {chips && <div className="catalog-media-card__chips">{chips}</div>}
          <footer className="catalog-media-card__footer">{footer}</footer>
        </div>
      </article>
    </Link>
  );
}
