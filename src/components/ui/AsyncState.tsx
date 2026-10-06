import type { ReactNode } from "react";
import { Button } from "./Button";
import { LoadingSkeleton } from "./LoadingSkeleton";
import type { SectionId } from "../../lib/sectionTheme";

type AsyncStateProps = {
  empty?: ReactNode;
  error?: boolean;
  loading?: boolean;
  onRetry?: () => void;
  section?: SectionId;
};

/** Consistent loading, empty and recoverable-error copy for all experiences. */
export function AsyncState({ empty, error, loading, onRetry, section }: AsyncStateProps) {
  if (loading) return <LoadingSkeleton variant="list" section={section} />;
  if (error) return <div className="async-state async-state--error" role="alert"><p>No pudimos cargar esta parte. Revisá tu conexión e intentá de nuevo.</p>{onRetry && <Button onClick={onRetry} type="button" variant="secondary">Reintentar</Button>}</div>;
  if (empty) return <div className="async-state async-state--empty" role="status">{empty}</div>;
  return null;
}
