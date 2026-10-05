import type { SpecialDate, SpecialDateRecurrence } from '../../types/domain';

export const specialDateRecurrenceLabel: Record<SpecialDateRecurrence, string> = {
  ONCE: 'Única',
  ANNUAL: 'Anual',
  MONTHLY: 'Mensual',
  DAILY: 'Diaria',
};

export const specialDateDisplay = (date: string) => date.split('-').reverse().join('/');

const dateInUtc = (value: string) => Date.parse(`${value}T00:00:00Z`);
const dateString = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((dateInUtc(to) - dateInUtc(from)) / 86_400_000);
const recurringStart = (year: number, month: number, day: number) =>
  dateString(year, month, Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate()));

const matchesDate = (date: string, specialDate: SpecialDate) => {
  const end = specialDate.endsOn ?? specialDate.date;
  if (specialDate.recurrence === 'ONCE') return date >= specialDate.date && date <= end;
  if (specialDate.recurrence === 'DAILY') return true;

  const duration = daysBetween(specialDate.date, end);
  const target = dateInUtc(date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const anchorMonth = Number(specialDate.date.slice(5, 7));
  const anchorDay = Number(specialDate.date.slice(8, 10));
  const starts = specialDate.recurrence === 'ANNUAL'
    ? [recurringStart(year, anchorMonth, anchorDay), recurringStart(year - 1, anchorMonth, anchorDay)]
    : [0, 1].map((offset) => {
      const previousMonth = new Date(Date.UTC(year, month - 1 - offset, 1));
      return recurringStart(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth() + 1, anchorDay);
    });

  return starts.some((start) => target >= dateInUtc(start)
    && target <= dateInUtc(start) + duration * 86_400_000);
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
