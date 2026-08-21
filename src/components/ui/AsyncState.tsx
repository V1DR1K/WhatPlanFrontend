import type { ReactNode } from "react";
import { Button } from "./Button";
import { LoadingSkeleton } from "./LoadingSkeleton";

type AsyncStateProps = {
  empty?: ReactNode;
  error?: boolean;
  loading?: boolean;
  onRetry?: () => void;
};

/** Consistent loading, empty and recoverable-error copy for all experiences. */
export function AsyncState({ empty, error, loading, onRetry }: AsyncStateProps) {
  if (loading) return <LoadingSkeleton variant="list" />;
  if (error) return <div className="async-state async-state--error" role="alert"><p>No pudimos cargar esta parte. Revisá tu conexión e intentá de nuevo.</p>{onRetry && <Button onClick={onRetry} type="button" variant="secondary">Reintentar</Button>}</div>;
  if (empty) return <div className="async-state async-state--empty">{empty}</div>;
  return null;
}
