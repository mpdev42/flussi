import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Alert, AlertDescription } from './alert';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
function html(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

/** Classes de l'élément racine, entités HTML décodées (`[&>svg]:…`). */
function classes(element: ReactElement): string[] {
  const brut = /^<div[^>]*class="([^"]*)"/.exec(html(element))?.[1] ?? '';
  return brut.replaceAll('&gt;', '>').replaceAll('&amp;', '&').split(' ');
}

const BASE =
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7';

const TONS = ['info', 'success', 'warning', 'error'] as const;

describe('Alert, variantes de ton', () => {
  it.each(TONS)('la variante %s pose les jetons de son ton', (ton) => {
    const liste = classes(<Alert variant={ton}>Message</Alert>);
    expect(liste).toEqual(
      expect.arrayContaining([
        `border-${ton}-border`,
        `bg-${ton}-bg`,
        `text-${ton}-text`,
        `[&>svg]:text-${ton}-text`,
      ]),
    );
  });

  it.each(TONS)('la variante %s remplace la couleur d’icône par défaut', (ton) => {
    expect(classes(<Alert variant={ton}>Message</Alert>)).not.toContain('[&>svg]:text-foreground');
  });
});

describe('Alert, variantes shadcn inchangées', () => {
  it('default garde ses classes', () => {
    expect(classes(<Alert>Message</Alert>).join(' ')).toBe(`${BASE} bg-background text-foreground`);
    expect(classes(<Alert variant="default">Message</Alert>).join(' ')).toBe(
      `${BASE} bg-background text-foreground`,
    );
  });

  it('destructive garde ses classes', () => {
    expect(classes(<Alert variant="destructive">Message</Alert>).join(' ')).toBe(
      'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    );
  });
});

describe('Alert, rôle', () => {
  it('a le rôle alert par défaut', () => {
    expect(html(<Alert variant="error">Message</Alert>)).toMatch(/^<div role="alert"/);
  });

  it('accepte un autre rôle (status, note)', () => {
    const statut = html(
      <Alert variant="success" role="status">
        <AlertDescription>Enregistré</AlertDescription>
      </Alert>,
    );
    expect(statut).toMatch(/^<div role="status"/);
    expect(statut).not.toContain('role="alert"');
    expect(html(<Alert role="note">Message</Alert>)).toMatch(/^<div role="note"/);
  });
});
