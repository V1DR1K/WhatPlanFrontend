import { describe, expect, it } from 'vitest';
import { matchingSpecialDates, specialDateOptionSuffix } from './SpecialDateLabels';

const specialDates = [
  { id: 1, date: '2026-02-14', label: 'San Valentín', createdAt: '', updatedAt: '' },
  { id: 2, date: '2026-02-14', label: 'Aniversario', createdAt: '', updatedAt: '' },
  { id: 3, date: '2026-08-03', label: 'Cumpleaños', createdAt: '', updatedAt: '' },
];

describe('special date labels', () => {
  it('matches every label for the exact date only', () => {
    expect(matchingSpecialDates('2026-02-14', specialDates).map((value) => value.label)).toEqual(['San Valentín', 'Aniversario']);
    expect(matchingSpecialDates('2027-02-14', specialDates)).toEqual([]);
  });

  it('adds all matching labels to a history option', () => {
    expect(specialDateOptionSuffix('2026-02-14', specialDates)).toBe(' · San Valentín · Aniversario');
  });
});
