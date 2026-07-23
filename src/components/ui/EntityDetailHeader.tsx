import type { ReactNode } from "react";
import { Button } from "./Button";

type EntityDetailActionsProps = {
  destructive: {
    disabled?: boolean;
    icon?: ReactNode;
    label: string;
    onClick: () => void;
  };
  primary: {
    disabled?: boolean;
    icon?: ReactNode;
    label: string;
    onClick: () => void;
  };
  secondary: {
    disabled?: boolean;
    icon?: ReactNode;
    label: string;
    onClick: () => void;
  };
};

export function EntityDetailActions({
  destructive,
  primary,
  secondary,
}: EntityDetailActionsProps) {
  return (
    <div className="detail-actions">
      <Button
        disabled={primary.disabled}
        icon={primary.icon ?? "➕"}
        onClick={primary.onClick}
        type="button"
        variant="primary"
      >
        {primary.label}
      </Button>
      <Button
        disabled={secondary.disabled}
        icon={secondary.icon ?? "✏️"}
        onClick={secondary.onClick}
        type="button"
        variant="secondary"
      >
        {secondary.label}
      </Button>
      <Button
        disabled={destructive.disabled}
        icon={destructive.icon ?? "🗑️"}
        onClick={destructive.onClick}
        type="button"
        variant="destructive"
      >
        {destructive.label}
      </Button>
    </div>
  );
}

type EntityDetailHeaderProps = {
  actions: ReactNode;
  className?: string;
  eyebrow: ReactNode;
  media: ReactNode;
  metadata?: ReactNode;
  summary?: ReactNode;
  title: ReactNode;
};

export function EntityDetailHeader({
  actions,
  className,
  eyebrow,
  media,
  metadata,
  summary,
  title,
}: EntityDetailHeaderProps) {
  return (
    <header className={["entity-detail-header", className].filter(Boolean).join(" ")}>
      <div className="entity-detail-header__media">{media}</div>
      <div className="entity-detail-header__summary">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {metadata && <div className="entity-detail-header__metadata">{metadata}</div>}
        {summary && <div className="entity-detail-header__description">{summary}</div>}
      </div>
      {actions}
    </header>
  );
}
