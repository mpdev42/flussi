// Parité de la table des codes de rejet avec les sources Lazarus (copies conformes) :
// - `urejetsdescription.pas` : les appels `ajouter_rejet_description(...)` de
//   `charger_rejets_description` (code, recherches et modes) ;
// - `Rejets - Explications.txt` : l'algorithme de `ajouter_rejet_explication` (la ligne qui suit
//   `[ERRxxx]` est sautée, les suivantes forment l'explication).
// Ces fichiers ne contiennent que des textes de référence, aucune donnée personnelle.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REJETS, type ModeRecherche, type RechercheRejet } from './codes-rejet';

const DOSSIER_LAZARUS = '../../../../docs/reference/lazarus/';
const CHEMIN_DESCRIPTION = fileURLToPath(
  new URL(`${DOSSIER_LAZARUS}urejetsdescription.pas`, import.meta.url),
);
const CHEMIN_EXPLICATIONS = fileURLToPath(
  new URL(`${DOSSIER_LAZARUS}Rejets - Explications.txt`, import.meta.url),
);

const MODES: Readonly<Record<string, ModeRecherche | null>> = {
  REJET_START: 'debut',
  REJET_IN: 'contenu',
  REJET_END: 'fin',
  REJET_ALL: 'egalite',
  REJET_NONE: null,
};

interface AppelLazarus {
  readonly code: string;
  readonly recherches: readonly (RechercheRejet | null)[];
}

/** Lit un fichier de référence UTF-8 sans BOM. */
function lireUtf8(chemin: string): string {
  const texte = readFileSync(chemin, 'utf8');
  if (texte.startsWith('﻿') || texte.includes('�')) {
    throw new Error(`${chemin} : UTF-8 sans BOM attendu`);
  }
  return texte;
}

/** Littéral Pascal `'...'` (apostrophe doublée) vers sa valeur. */
function valeurLitteral(litteral: string): string {
  return litteral.slice(1, -1).replaceAll("''", "'");
}

/** Les 27 appels de `charger_rejets_description`, dans l'ordre du source. */
function extraireAppels(source: string): AppelLazarus[] {
  const litteral = "('(?:[^']|'')*')";
  const mode = '(REJET_\\w+)';
  const motif = new RegExp(
    `ajouter_rejet_description\\(\\s*${[litteral, litteral, litteral, litteral].join('\\s*,\\s*')}` +
      `\\s*,\\s*${[mode, mode, mode].join('\\s*,\\s*')}\\s*\\)`,
    'g',
  );
  return [...source.matchAll(motif)].map((m) => {
    const textes = [m[2]!, m[3]!, m[4]!].map(valeurLitteral);
    const modes = [m[5]!, m[6]!, m[7]!].map((nom) => {
      const mode = MODES[nom];
      if (mode === undefined) throw new Error(`Mode inconnu : ${nom}`);
      return mode;
    });
    return {
      code: valeurLitteral(m[1]!),
      recherches: textes.map((texte, i) => {
        const mode = modes[i]!;
        // Recherche vide si et seulement si REJET_NONE (sinon Lazarus la traiterait autrement).
        if ((texte === '') !== (mode === null)) {
          throw new Error(
            `${valeurLitteral(m[1]!)} : recherche ${i + 1} incohérente avec son mode`,
          );
        }
        return mode === null ? null : { texte, mode };
      }),
    };
  });
}

/**
 * `ajouter_rejet_explication` appliquée à chaque ligne : lignes vides ignorées, `[ERRxxx]` ouvre
 * une section, la première ligne non vide qui suit est sautée, les suivantes sont l'explication.
 * Renvoie les lignes d'explication de chaque code (Lazarus ajoute `#10#13` après chacune).
 */
