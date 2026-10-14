import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EnTeteTableau,
  ErreurChargement,
  EtatVide,
  Pastille,
  TableauChargement,
  type ColonneJournal,
} from './elements-tableau';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
const COLONNES: ColonneJournal[] = [{ libelle: 'Date', largeur: 'w-1/5' }, { libelle: 'Compte' }];

function texte(element: ReactElement): string {
  return renderToStaticMarkup(element).replaceAll('<!-- -->', '');
}

describe('EnTeteTableau', () => {
  it('rend un <th scope="col"> par colonne, dans l’ordre', () => {
    const html = texte(
      <table>
        <EnTeteTableau colonnes={COLONNES} />
      </table>,
    );
    const entetes = [...html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(entetes).toEqual(['Date', 'Compte']);
  });

  it('applique la largeur de la colonne', () => {
    const html = texte(
      <table>
        <EnTeteTableau colonnes={COLONNES} />
      </table>,
    );
    expect(html).toMatch(/<th[^>]*w-1\/5[^>]*>Date<\/th>/);
  });
});

describe('TableauChargement', () => {
  const html = () => texte(<TableauChargement colonnes={COLONNES} libelle="Chargement test" />);

  it('est un tableau aria-busy nommé', () => {
    expect(html()).toContain('<table');
    expect(html()).toContain('aria-busy="true"');
    expect(html()).toContain('aria-label="Chargement test"');
  });

  it('conserve l’en-tête et affiche 5 lignes squelettes', () => {
    expect(html()).toContain('>Date</th>');
    const lignes =
      html()
        .match(/<tbody.*<\/tbody>/)?.[0]
        .match(/<tr>/g) ?? [];
    expect(lignes).toHaveLength(5);
  });
});

describe('EtatVide', () => {
  it('affiche le titre en h2 et la légende', () => {
    const html = texte(<EtatVide titre="Rien ici" legende="Revenez plus tard." />);
    expect(html).toMatch(/<h2[^>]*>Rien ici<\/h2>/);
    expect(html).toContain('Revenez plus tard.');
    expect(html).not.toContain('<button');
  });
});

describe('ErreurChargement', () => {
  it('affiche le titre, la cause et un bouton « Réessayer »', () => {
    const html = texte(
      <ErreurChargement titre="Échec" cause="Disque absent" onReessayer={() => {}} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Échec');
    expect(html).toContain('Disque absent');
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>.*Réessayer<\/button>/);
  });
});

describe('Pastille', () => {
  it('rend l’icône puis le texte, avec son infobulle', () => {
    const html = texte(
      <Pastille ton="warning" title="Info bulle" icone={<svg />}>
        Texte
      </Pastille>,
    );
    expect(html).toContain('title="Info bulle"');
    expect(html).toMatch(/<svg><\/svg>Texte<\/span>/);
    expect(html).toContain('text-warning-text');
  });

  it('n’a pas d’infobulle par défaut', () => {
    const html = texte(
      <Pastille ton="info" icone={<svg />}>
        Texte
      </Pastille>,
    );
    expect(html).not.toContain('title=');
  });
});
