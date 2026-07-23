import type { ReactNode } from "react";
import { Button } from "./Button";

type EntityCreateButtonProps = {
  eyebrow: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function EntityCreateButton({
  eyebrow,
  icon,
  label,
  onClick,
}: EntityCreateButtonProps) {
  return (
    <Button
      className="entity-create-button"
      icon={icon}
      onClick={onClick}
      type="button"
      variant="primary"
    >
      <span className="entity-create-button__copy">
        <small>{eyebrow}</small>
        <strong>{label}</strong>
      </span>
    </Button>
  );
}
