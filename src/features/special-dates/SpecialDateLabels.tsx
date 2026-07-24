import type { SpecialDate, SpecialDateRecurrence } from '../../types/domain';

export const specialDateRecurrenceLabel: Record<SpecialDateRecurrence, string> = {
  ONCE: 'Única',
  ANNUAL: 'Anual',
  MONTHLY: 'Mensual',
};

const matchesDate = (date: string, specialDate: SpecialDate) => {
  if (specialDate.recurrence === 'ANNUAL') return specialDate.date.slice(5) === date.slice(5);
  if (specialDate.recurrence === 'MONTHLY') return specialDate.date.slice(-2) === date.slice(-2);
  return specialDate.date === date;
};

export function matchingSpecialDates(date: string | undefined, specialDates: SpecialDate[]) {
  return date ? specialDates.filter((specialDate) => matchesDate(date, specialDate)) : [];
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
