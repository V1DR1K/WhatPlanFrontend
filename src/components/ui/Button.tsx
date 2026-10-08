import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "tertiary" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

export function buttonClassName(variant: ButtonVariant, className?: string) {
  return ["button", `button--${variant}`, className].filter(Boolean).join(" ");
}

function textContent(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textContent).join(" ");
  if (isValidElement<{ children?: ReactNode }>(children)) return textContent(children.props.children);
  return Children.toArray(children).map(textContent).join(" ");
}

export function Button({
  children,
  className,
  icon,
  variant = "primary",
  ...props
}: ButtonProps) {
  const isSaveAction = /\b(?:guardar|guardando)\b/i.test(textContent(children));
  const buttonIcon = isSaveAction ? "💾" : icon;

  return (
    <button className={buttonClassName(variant, className)} {...props}>
      {buttonIcon !== undefined && (
        <span className="button__icon" aria-hidden="true">
          {buttonIcon}
        </span>
      )}
      {children !== undefined && <span className="button__label">{children}</span>}
    </button>
  );
}
