import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelecteursPeriode, type SelecteursPeriodeProps } from './selecteurs-periode';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
function rendre(props: Partial<SelecteursPeriodeProps> = {}): string {
  const html = renderToStaticMarkup(
    <SelecteursPeriode
      annees={['2024', '2025', '2026']}
      annee="2026"
      mois="10"
      onChoisirAnnee={() => {}}
      onChoisirMois={() => {}}
      {...props}
    />,
  );
  return html.replaceAll('<!-- -->', '');
}

/** HTML interne du groupe `role="group"` de nom accessible donné. */
function groupe(html: string, nom: string): string {
  const match = new RegExp(`<div role="group" aria-label="${nom}"[^>]*>(.*?)</div>`).exec(html);
  if (!match) throw new Error(`Groupe « ${nom} » introuvable`);
  return match[1] as string;
}

function boutons(contenu: string): string[] {
  return contenu.match(/<button[^>]*>.*?<\/button>/g) ?? [];
}

describe('SelecteursPeriode — années', () => {
  it('expose un groupe « Année » et un groupe « Mois »', () => {
    const html = rendre();
    expect(html).toContain('<div role="group" aria-label="Année"');
    expect(html).toContain('<div role="group" aria-label="Mois"');
  });

  it('affiche un bouton par année fournie, dans l’ordre', () => {
    const annees = boutons(groupe(rendre(), 'Année')).map((b) => b.replace(/<[^>]+>/g, ''));
    expect(annees).toEqual(['2024', '2025', '2026']);
  });

  it('suit exactement la liste d’années fournie', () => {
    expect(boutons(groupe(rendre({ annees: ['2026'] }), 'Année'))).toHaveLength(1);
  });

  it('marque seulement l’année sélectionnée avec aria-pressed="true"', () => {
    const annees = boutons(groupe(rendre({ annee: '2025' }), 'Année'));
    const pressees = annees.filter((b) => b.includes('aria-pressed="true"'));
    expect(pressees).toHaveLength(1);
    expect(pressees[0]).toContain('>2025</button>');
    expect(annees.filter((b) => b.includes('aria-pressed="false"'))).toHaveLength(2);
  });
});

describe('SelecteursPeriode — mois', () => {
  it('affiche toujours 12 boutons de mois', () => {
    expect(boutons(groupe(rendre(), 'Mois'))).toHaveLength(12);
    expect(boutons(groupe(rendre({ annees: [] }), 'Mois'))).toHaveLength(12);
  });

  it('donne aux boutons le nom accessible « Janvier » … « Décembre »', () => {
    const noms = boutons(groupe(rendre(), 'Mois')).map((b) => /aria-label="([^"]+)"/.exec(b)?.[1]);
    expect(noms).toEqual([
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ]);
  });

  it('affiche le texte abrégé « Janv. » … « Déc. »', () => {
    const textes = boutons(groupe(rendre(), 'Mois')).map((b) => b.replace(/<[^>]+>/g, ''));
    expect(textes).toEqual([
      'Janv.',
      'Févr.',
      'Mars',
      'Avr.',
      'Mai',
      'Juin',
      'Juil.',
      'Août',
      'Sept.',
      'Oct.',
      'Nov.',
      'Déc.',
    ]);
  });

  it('marque seulement le mois sélectionné avec aria-pressed="true"', () => {
    const mois = boutons(groupe(rendre({ mois: '03' }), 'Mois'));
    const pressees = mois.filter((b) => b.includes('aria-pressed="true"'));
    expect(pressees).toHaveLength(1);
    expect(pressees[0]).toContain('aria-label="Mars"');
    expect(mois.filter((b) => b.includes('aria-pressed="false"'))).toHaveLength(11);
  });

  it('ne marque aucun mois si le mois sélectionné est inconnu', () => {
    const mois = boutons(groupe(rendre({ mois: '13' }), 'Mois'));
    expect(mois.some((b) => b.includes('aria-pressed="true"'))).toBe(false);
  });
});

describe('SelecteursPeriode — structure', () => {
  it('n’utilise aucun <select>', () => {
    expect(rendre()).not.toContain('<select');
  });

  it('ne contient que des boutons de type button', () => {
    const html = rendre();
    const tous = html.match(/<button[^>]*>/g) ?? [];
    expect(tous).toHaveLength(3 + 12);
    expect(tous.every((b) => b.includes('type="button"'))).toBe(true);
  });
});
