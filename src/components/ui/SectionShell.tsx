import type { ReactNode } from "react";
import { sectionThemeStyle, type SectionId } from "../../lib/sectionTheme";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
  section: SectionId;
};

/** Applies one semantic visual theme to an entire product experience. */
export function SectionShell({ children, className, section }: SectionShellProps) {
  return <section className={["section-shell", `section-shell--${section}`, className].filter(Boolean).join(" ")} style={sectionThemeStyle(section)}>{children}</section>;
}
