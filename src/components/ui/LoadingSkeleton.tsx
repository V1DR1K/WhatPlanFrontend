type LoadingSkeletonProps = {
  variant?: "catalog" | "detail" | "list" | "route";
};

function Line({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`loading-skeleton__line ${className}`} />;
}

function Status({ children, label }: { children: ReactNode; label: string }) {
  return <div className="loading-status" role="status"><span className="sr-only">{label}</span>{children}</div>;
}

/** Reserves the destination layout while code or data arrives, preventing a blank-page flash. */
export function LoadingSkeleton({ variant = "route" }: LoadingSkeletonProps) {
  if (variant === "detail") {
    return <Status label="Preparando detalle"><section aria-hidden="true" className="loading-skeleton loading-skeleton--detail">
      <div className="loading-skeleton__detail-media" />
      <div className="loading-skeleton__detail-copy"><Line className="loading-skeleton__line--short" /><Line className="loading-skeleton__line--title" /><Line /><Line className="loading-skeleton__line--medium" /></div>
      <div className="loading-skeleton__actions"><Line /><Line /></div>
      <div className="loading-skeleton__panel"><Line className="loading-skeleton__line--medium" /><Line /><Line /></div>
    </section></Status>;
  }

  if (variant === "list") {
    return <Status label="Preparando lista"><div aria-hidden="true" className="loading-skeleton loading-skeleton--list">{Array.from({ length: 3 }, (_, index) => <div className="loading-skeleton__row" key={index}><span /><div><Line className="loading-skeleton__line--medium" /><Line /></div></div>)}</div></Status>;
  }

  const cards = Array.from({ length: variant === "route" ? 3 : 4 }, (_, index) => <article className="loading-skeleton__card" key={index}><div /><Line className="loading-skeleton__line--short" /><Line className="loading-skeleton__line--medium" /><Line /></article>);
  return <Status label="Preparando contenido"><section aria-hidden="true" className={`loading-skeleton loading-skeleton--${variant}`}>
    {variant === "route" && <div className="loading-skeleton__hero"><Line className="loading-skeleton__line--short" /><Line className="loading-skeleton__line--title" /><Line className="loading-skeleton__line--medium" /></div>}
    <div className="loading-skeleton__grid">{cards}</div>
  </section></Status>;
}
import type { ReactNode } from "react";
