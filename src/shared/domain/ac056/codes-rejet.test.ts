import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CODES_REJET,
  MESSAGE_REJET_INCONNU,
  REJETS,
  identifierRejet,
  type DescriptionRejet,
} from './codes-rejet';

/**
 * Explications du tableau « Explications validées » de `docs/bilan-rejets-2026.md` (colonnes Code
 * et Explication), par code. Une explication qui commence par « Aucune explication » vaut null.
 */
function explicationsValidees(): Map<string, string | null> {
  const chemin = new URL('../../../../docs/bilan-rejets-2026.md', import.meta.url);
  const texte = readFileSync(chemin, 'utf8');
  const debut = texte.indexOf('## Explications validées');
  if (debut < 0) throw new Error('Section « Explications validées » absente');
  const fin = texte.indexOf('\n## ', debut + 1);
  const section = texte.slice(debut, fin < 0 ? undefined : fin);
  const explications = new Map<string, string | null>();
  for (const [, code, explication] of section.matchAll(/^\| `(ERR\d{3})` \| (.*) \|\r?$/gmu)) {
    if (explications.has(code!)) throw new Error(`${code} en double dans le tableau`);
    explications.set(code!, explication!.startsWith('Aucune explication') ? null : explication!);
  }
  return explications;
}

const RANG_MODE = { debut: 0, egalite: 0, contenu: 1, fin: 2 } as const;

/** Message synthétique : les textes des recherches séparés par des valeurs, début en tête, fin en queue. */
function messageDepuis(description: DescriptionRejet): string {
  return [...description.recherches]
    .sort((a, b) => RANG_MODE[a.mode] - RANG_MODE[b.mode])
    .map((recherche) => recherche.texte)
    .join(' 123 ');
}

function description(code: string): DescriptionRejet {
  const trouvee = REJETS.find((d) => d.code === code);
  if (trouvee === undefined) throw new Error(`Code ${code} absent de la table`);
  return trouvee;
}

describe('Table des codes de rejet', () => {
  it('contient les 34 codes ERR001 à ERR034, uniques, dans l’ordre et sans trou', () => {
    expect(CODES_REJET).toHaveLength(34);
    expect(new Set(CODES_REJET).size).toBe(34);
    expect(CODES_REJET[0]).toBe('ERR001');
    expect(CODES_REJET[26]).toBe('ERR027');
    expect(CODES_REJET[33]).toBe('ERR034');
    expect(REJETS.map((d) => d.code)).toEqual([...CODES_REJET]);
    expect(CODES_REJET).toEqual(
      Array.from({ length: 34 }, (_, i) => `ERR${String(i + 1).padStart(3, '0')}`),
    );
  });

  it('décrit chaque code par 1 à 3 recherches non vides', () => {
    for (const d of REJETS) {
      expect(d.recherches.length, d.code).toBeGreaterThanOrEqual(1);
      expect(d.recherches.length, d.code).toBeLessThanOrEqual(3);
      for (const recherche of d.recherches) expect(recherche.texte, d.code).not.toBe('');
    }
  });

  it('reprend à l identique les 33 explications validées de docs/bilan-rejets-2026.md', () => {
    const validees = explicationsValidees();
    expect([...validees.keys()]).toEqual([...CODES_REJET]);
    expect([...validees.values()].filter((e) => e !== null)).toHaveLength(33);
    const ecarts = REJETS.filter((d) => d.explication !== validees.get(d.code)).map((d) => d.code);
    expect(ecarts).toEqual([]);
  });

  it('n a aucune explication pour ERR030 (décision de l utilisateur)', () => {
    expect(description('ERR030').explication).toBeNull();
  });

  it('donne à tout autre code une explication rédigée pour Flussi (divergence 12)', () => {
    const ecarts = REJETS.filter((d) => d.code !== 'ERR030').flatMap((d) => {
      if (d.explication === null) return [`${d.code} : sans explication`];
      if (d.explication.trim() === '') return [`${d.code} : explication vide`];
      if (d.explication === `Aide ${d.code}`) return [`${d.code} : texte provisoire de Lazarus`];
      return [];
    });
    expect(ecarts).toEqual([]);
  });

  it('donne à ERR029 la même explication qu ERR015 (variante accentuée)', () => {
    expect(description('ERR029').explication).toBe(description('ERR015').explication);
  });

  describe('gel en profondeur', () => {
    it('gèle le tableau', () => {
      expect(Object.isFrozen(REJETS)).toBe(true);
    });

    it('gèle chaque description', () => {
      expect(REJETS.filter((d) => !Object.isFrozen(d)).map((d) => d.code)).toEqual([]);
    });

    it('gèle la liste des recherches de chaque description', () => {
      expect(REJETS.filter((d) => !Object.isFrozen(d.recherches)).map((d) => d.code)).toEqual([]);
    });

    it('gèle chaque recherche', () => {
      const nonGelees = REJETS.flatMap((d) =>
        d.recherches.filter((r) => !Object.isFrozen(r)).map(() => d.code),
      );
      expect(nonGelees).toEqual([]);
    });

    it('refuse en mode strict la modification d’une description, d’une liste et d’une recherche', () => {
      const d = REJETS[0]!;
      const explication = d.explication;
      expect(() => {
        (d as { explication: string | null }).explication = 'autre';
      }).toThrow(TypeError);
      expect(() => (d.recherches as unknown[]).push({})).toThrow(TypeError);
      expect(() => {
        (d.recherches[0] as { texte: string }).texte = 'autre';
      }).toThrow(TypeError);
      expect(() => (REJETS as unknown[]).push({})).toThrow(TypeError);
      expect(d.explication).toBe(explication);
    });
  });
});

