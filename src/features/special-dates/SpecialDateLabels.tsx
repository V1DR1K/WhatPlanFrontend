import type { SpecialDate } from '../../types/domain';

export function matchingSpecialDates(date: string | undefined, specialDates: SpecialDate[]) {
  return date ? specialDates.filter((specialDate) => specialDate.date === date) : [];
}

export function specialDateOptionSuffix(date: string | undefined, specialDates: SpecialDate[]) {
  const labels = matchingSpecialDates(date, specialDates).map((specialDate) => specialDate.label);
  return labels.length ? ` · ${labels.join(' · ')}` : '';
}

export function SpecialDateLabels({ date, specialDates }: { date: string | undefined; specialDates: SpecialDate[] }) {
  const matches = matchingSpecialDates(date, specialDates);
  if (!matches.length) return null;

  return <span className="special-date-labels" aria-label={`Fecha especial: ${matches.map((specialDate) => specialDate.label).join(', ')}`}>
    {matches.map((specialDate) => <span className="special-date-label" key={specialDate.id}>{specialDate.label}</span>)}
  </span>;
}