function extraireExplications(contenu: string, codes: readonly string[]): Map<string, string[]> {
  const explications = new Map<string, string[]>(codes.map((code) => [code, []]));
  let courant: string | null = null;
  let aSauter = false;

  for (const ligne of contenu.split(/\r?\n/)) {
    if (ligne === '') continue;
    if (ligne.startsWith('[')) {
      const code = ligne.slice(1, 7);
      if (!explications.has(code)) throw new Error(`Section ${ligne} : code inconnu`);
      courant = code;
      aSauter = true;
      continue;
    }
    if (courant === null) continue;
    if (aSauter) {
      aSauter = false;
      continue;
    }
    explications.get(courant)!.push(ligne);
  }
  return explications;
}

const source = lireUtf8(CHEMIN_DESCRIPTION);
const appels = extraireAppels(source);
const explicationsLazarus = extraireExplications(
  lireUtf8(CHEMIN_EXPLICATIONS),
  appels.map((appel) => appel.code),
);

describe('Parseur des sources Lazarus des rejets', () => {
  it('trouve les 27 appels de ajouter_rejet_description', () => {
    expect(appels).toHaveLength(27);
    expect(appels[0]!.code).toBe('ERR001');
    expect(appels[26]!.code).toBe('ERR027');
  });

  it('lit les littéraux Pascal (apostrophe doublée) et les doubles espaces', () => {
    expect(valeurLitteral("'l''assuré'")).toBe("l'assuré");
    expect(valeurLitteral("'a  b'")).toBe('a  b');
    expect(valeurLitteral("''")).toBe('');
    expect(appels[7]!.recherches[1]!.texte).toContain("d'un  jumeau");
  });

  it('lit les sections du fichier d’explications', () => {
    expect(explicationsLazarus.size).toBe(27);
    for (const [code, lignes] of explicationsLazarus) {
      expect(lignes.length, `lignes d'explication de ${code}`).toBeGreaterThan(0);
    }
  });
});

describe('Parité de la table REJETS avec urejetsdescription.pas', () => {
  it('contient les mêmes codes, dans le même ordre', () => {
    expect(REJETS.map((d) => d.code)).toEqual(appels.map((appel) => appel.code));
  });

  it('contient les mêmes recherches et les mêmes modes, mot pour mot', () => {
    const ecarts: string[] = [];
    appels.forEach((appel, i) => {
      const obtenu = REJETS[i]!;
      const attendu = appel.recherches.filter((r): r is RechercheRejet => r !== null);
      if (obtenu.code !== appel.code) {
        ecarts.push(`rang ${i + 1} : code attendu ${appel.code}, obtenu ${obtenu.code}`);
        return;
      }
      if (obtenu.recherches.length !== attendu.length) {
        ecarts.push(
          `${appel.code} : ${attendu.length} recherche(s) attendue(s), ${obtenu.recherches.length} obtenue(s)`,
        );
      }
      attendu.forEach((recherche, n) => {
        const trouvee = obtenu.recherches[n];
        if (trouvee?.mode !== recherche.mode) {
          ecarts.push(
            `${appel.code} recherche ${n + 1} : mode attendu ${recherche.mode}, obtenu ${trouvee?.mode}`,
          );
        }
        if (trouvee?.texte !== recherche.texte) {
          ecarts.push(
            `${appel.code} recherche ${n + 1} : texte attendu « ${recherche.texte} », obtenu « ${trouvee?.texte} »`,
          );
        }
      });
    });
    expect(ecarts).toEqual([]);
  });

  it('place les recherches vides (REJET_NONE) uniquement en fin de liste', () => {
    for (const appel of appels) {
      const vides = appel.recherches.map((r) => r === null);
      expect(vides, appel.code).toEqual([...vides].sort((a, b) => Number(a) - Number(b)));
    }
  });
});

describe('Parité des explications avec Rejets - Explications.txt', () => {
  it('reprend les lignes d’explication de chaque code, jointes par un saut de ligne', () => {
    const ecarts: string[] = [];
    for (const description of REJETS) {
      const attendu = (explicationsLazarus.get(description.code) ?? []).join('\n');
      if (description.explication !== attendu) {
        ecarts.push(
          `${description.code} : explication attendue « ${attendu} », obtenue « ${description.explication} »`,
        );
      }
    }
    expect(ecarts).toEqual([]);
  });
});
