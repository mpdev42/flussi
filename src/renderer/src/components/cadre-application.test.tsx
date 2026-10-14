import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CadreApplication, type CadreApplicationProps } from './cadre-application';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit.
// React insère <!-- --> entre deux nœuds texte adjacents : on les retire pour comparer le texte.
function rendre(props: Partial<CadreApplicationProps> = {}): string {
  const html = renderToStaticMarkup(
    <CadreApplication
      environnement="recette"
      version="1.2.3"
      navigation={[{ id: 'accueil', libelle: 'Accueil' }]}
      actif="accueil"
      onNaviguer={() => {}}
      {...props}
    >
      <p>Contenu de l’écran</p>
    </CadreApplication>,
  );
  return html.replaceAll('<!-- -->', '');
}

describe('CadreApplication — recette', () => {
  it('affiche le bandeau de recette', () => {
    const html = rendre({ environnement: 'recette' });
    expect(html).toContain('role="note"');
    expect(html).toContain('aria-label="Environnement de recette"');
  });

  it('affiche le badge Recette dans l’en-tête', () => {
    const html = rendre({ environnement: 'recette' });
    expect(html).toMatch(/<\/svg>Recette<\/span>/);
  });

  it('affiche « Environnement : Recette »', () => {
    expect(rendre({ environnement: 'recette' })).toContain('Environnement : Recette');
  });
});

describe('CadreApplication — production', () => {
  it('n’affiche ni bandeau ni badge de recette', () => {
    const html = rendre({ environnement: 'prod' });
    expect(html).not.toContain('role="note"');
    expect(html).not.toContain('aria-label="Environnement de recette"');
    expect(html).not.toContain('Recette');
  });

  it('affiche « Environnement : Production »', () => {
    expect(rendre({ environnement: 'prod' })).toContain('Environnement : Production');
  });
});

describe('CadreApplication — en-tête et navigation', () => {
  it('affiche la version : « Flussi 1.2.3 »', () => {
    expect(rendre({ version: '1.2.3' })).toContain('Flussi 1.2.3');
  });

  it('marque l’entrée active avec aria-current="page"', () => {
    const html = rendre({
      navigation: [
        { id: 'accueil', libelle: 'Accueil' },
        { id: 'journal', libelle: 'Journal' },
      ],
      actif: 'journal',
    });
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*aria-current="page"[^>]*>Journal<\/button>/);
    expect(html).toMatch(/<button(?![^>]*aria-current)[^>]*>Accueil<\/button>/);
  });

  it('n’active aucune entrée si l’identifiant actif est inconnu', () => {
    expect(rendre({ actif: 'inconnu' })).not.toContain('aria-current');
  });

  it('accepte une navigation vide', () => {
    const html = rendre({ navigation: [], actif: '' });
    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).not.toContain('<button');
    expect(html).toContain('Contenu de l’écran');
  });

  it('rend l’écran courant dans la zone principale', () => {
    expect(rendre()).toMatch(/<main[^>]*><p>Contenu de l’écran<\/p><\/main>/);
  });
});
