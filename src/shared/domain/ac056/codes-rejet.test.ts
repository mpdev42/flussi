import { describe, expect, it } from 'vitest';
import {
  CODES_REJET,
  MESSAGE_REJET_INCONNU,
  REJETS,
  identifierRejet,
  type DescriptionRejet,
} from './codes-rejet';

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
  it('contient les 27 codes ERR001 à ERR027, uniques et dans l’ordre', () => {
    expect(CODES_REJET).toHaveLength(27);
    expect(new Set(CODES_REJET).size).toBe(27);
    expect(CODES_REJET[0]).toBe('ERR001');
    expect(CODES_REJET[26]).toBe('ERR027');
    expect(REJETS.map((d) => d.code)).toEqual([...CODES_REJET]);
    expect(CODES_REJET).toEqual(
      Array.from({ length: 27 }, (_, i) => `ERR${String(i + 1).padStart(3, '0')}`),
    );
  });

  it('décrit chaque code par 1 à 3 recherches non vides', () => {
    for (const d of REJETS) {
      expect(d.recherches.length, d.code).toBeGreaterThanOrEqual(1);
      expect(d.recherches.length, d.code).toBeLessThanOrEqual(3);
      for (const recherche of d.recherches) expect(recherche.texte, d.code).not.toBe('');
    }
  });

  it('reprend les explications provisoires du fichier d’origine', () => {
    for (const d of REJETS) expect(d.explication).toBe(`Aide ${d.code}`);
  });
});

describe('Identification d’un rejet', () => {
  it.each(REJETS.map((d) => [d.code, d] as const))(
    'reconnaît %s par un message construit à partir de ses recherches',
    (code, d) => {
      expect(identifierRejet(messageDepuis(d))).toEqual({
        code,
        explication: `Aide ${code}`,
      });
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

  it('renvoie un résultat gelé', () => {
    expect(Object.isFrozen(identifierRejet('Message sans rapport'))).toBe(true);
    expect(Object.isFrozen(identifierRejet(messageDepuis(description('ERR009'))))).toBe(true);
    expect(Object.isFrozen(identifierRejet(''))).toBe(true);
  });
});
