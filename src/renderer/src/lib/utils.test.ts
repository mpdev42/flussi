import { describe, expect, it } from 'vitest';
import { cn } from './utils';

// Les tokens de la charte déclarés dans tailwind.config.js doivent l'être aussi pour
// tailwind-merge : sinon une classe est supprimée à tort, ou ne remplace pas sa concurrente.

describe('cn — tokens de la charte conservés', () => {
  it.each([
    ['tracking-heading', 'text-sm'],
    ['tracking-caption', 'text-xs'],
    ['w-panel-log', 'shrink-0'],
    ['w-panel-nav', 'shrink-0'],
    ['grid-cols-ac056', 'gap-0'],
    ['scrollbar-fin', 'overflow-y-auto'],
    ['max-w-content', 'mx-auto'],
    ['bg-header', 'text-on-brand'],
    ['text-on-brand', 'text-sm'],
    ['text-body-sm', 'text-neutral-700'],
  ])('garde %s à côté de %s', (token, autre) => {
    expect(cn(token, autre).split(' ')).toEqual([token, autre]);
  });
});

describe('cn — tokens de la charte reconnus dans leur groupe', () => {
  it.each([
    ['tracking-tight', 'tracking-heading'],
    ['tracking-heading', 'tracking-caption'],
    ['w-full', 'w-panel-log'],
    ['w-full', 'w-panel-nav'],
    ['w-panel-log', 'w-panel-nav'],
    ['grid-cols-2', 'grid-cols-ac056'],
    ['max-w-prose', 'max-w-content'],
    ['max-w-content', 'max-w-dialog-sm'],
    ['bg-navy-700', 'bg-header'],
    ['text-white', 'text-on-brand'],
    ['h-9', 'h-control-md'],
  ])('%s est remplacé par %s', (avant, apres) => {
    expect(cn(avant, apres)).toBe(apres);
  });
});
