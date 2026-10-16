import { describe, expect, it } from 'vitest';
import { formaterDate } from './dates';

describe('formaterDate', () => {
  it('convertit une date ISO en JJ/MM/AAAA', () => {
    expect(formaterDate('2026-10-14')).toBe('14/10/2026');
  });

  it('conserve les zéros de tête du jour et du mois', () => {
    expect(formaterDate('2027-01-05')).toBe('05/01/2027');
  });
});
