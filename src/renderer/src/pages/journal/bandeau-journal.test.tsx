import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BandeauJournal } from './bandeau-journal';

// Rendu statique en environnement node : React insère <!-- --> entre deux nœuds texte adjacents
function rendre(lignesEnAttente: number): string {
  return renderToStaticMarkup(<BandeauJournal lignesEnAttente={lignesEnAttente} />).replaceAll(
    '<!-- -->',
    '',
  );
}

describe('BandeauJournal', () => {
  it('est une alerte (role="alert")', () => {
    expect(rendre(1)).toContain('role="alert"');
  });

  it('affiche le titre « Journal non enregistré »', () => {
    expect(rendre(1)).toContain('Journal non enregistré');
  });

  it('écrit « 1 ligne en attente » au singulier', () => {
    const html = rendre(1);
    expect(html).toContain('1 ligne en attente');
    expect(html).not.toContain('1 lignes');
  });

  it('écrit « 4 lignes en attente » au pluriel', () => {
    expect(rendre(4)).toContain('4 lignes en attente');
  });

  it('conseille de vérifier le lecteur P:', () => {
    expect(rendre(2)).toContain('lecteur P: est connecté');
  });
});
