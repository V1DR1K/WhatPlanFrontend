import { describe, expect, it } from 'vitest';
import { matchingSpecialDates, specialDateDisplay, specialDateOptionSuffix } from './SpecialDateLabels';

const specialDates = [
  { id: 1, date: '2026-02-14', label: 'San Valentín', recurrence: 'ANNUAL' as const, createdAt: '', updatedAt: '' },
  { id: 2, date: '2026-02-14', label: 'Cena especial', recurrence: 'ONCE' as const, createdAt: '', updatedAt: '' },
  { id: 3, date: '2026-06-27', label: 'Mensuario', recurrence: 'MONTHLY' as const, createdAt: '', updatedAt: '' },
  { id: 4, date: '2026-10-10', endsOn: '2026-10-12', label: 'Viaje', recurrence: 'ONCE' as const, createdAt: '', updatedAt: '' },
  { id: 5, date: '2026-10-10', endsOn: '2026-10-12', label: 'Aniversario largo', recurrence: 'ANNUAL' as const, createdAt: '', updatedAt: '' },
  { id: 6, date: '2026-06-27', endsOn: '2026-06-29', label: 'Mensuario largo', recurrence: 'MONTHLY' as const, createdAt: '', updatedAt: '' },
];

describe('special date labels', () => {
  it('matches unique, annual and monthly dates with their respective cadence', () => {
    expect(matchingSpecialDates('2026-02-14', specialDates).map((value) => value.label)).toEqual(['San Valentín', 'Cena especial']);
    expect(matchingSpecialDates('2027-02-14', specialDates).map((value) => value.label)).toEqual(['San Valentín']);
    expect(matchingSpecialDates('2027-08-27', specialDates).map((value) => value.label)).toEqual(['Mensuario', 'Mensuario largo']);
  });

  it('adds all matching labels to a history option', () => {
    expect(specialDateOptionSuffix('2026-02-14', specialDates)).toBe(' · San Valentín · Cena especial');
  });

  it('matches every day in a unique date range, including both endpoints', () => {
    expect(matchingSpecialDates('2026-10-10', specialDates).map((value) => value.label)).toContain('Viaje');
    expect(matchingSpecialDates('2026-10-11', specialDates).map((value) => value.label)).toContain('Viaje');
    expect(matchingSpecialDates('2026-10-12', specialDates).map((value) => value.label)).toContain('Viaje');
    expect(matchingSpecialDates('2026-10-13', specialDates).map((value) => value.label)).not.toContain('Viaje');
  });

  it('matches recurring ranges on every inclusive day and preserves the recurring window', () => {
    expect(matchingSpecialDates('2027-10-11', specialDates).map((value) => value.label)).toContain('Aniversario largo');
    expect(matchingSpecialDates('2027-10-12', specialDates).map((value) => value.label)).toContain('Aniversario largo');
    expect(matchingSpecialDates('2027-10-13', specialDates).map((value) => value.label)).not.toContain('Aniversario largo');
    expect(matchingSpecialDates('2027-07-28', specialDates).map((value) => value.label)).toContain('Mensuario largo');
    expect(matchingSpecialDates('2027-07-30', specialDates).map((value) => value.label)).not.toContain('Mensuario largo');
  });

  it('matches daily recurring dates on any day', () => {
    const daily = { id: 7, date: '2026-03-01', label: 'Recuerdo diario', recurrence: 'DAILY' as const, createdAt: '', updatedAt: '' };
    expect(matchingSpecialDates('2027-09-08', [daily]).map((value) => value.label)).toContain('Recuerdo diario');
  });

  it('formats special dates for display without changing their ISO value', () => {
    expect(specialDateDisplay('2026-02-14')).toBe('14/02/2026');
  });
});
