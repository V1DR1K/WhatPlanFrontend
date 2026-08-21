import type { ReactNode } from 'react';

type ExperienceHeroProps = {
  className: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  art: ReactNode;
};

export function ExperienceHero({ className, eyebrow, title, description, art }: ExperienceHeroProps) {
  return <section className={`experience-hero ${className}`}>
    <div className="experience-hero__content">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="experience-hero__description">{description}</p>
    </div>
    <div className="experience-hero__art" aria-hidden="true">{art}</div>
  </section>;
}
