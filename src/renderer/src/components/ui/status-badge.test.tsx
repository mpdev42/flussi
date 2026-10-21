import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CircleCheck } from 'lucide-react';
import {
  CountBadge,
  EnvironmentBadge,
  StatusBadge,
  ToneBadge,
  type ToneBadgeTone,
} from './status-badge';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
function html(element: ReactElement): string {
  return renderToStaticMarkup(element).replaceAll('<!-- -->', '');
}

const CLASSES_TON: Record<ToneBadgeTone, string[]> = {
  neutral: ['border-border', 'bg-muted', 'text-neutral-700'],
  info: ['border-info-border', 'bg-info-bg', 'text-info-text'],
  success: ['border-success-border', 'bg-success-bg', 'text-success-text'],
  warning: ['border-warning-border', 'bg-warning-bg', 'text-warning-text'],
  error: ['border-error-border', 'bg-error-bg', 'text-error-text'],
};

describe('ToneBadge', () => {
  it.each(Object.keys(CLASSES_TON) as ToneBadgeTone[])('pose les classes du ton %s', (ton) => {
    const rendu = html(
      <ToneBadge tone={ton} icon={CircleCheck}>
        Texte
      </ToneBadge>,
    );
    const classes = /^<span class="([^"]*)"/.exec(rendu)?.[1].split(' ') ?? [];
    expect(classes).toEqual(expect.arrayContaining(CLASSES_TON[ton]));
  });

  it('rend l’icône masquée aux lecteurs d’écran, puis le texte', () => {
    const rendu = html(
      <ToneBadge tone="success" icon={CircleCheck}>
        Renseigné
      </ToneBadge>,
    );
    expect(rendu).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*<\/svg>Renseigné<\/span>$/);
    expect(rendu).toMatch(/<svg[^>]*width="14"/);
    expect(rendu).toMatch(/<svg[^>]*stroke-width="1.75"/);
  });

  it('pose l’infobulle quand elle est fournie', () => {
    const rendu = html(
      <ToneBadge tone="warning" icon={CircleCheck} title="Info bulle">
        Texte
      </ToneBadge>,
    );
    expect(rendu).toContain('title="Info bulle"');
  });

  it('n’a pas d’infobulle par défaut', () => {
    const rendu = html(
      <ToneBadge tone="info" icon={CircleCheck}>
        Texte
      </ToneBadge>,
    );
    expect(rendu).not.toContain('title=');
  });

  it('rend l’icône transparente au pointeur, la racine garde l’infobulle', () => {
    const rendu = html(
      <ToneBadge tone="warning" icon={CircleCheck} title="Info bulle">
        Texte
      </ToneBadge>,
    );
    expect(classesIcone(rendu)).toContain('pointer-events-none');
    expect(classesRacine(rendu)).not.toContain('pointer-events-none');
  });
});

/** Classes de l'élément racine du rendu. */
function classesRacine(rendu: string): string[] {
  return /^<[a-z]+ class="([^"]*)"/.exec(rendu)?.[1].split(' ') ?? [];
}

/** Classes de la première icône `svg` du rendu. */
function classesIcone(rendu: string): string[] {
  return /<svg[^>]* class="([^"]*)"/.exec(rendu)?.[1].split(' ') ?? [];
}

describe('StatusBadge et EnvironmentBadge', () => {
  it('rendent leur icône transparente au pointeur', () => {
    expect(classesIcone(html(<StatusBadge status="du-jour" />))).toContain('pointer-events-none');
    expect(classesIcone(html(<EnvironmentBadge />))).toContain('pointer-events-none');
  });
});

describe('CountBadge', () => {
  it('est transparent au pointeur (rendu dans des boutons et lignes cliquables)', () => {
    expect(classesRacine(html(<CountBadge count={3} />))).toContain('pointer-events-none');
  });

  it('ne rend rien à 0', () => {
    expect(html(<CountBadge count={0} />)).toBe('');
  });
});
