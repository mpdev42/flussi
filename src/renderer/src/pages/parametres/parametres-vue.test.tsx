import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigurationPublique } from '@shared/types';
import { ParametresVue, type ParametresVueProps } from './parametres-vue';

// Valeurs fictives
const RACINE = 'D:\\Travail\\Flussi';
const CONFIG_JSON = 'C:\\ProgramData\\Flussi\\config.json';
const DOT_ENV = 'C:\\Dev\\flussi\\.env';
const VERSION = '9.8.7';

// Espace insécable avant les deux-points de « Source : »
const SOURCE = 'Source\u00A0:';

function configurationDe(surcharge: Partial<ConfigurationPublique> = {}): ConfigurationPublique {
  return {
    mode: 'recette',
    dossiers: {
      travail: RACINE,
      in: `${RACINE}\\IN`,
      out: `${RACINE}\\OUT`,
      journal: `${RACINE}\\Journal`,
    },
    version: VERSION,
    origines: { fichier: DOT_ENV, mode: 'env', travail: 'env' },
    ...surcharge,
  };
}

// Rendu statique en environnement node : React insère <!-- --> entre deux nœuds texte adjacents
function rendre(props: Partial<ParametresVueProps> = {}): string {
  return renderToStaticMarkup(
    <ParametresVue
      configuration={configurationDe()}
      enCours={null}
      erreur={null}
      onOuvrir={vi.fn()}
      secrets={null}
      {...props}
    />,
  ).replaceAll('<!-- -->', '');
}

function compter(html: string, motif: string): number {
  return html.split(motif).length - 1;
}

const PROD_INSTALLEE = configurationDe({
  mode: 'prod',
  origines: { fichier: CONFIG_JSON, mode: 'config', travail: 'defaut' },
});

describe('ParametresVue — titres', () => {
  it('affiche le h1 « Paramètres » et le h2 « Configuration »', () => {
    const html = rendre();
    expect(html).toMatch(/<h1[^>]*>Paramètres<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>Configuration<\/h2>/);
  });

  it('liste les libellés dans l’ordre : Mode, Dossier de travail, IN, OUT, Journal, Version', () => {
    const libelles = [...rendre().matchAll(/<dt[^>]*>(.*?)<\/dt>/g)].map((m) => m[1]);
    expect(libelles).toEqual(['Mode', 'Dossier de travail', 'IN', 'OUT', 'Journal', 'Version']);
  });
});

describe('ParametresVue — mode', () => {
  it('affiche le badge « Recette » et non « Production » en recette', () => {
    const html = rendre();
    expect(html).toContain('Recette');
    expect(html).not.toContain('Production');
  });

  it('affiche « Production » et pas de badge « Recette » en production', () => {
    const html = rendre({ configuration: PROD_INSTALLEE });
    expect(html).toContain('Production');
    expect(html).not.toContain('Recette');
  });
});

describe('ParametresVue — valeurs affichées', () => {
  it('affiche les chemins des quatre dossiers', () => {
    const html = rendre();
    for (const chemin of [RACINE, `${RACINE}\\IN`, `${RACINE}\\OUT`, `${RACINE}\\Journal`]) {
      expect(html).toContain(`>${chemin}</span>`);
    }
  });

  it('affiche la version', () => {
    expect(rendre()).toContain(`>${VERSION}</span>`);
  });
});

describe('ParametresVue — légendes de source', () => {
  it('config.json : « Source : config.json · {fichier} » pour le mode et le dossier de travail', () => {
    const html = rendre({
      configuration: configurationDe({
        mode: 'prod',
        origines: { fichier: CONFIG_JSON, mode: 'config', travail: 'config' },
      }),
    });
    const legende = `${SOURCE} config.json · <span class="font-mono text-data">${CONFIG_JSON}</span>`;
    expect(compter(html, legende)).toBe(2);
    expect(html).not.toContain('valeur par défaut');
    expect(html).not.toContain('.env (développement)');
  });

  it('défaut : « Source : valeur par défaut (production) » pour le dossier de travail seulement', () => {
    const html = rendre({ configuration: PROD_INSTALLEE });
    expect(compter(html, `${SOURCE} valeur par défaut (production)`)).toBe(1);
    // Le mode vient du fichier même quand la racine vient du défaut
    expect(compter(html, `${SOURCE} config.json · `)).toBe(1);
  });

  it('.env : « Source : fichier .env (développement) · {fichier} » pour le mode et le dossier de travail', () => {
    const html = rendre();
    const legende = `${SOURCE} fichier .env (développement) · <span class="font-mono text-data">${DOT_ENV}</span>`;
    expect(compter(html, legende)).toBe(2);
    expect(html).not.toContain('config.json');
  });

  it('affiche « Sous-dossier du dossier de travail » pour IN, OUT et Journal', () => {
    expect(compter(rendre(), 'Sous-dossier du dossier de travail')).toBe(3);
  });
});

