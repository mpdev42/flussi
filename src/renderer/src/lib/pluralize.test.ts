import { describe, expect, it } from 'vitest';
import { pluralize } from './pluralize';

describe('pluralize', () => {
  it('renvoie le singulier pour 0 (règle française)', () => {
    expect(pluralize(0, 'ligne', 'lignes')).toBe('ligne');
  });

  it('renvoie le singulier pour 1', () => {
    expect(pluralize(1, 'ligne', 'lignes')).toBe('ligne');
  });

  it('renvoie le pluriel pour 2', () => {
    expect(pluralize(2, 'ligne', 'lignes')).toBe('lignes');
  });

  it('renvoie le pluriel pour un grand nombre', () => {
    expect(pluralize(1000, 'ligne', 'lignes')).toBe('lignes');
  });
});
