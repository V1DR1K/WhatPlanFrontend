import { describe, expect, it } from 'vitest';
import { matchingSpecialDates, specialDateOptionSuffix } from './SpecialDateLabels';

const specialDates = [
  { id: 1, date: '2026-02-14', label: 'San Valentín', recurrence: 'ANNUAL' as const, createdAt: '', updatedAt: '' },
  { id: 2, date: '2026-02-14', label: 'Cena especial', recurrence: 'ONCE' as const, createdAt: '', updatedAt: '' },
  { id: 3, date: '2026-06-27', label: 'Mensuario', recurrence: 'MONTHLY' as const, createdAt: '', updatedAt: '' },
];

describe('special date labels', () => {
  it('matches unique, annual and monthly dates with their respective cadence', () => {
    expect(matchingSpecialDates('2026-02-14', specialDates).map((value) => value.label)).toEqual(['San Valentín', 'Cena especial']);
    expect(matchingSpecialDates('2027-02-14', specialDates).map((value) => value.label)).toEqual(['San Valentín']);
    expect(matchingSpecialDates('2027-08-27', specialDates).map((value) => value.label)).toEqual(['Mensuario']);
  });

  it('adds all matching labels to a history option', () => {
    expect(specialDateOptionSuffix('2026-02-14', specialDates)).toBe(' · San Valentín · Cena especial');
  });
});