describe('ParametresVue — structure de la liste', () => {
  it('place chaque bouton et chaque légende dans leur propre dd, distinct de celui du chemin', () => {
    const html = rendre();
    const dd = [...html.matchAll(/<dd\b[^>]*>(.*?)<\/dd>/g)].map((m) => m[1]);
    // Les boutons ne partagent jamais un dd avec un chemin
    const avecBouton = dd.filter((contenu) => contenu.includes('<button'));
    expect(avecBouton).toHaveLength(4);
    for (const contenu of avecBouton) expect(contenu).not.toContain('font-mono');
    // Chaque légende est seule dans son dd
    const legendes = dd.filter((contenu) => contenu.startsWith('<p'));
    expect(legendes).toHaveLength(5);
    for (const contenu of legendes) expect(contenu).not.toContain('<button');
  });
});

describe('ParametresVue — boutons d’ouverture', () => {
  const ARIA_LABELS = [
    'Ouvrir dans l&#x27;Explorateur le dossier de travail',
    'Ouvrir dans l&#x27;Explorateur le dossier IN',
    'Ouvrir dans l&#x27;Explorateur le dossier OUT',
    'Ouvrir dans l&#x27;Explorateur le dossier Journal',
  ];

  function boutons(html: string): string[] {
    return [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  }

  it('affiche quatre boutons avec leur aria-label exact', () => {
    const balises = boutons(rendre());
    expect(balises).toHaveLength(4);
    ARIA_LABELS.forEach((label, index) => {
      expect(balises[index]).toContain(`aria-label="${label}"`);
    });
  });

  it('affiche le texte visible « Ouvrir dans l’Explorateur » sur chaque bouton', () => {
    expect(compter(rendre(), 'Ouvrir dans l&#x27;Explorateur</button>')).toBe(4);
  });

  it('actifs quand aucune ouverture n’est en cours', () => {
    for (const balise of boutons(rendre({ enCours: null }))) {
      // Les classes Tailwind `disabled:*` contiennent le mot : on teste l'attribut
      expect(balise).not.toContain('disabled=""');
    }
  });

  it.each(['travail', 'in', 'out', 'journal'] as const)(
    'tous désactivés quand l’ouverture du dossier %s est en cours',
    (dossier) => {
      const balises = boutons(rendre({ enCours: dossier }));
      expect(balises).toHaveLength(4);
      for (const balise of balises) expect(balise).toContain('disabled=""');
    },
  );
});

describe('ParametresVue — indicateur d’ouverture en cours', () => {
  function contenusBoutons(html: string): string[] {
    return [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)].map((m) => m[1]);
  }

  it('affiche le Spinner à la place de l’icône dossier sur le bouton en cours seulement', () => {
    const contenus = contenusBoutons(rendre({ enCours: 'in' }));
    expect(contenus).toHaveLength(4);
    // Ordre des boutons : dossier de travail, IN, OUT, Journal
    expect(contenus[1]).toContain('animate-spin');
    expect(contenus[1]).not.toContain('lucide-folder-open');
    for (const index of [0, 2, 3]) {
      expect(contenus[index]).not.toContain('animate-spin');
      expect(contenus[index]).toContain('lucide-folder-open');
    }
  });

  it('garde le texte visible sur le bouton en cours et masque le Spinner aux lecteurs d’écran', () => {
    const contenus = contenusBoutons(rendre({ enCours: 'in' }));
    expect(contenus[1]).toContain('Ouvrir dans l&#x27;Explorateur');
    expect(contenus[1]).toContain('aria-hidden="true"');
    expect(contenus[1]).not.toContain('role="status"');
  });

  it('n’affiche aucun Spinner quand aucune ouverture n’est en cours', () => {
    expect(rendre({ enCours: null })).not.toContain('animate-spin');
  });
});

describe('ParametresVue — emplacement des secrets', () => {
  it('rend la section secrets sous la carte « Configuration »', () => {
    const html = rendre({ secrets: <section data-testid="secrets">Section secrets</section> });
    const positionConfiguration = html.indexOf('>Configuration</h2>');
    const positionSecrets = html.indexOf('Section secrets');
    expect(positionConfiguration).toBeGreaterThan(-1);
    expect(positionSecrets).toBeGreaterThan(positionConfiguration);
  });

  it('ne rend rien de plus quand secrets vaut null', () => {
    expect(rendre({ secrets: null })).not.toContain('Secrets techniques');
  });
});

describe('ParametresVue — erreur d’ouverture', () => {
  const TITRE = 'Le dossier n&#x27;a pas pu être ouvert';

  it('n’affiche aucune alerte sans erreur', () => {
    const html = rendre({ erreur: null });
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain(TITRE);
  });

  it('affiche l’alerte avec son titre et le message', () => {
    const html = rendre({ erreur: 'Accès refusé (simulé)' });
    expect(html).toContain('role="alert"');
    expect(html).toContain(TITRE);
    expect(html).toContain('Accès refusé (simulé)');
  });
});
