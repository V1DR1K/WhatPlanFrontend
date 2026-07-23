import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "tertiary" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

export function buttonClassName(variant: ButtonVariant, className?: string) {
  return ["button", `button--${variant}`, className].filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  icon,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName(variant, className)} {...props}>
      {icon !== undefined && (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {variant === "icon" ? null : <span className="button__label">{children}</span>}
    </button>
  );
}