describe('Identification d’un rejet', () => {
  it.each(REJETS.map((d) => [d.code, d] as const))(
    'reconnaît %s par un message construit à partir de ses recherches',
    (code, d) => {
      expect(identifierRejet(messageDepuis(d))).toEqual({ code, explication: d.explication });
    },
  );

  it('reconnaît un message composé du seul texte de début (recherche unique)', () => {
    const d = description('ERR009');
    expect(identifierRejet(`${d.recherches[0]!.texte} pour le contrat 42`).code).toBe('ERR009');
  });

  describe('modes de recherche', () => {
    it('début : le message doit commencer par le texte', () => {
      const texte = description('ERR009').recherches[0]!.texte;
      expect(identifierRejet(`${texte} suite`).code).toBe('ERR009');
      expect(identifierRejet(`XX ${texte}`).code).toBeNull();
    });

    it('début : un espace de tête fait échouer la recherche', () => {
      const texte = description('ERR009').recherches[0]!.texte;
      expect(identifierRejet(` ${texte}`).code).toBeNull();
    });

    it('contenu : le texte peut se trouver n’importe où après le début', () => {
      const [d1, d2] = description('ERR015').recherches; // début + contenu
      expect(d2!.mode).toBe('contenu');
      expect(identifierRejet(`${d1!.texte} 1 ${d2!.texte} suite`).code).toBe('ERR015');
      expect(identifierRejet(`${d1!.texte} 1 ${d2!.texte}`).code).toBe('ERR015');
      expect(identifierRejet(`${d1!.texte} 1 absent`).code).toBeNull();
    });

    it('fin : le message doit se terminer par le texte', () => {
      const [d1, d2] = description('ERR006').recherches;
      expect(d2!.mode).toBe('fin');
      expect(identifierRejet(`${d1!.texte} 1 ${d2!.texte}`).code).toBe('ERR006');
      expect(identifierRejet(`${d1!.texte} 1 ${d2!.texte} `).code).toBeNull();
      expect(identifierRejet(`${d1!.texte} 1 ${d2!.texte} suite`).code).toBeNull();
    });

    it('égalité : le message doit être strictement égal au texte', () => {
      const texte = description('ERR021').recherches[0]!.texte;
      expect(description('ERR021').recherches[0]!.mode).toBe('egalite');
      expect(identifierRejet(texte).code).toBe('ERR021');
      expect(identifierRejet(`${texte} `).code).toBeNull();
      expect(identifierRejet(` ${texte}`).code).toBeNull();
      expect(identifierRejet(`${texte}.`).code).toBeNull();
    });

    it('est sensible à la casse et aux doubles espaces, sans aucune normalisation', () => {
      const texte = description('ERR001').recherches[0]!.texte;
      expect(texte).toContain('Acte de gestion  Modification');
      expect(identifierRejet(texte).code).toBe('ERR001');
      expect(identifierRejet(texte.toUpperCase()).code).toBeNull();
      expect(identifierRejet(texte.replace('  ', ' ')).code).toBeNull();
    });

    it('exige toutes les recherches : une seule absente suffit à écarter le code', () => {
      const d = description('ERR022');
      expect(d.recherches.map((r) => r.mode)).toEqual(['debut', 'contenu', 'fin']);
      const [r1, r2, r3] = d.recherches.map((r) => r.texte);
      expect(identifierRejet(`${r1} 1 ${r2} 2 ${r3}`).code).toBe('ERR022');
      expect(identifierRejet(`${r1} 1 ${r3}`).code).toBeNull();
      expect(identifierRejet(`${r1} 1 ${r2} 2`).code).toBeNull();
      expect(identifierRejet(`1 ${r2} 2 ${r3}`).code).toBeNull();
    });
  });

  describe('rejet inconnu (divergence 10)', () => {
    it('renvoie null et le message d’erreur inconnue pour un message vide', () => {
      expect(identifierRejet('')).toEqual({ code: null, explication: MESSAGE_REJET_INCONNU });
    });

    it('renvoie null et le message d’erreur inconnue pour un message non reconnu', () => {
      expect(identifierRejet('Message sans rapport')).toEqual({
        code: null,
        explication: MESSAGE_REJET_INCONNU,
      });
    });

    it('ne rogne pas le message : des espaces seuls ne correspondent à aucun code', () => {
      expect(identifierRejet('   ').code).toBeNull();
    });

    it('formule le message d’erreur inconnue comme Lazarus', () => {
      expect(MESSAGE_REJET_INCONNU).toBe('Erreur inconnue. Contactez le service informatique.');
    });
  });

  describe('premier code gagnant', () => {
    it('ERR010 l’emporte sur ERR027 quand le message satisfait les deux', () => {
      const e10 = description('ERR010').recherches.map((r) => r.texte);
      const e27 = description('ERR027').recherches.map((r) => r.texte);
      // Même début et même 2e recherche : seule la 3e les distingue.
      expect(e10.slice(0, 2)).toEqual(e27.slice(0, 2));
      const message = `${e10[0]} 1 ${e10[1]} 2 ${e10[2]} 3 ${e27[2]}`;
      expect(identifierRejet(message).code).toBe('ERR010');
    });

    it('ERR027 est reconnu dès que la 3e recherche d’ERR010 est absente', () => {
      const e27 = description('ERR027').recherches.map((r) => r.texte);
      expect(identifierRejet(`${e27[0]} 1 ${e27[1]} 2 ${e27[2]}`).code).toBe('ERR027');
    });

    it('ERR013 l’emporte sur ERR014 quand le message satisfait les deux', () => {
      const e13 = description('ERR013').recherches.map((r) => r.texte);
      const e14 = description('ERR014').recherches.map((r) => r.texte);
      expect(e13[0]).toBe(e14[0]);
      // ERR013 : début + fin ; ERR014 : début + deux contenus.
      const message = `${e14[0]} 1 ${e14[1]} 2 ${e14[2]} 3 ${e13[1]}`;
      expect(identifierRejet(message).code).toBe('ERR013');
    });

    it('ERR014 est reconnu dès que le message ne se termine pas comme ERR013', () => {
      const e14 = description('ERR014').recherches.map((r) => r.texte);
      expect(identifierRejet(`${e14[0]} 1 ${e14[1]} 2 ${e14[2]}`).code).toBe('ERR014');
    });
  });

  // Messages fictifs, calqués sur les formes relevées dans `docs/bilan-rejets-2026.md` (aucune
  // valeur réelle : dates, contrats et rangs inventés).
  describe('codes propres à Flussi (ERR028 à ERR034)', () => {
    const traversabilite = (acte: string): string =>
      `L'acte de gestion ${acte} en date d'effet 01/01/2000 n'est pas autorisé (traversabilité) pour le contrat 0000001`;

    it.each(['ACRE', 'ACRC', 'ACMC', 'XXXX'])(
      'reconnaît ERR028 pour l acte de gestion %s non autorisé (traversabilité)',
      (acte) => {
        expect(identifierRejet(traversabilite(acte)).code).toBe('ERR028');
      },
    );

    it('garde ERR011 prioritaire pour l acte de gestion ACMA, qui satisfait aussi ERR028', () => {
      const message = traversabilite('ACMA');
      const e28 = description('ERR028').recherches;
      expect(e28.map((r) => r.mode)).toEqual(['debut', 'contenu', 'contenu']);
      expect(message.startsWith(e28[0]!.texte)).toBe(true);
      expect(e28.slice(1).every((r) => message.includes(r.texte))).toBe(true);
      expect(identifierRejet(message)).toEqual({
        code: 'ERR011',
        explication: description('ERR011').explication,
      });
    });

    it('distingue ERR015 (« a la date d effet ») et ERR029 (« à la date d effet »)', () => {
      const debutMessage = "Le contrat 0000001 n'existe pas, ou bien n'est pas valide";
      const suite = " la date d'effet de l'opération 01/01/2000";
      expect(identifierRejet(`${debutMessage} a${suite}`).code).toBe('ERR015');
      expect(identifierRejet(`${debutMessage} à${suite}`).code).toBe('ERR029');
    });

    it('distingue ERR022 (« assuré », radiation de garantie) et ERR030 (« assure », seul assuré)', () => {
      expect(
        identifierRejet(
          "Pour l'assuré 01 du contrat 0000001 radiation de garantie impossible, un assuré doit avoir au moins une garantie valide a la date d'effet de l'operation",
        ).code,
      ).toBe('ERR022');
      expect(
        identifierRejet(
          "Pour l'assure 01 du contrat 0000001 radiation impossible, c'est le seul assure valide a la date d'effet de l'operation",
        ),
      ).toEqual({ code: 'ERR030', explication: null });
    });

    it('reconnaît ERR031 (changement de couverture), sans le confondre avec ERR001 à ERR003', () => {
      expect(
        identifierRejet(
          "Acte de gestion Changement de couverture non traversable pour l'assuré de rang : 01 ,contrat : 0000001",
        ).code,
      ).toBe('ERR031');
      expect(
        identifierRejet(
          "Acte de gestion  Changement de couverture non traversable pour l'assuré de rang : 01 ,contrat : 0000001",
        ).code,
      ).toBe('ERR031');
      // Même début « Acte de gestion » : ERR002 exige la double espace de Lazarus, ERR031 ne prend
      // que le changement de couverture. La variante à une espace d'ERR002 n'a aucun code.
      expect(
        identifierRejet(
          "Acte de gestion Radiation d assure non traversable pour l'assuré de rang : 01 ,contrat : 0000001",
        ).code,
      ).toBeNull();
    });

    it('reconnaît ERR032 (doublon du rôle assuré)', () => {
      expect(
        identifierRejet(
          'Doublon role ASSURE (ENTITE 400) pour la personne de rang evt 01 du contrat 0000001',
        ).code,
      ).toBe('ERR032');
    });

    it('distingue ERR004 et ERR033 (deux échecs de réactivation du contrat)', () => {
      const e04 = description('ERR004').recherches.map((r) => r.texte);
      expect(identifierRejet(`${e04[0]} 0000001 , ${e04[1]} 99`).code).toBe('ERR004');
      expect(
        identifierRejet(
          'Contrat 0000001 , échec de la réactivation du contrat. Valeur du code retour du SAD de réactivation contrat 99',
        ).code,
      ).toBe('ERR033');
    });

    it('reconnaît ERR034 (sélection de la personne interdite)', () => {
      expect(identifierRejet('Sélection de la personne interdite 0000001').code).toBe('ERR034');
    });
  });

  it('renvoie un résultat gelé', () => {
    expect(Object.isFrozen(identifierRejet('Message sans rapport'))).toBe(true);
    expect(Object.isFrozen(identifierRejet(messageDepuis(description('ERR009'))))).toBe(true);
    expect(Object.isFrozen(identifierRejet(''))).toBe(true);
  });
});
