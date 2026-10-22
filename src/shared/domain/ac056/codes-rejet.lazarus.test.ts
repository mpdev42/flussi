// Parité de la table des codes de rejet avec les sources Lazarus (copies conformes) :
// - `urejetsdescription.pas` : les appels `ajouter_rejet_description(...)` de
//   `charger_rejets_description` (code, recherches et modes) ;
// - `Rejets - Explications.txt` : l'algorithme de `ajouter_rejet_explication` (la ligne qui suit
//   `[ERRxxx]` est sautée, les suivantes forment l'explication). Divergence 12 : ces textes ne sont
//   que des « Aide ERRxxx » provisoires, non repris ; les explications de Flussi sont rédigées et
//   validées par l'utilisateur (`docs/bilan-rejets-2026.md`), figées à l'identique par
//   `codes-rejet.test.ts`.
// La parité porte sur les 27 premiers codes ; `ERR028` et suivants sont propres à Flussi (écart 4
// de la v0.3.0), placés après ceux de Lazarus.
// Ces fichiers ne contiennent que des textes de référence, aucune donnée personnelle.
import { describe, expect, it } from 'vitest';
import { lireSourceLazarus, valeurLitteral } from '@shared/test/source-lazarus';
import { REJETS, type ModeRecherche, type RechercheRejet } from './codes-rejet';

/** Codes repris de Lazarus (les 27 premiers), puis codes propres à Flussi. */
const REJETS_LAZARUS = REJETS.slice(0, 27);
const REJETS_FLUSSI = REJETS.slice(27);

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

const source = lireSourceLazarus('urejetsdescription.pas');
const appels = extraireAppels(source);
const explicationsLazarus = extraireExplications(
  lireSourceLazarus('Rejets - Explications.txt'),
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
  it('contient les mêmes codes, dans le même ordre, en tête de table', () => {
    expect(REJETS_LAZARUS.map((d) => d.code)).toEqual(appels.map((appel) => appel.code));
  });

  it('ajoute les codes propres à Flussi après, à partir d ERR028 et sans trou (écart 4)', () => {
    expect(REJETS_FLUSSI.length).toBeGreaterThan(0);
    expect(REJETS_FLUSSI.map((d) => d.code)).toEqual(
      REJETS_FLUSSI.map((_, i) => `ERR${String(28 + i).padStart(3, '0')}`),
    );
  });

  it('contient les mêmes recherches et les mêmes modes, mot pour mot', () => {
    const ecarts: string[] = [];
    appels.forEach((appel, i) => {
      const obtenu = REJETS_LAZARUS[i]!;
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

describe('Explications : divergence 12 avec Rejets - Explications.txt', () => {
  it('constate que Lazarus n a que des textes provisoires « Aide ERRxxx »', () => {
    const ecarts: string[] = [];
    for (const [code, lignes] of explicationsLazarus) {
      const texte = lignes.join('\n');
      if (texte !== `Aide ${code}`)
        ecarts.push(`${code} : « ${texte} » au lieu de « Aide ${code} »`);
    }
    expect(ecarts).toEqual([]);
  });
});
