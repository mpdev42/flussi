// Hiérarchie dossier > évènement > bénéficiaire : indices dans `lignes`, d'après le code de la
// ligne, quelle que soit sa nature (décrite ou brute).
import { describe, expect, it } from 'vitest';
import {
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
} from '@shared/test/ac056-synthetique';
import type { CodeEntite } from './entites';
import { construireHierarchie } from './hierarchie';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LigneAc056, LigneDecrite } from './modele';
import type { Octets } from './octets';

type Hierarchie = ReturnType<typeof construireHierarchie>;

/** Lignes brutes portant seulement un code : la hiérarchie ne dépend que du code. */
function depuisCodes(codes: readonly (CodeEntite | null)[]): LigneAc056[] {
  return codes.map((code, i): LigneAc056 => ({
    nature: 'brute',
    code,
    numero: i + 1,
    origine: '' as Octets,
    finDeLigne: '\r\n',
  }));
}

function hierarchie(...codes: (CodeEntite | null)[]): Hierarchie {
  return construireHierarchie(depuisCodes(codes));
}

/** Tous les indices rattachés, dans l'ordre de parcours de la structure. */
function indicesRattaches(h: Hierarchie | FichierAc056): number[] {
  const indices: number[] = [];
  const ajouter = (indice: number | null) => {
    if (indice !== null) indices.push(indice);
  };
  ajouter(h.e000);
  for (const dossier of h.dossiers) {
    ajouter(dossier.e001);
    for (const evt of dossier.evenements) {
      ajouter(evt.e100);
      [evt.e110, evt.e115, evt.e120].forEach(ajouter);
      evt.e125.forEach(ajouter);
      [evt.e130, evt.e135, evt.e155, evt.e180].forEach(ajouter);
      for (const benef of evt.beneficiaires) {
        ajouter(benef.e400);
        [benef.e405, benef.e410, benef.e411].forEach(ajouter);
        benef.e485.forEach(ajouter);
        benef.e490.forEach(ajouter);
        benef.e700.forEach(ajouter);
        ajouter(benef.e800);
      }
      ajouter(evt.e990);
    }
    ajouter(dossier.e995);
  }
  ajouter(h.e999);
  return indices;
}

describe('construireHierarchie', () => {
  describe('cas vides', () => {
    it('renvoie une hiérarchie vide sans ligne', () => {
      expect(construireHierarchie([])).toEqual({ e000: null, dossiers: [], e999: null });
    });

    it('ignore les lignes sans code', () => {
      expect(hierarchie(null, null)).toEqual({ e000: null, dossiers: [], e999: null });
    });
  });

  describe('fichier', () => {
    it('rattache 000 et 999 au fichier', () => {
      const h = hierarchie('000', '999');
      expect(h.e000).toBe(0);
      expect(h.e999).toBe(1);
    });

    it('garde la dernière 000 et la dernière 999', () => {
      const h = hierarchie('000', '000', '999', '999');
      expect(h.e000).toBe(1);
      expect(h.e999).toBe(3);
    });

    it('rattache 000 et 999 quelle que soit leur position', () => {
      const h = hierarchie('999', '001', '000');
      expect(h.e999).toBe(0);
      expect(h.e000).toBe(2);
    });
  });

  describe('dossiers', () => {
    it('crée un dossier à chaque 001', () => {
      const h = hierarchie('001', '995', '001', '995');
      expect(h.dossiers.map((d) => [d.e001, d.e995])).toEqual([
        [0, 1],
        [2, 3],
      ]);
    });

    it('laisse e995 à null sans 995', () => {
      expect(hierarchie('001').dossiers[0]?.e995).toBeNull();
    });

    it('ne rattache pas une 995 sans dossier', () => {
      const h = hierarchie('995');
      expect(h.dossiers).toEqual([]);
    });

    it('rattache une 995 au dossier courant', () => {
      const h = hierarchie('001', '100', '995');
      expect(h.dossiers[0]?.e995).toBe(2);
    });

    it('garde la dernière 995 du dossier', () => {
      const h = hierarchie('001', '995', '995');
      expect(h.dossiers[0]?.e995).toBe(2);
    });

    it('rattache une 995 tardive au dernier dossier ouvert (aucun curseur fermé)', () => {
      const h = hierarchie('001', '001', '995');
      expect(h.dossiers[0]?.e995).toBeNull();
      expect(h.dossiers[1]?.e995).toBe(2);
    });
  });

  describe('évènements', () => {
    it('crée un évènement à chaque 100 du dossier courant', () => {
      const h = hierarchie('001', '100', '990', '100', '990');
      expect(h.dossiers[0]?.evenements.map((e) => [e.e100, e.e990])).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('ne rattache pas une 100 sans dossier', () => {
      const h = hierarchie('100', '110', '990');
      expect(h.dossiers).toEqual([]);
    });

    it('rattache chaque entité fille à l évènement courant', () => {
      const h = hierarchie('001', '100', '110', '115', '120', '130', '135', '155', '180', '990');
      expect(h.dossiers[0]?.evenements[0]).toMatchObject({
        e100: 1,
        e110: 2,
        e115: 3,
        e120: 4,
        e125: [],
        e130: 5,
        e135: 6,
        e155: 7,
        e180: 8,
        e990: 9,
        beneficiaires: [],
      });
    });

    it('laisse à null les entités absentes', () => {
      const h = hierarchie('001', '100');
      expect(h.dossiers[0]?.evenements[0]).toEqual({
        e100: 1,
        e110: null,
        e115: null,
        e120: null,
        e125: [],
        e130: null,
        e135: null,
        e155: null,
        e180: null,
        beneficiaires: [],
        e990: null,
      });
    });

    it('range les 125 dans une liste ordonnée', () => {
      const h = hierarchie('001', '100', '125', '120', '125', '125');
      expect(h.dossiers[0]?.evenements[0]?.e125).toEqual([2, 4, 5]);
    });

    it.each(['110', '115', '120', '130', '135', '155', '180'] as const)(
      'garde la dernière %s de l évènement et laisse la précédente non rattachée',
      (code) => {
        const h = hierarchie('001', '100', code, code);
        const evt = h.dossiers[0]?.evenements[0];
        const rattaches = indicesRattaches(h);
        expect(rattaches).toContain(3);
        expect(rattaches).not.toContain(2);
        expect(evt?.[`e${code}`]).toBe(3);
      },
    );

    it('garde le dernier 990 de l évènement', () => {
      const h = hierarchie('001', '100', '990', '990');
      expect(h.dossiers[0]?.evenements[0]?.e990).toBe(3);
    });

    it('ne rattache pas une 990 sans évènement', () => {
      const h = hierarchie('001', '990');
      expect(h.dossiers[0]?.evenements).toEqual([]);
      expect(indicesRattaches(h)).toEqual([0]);
    });

    it('ne rattache pas les entités filles d un évènement sans 100', () => {
      const h = hierarchie('001', '110', '115', '125', '400');
      expect(h.dossiers[0]?.evenements).toEqual([]);
      expect(indicesRattaches(h)).toEqual([0]);
    });

    it('ne ferme aucun curseur : une 110 après la 990 rejoint le même évènement', () => {
      const h = hierarchie('001', '100', '990', '110');
      const evenements = h.dossiers[0]?.evenements;
      expect(evenements).toHaveLength(1);
      expect(evenements?.[0]).toMatchObject({ e100: 1, e990: 2, e110: 3 });
    });

    it('ne ferme aucun curseur : une 400 après la 990 rejoint le même évènement', () => {
      const h = hierarchie('001', '100', '990', '400');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires.map((b) => b.e400)).toEqual([3]);
    });

    it('ne rattache pas un évènement au dossier précédent après un nouveau 001', () => {
      const h = hierarchie('001', '100', '001', '110');
      expect(h.dossiers[0]?.evenements).toHaveLength(1);
      expect(h.dossiers[1]?.evenements).toEqual([]);
      expect(indicesRattaches(h)).not.toContain(3);
    });
  });

  describe('bénéficiaires', () => {
    it('crée un bénéficiaire à chaque 400 de l évènement courant', () => {
      const h = hierarchie('001', '100', '400', '400');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires.map((b) => b.e400)).toEqual([2, 3]);
    });

    it('ne rattache pas une 400 sans évènement', () => {
      const h = hierarchie('400', '405');
      expect(h.dossiers).toEqual([]);
    });

    it('laisse à null et à vide les entités absentes', () => {
      const h = hierarchie('001', '100', '400');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires[0]).toEqual({
        e400: 2,
        e405: null,
        e410: null,
        e411: null,
        e485: [],
        e490: [],
        e700: [],
        e800: null,
      });
    });

    it('rattache chaque entité fille au bénéficiaire courant', () => {
      const h = hierarchie('001', '100', '400', '405', '410', '411', '485', '490', '700', '800');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires[0]).toEqual({
        e400: 2,
        e405: 3,
        e410: 4,
        e411: 5,
        e485: [6],
        e490: [7],
        e700: [8],
        e800: 9,
      });
    });

    it('range 485, 490 et 700 dans des listes ordonnées', () => {
      const h = hierarchie('001', '100', '400', '485', '700', '485', '490', '700', '490', '485');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires[0]).toMatchObject({
        e485: [3, 5, 9],
        e490: [6, 8],
        e700: [4, 7],
      });
    });

    it.each(['405', '410', '411', '800'] as const)(
      'garde la dernière %s du bénéficiaire et laisse la précédente non rattachée',
      (code) => {
        const h = hierarchie('001', '100', '400', code, code);
        const benef = h.dossiers[0]?.evenements[0]?.beneficiaires[0];
        const rattaches = indicesRattaches(h);
        expect(benef?.[`e${code}`]).toBe(4);
        expect(rattaches).toContain(4);
        expect(rattaches).not.toContain(3);
      },
    );

    it('range les entités filles dans le dernier bénéficiaire ouvert', () => {
      const h = hierarchie('001', '100', '400', '405', '400', '405');
      const benefs = h.dossiers[0]?.evenements[0]?.beneficiaires;
      expect(benefs?.map((b) => [b.e400, b.e405])).toEqual([
        [2, 3],
        [4, 5],
      ]);
    });

    it('remet le bénéficiaire courant à null à chaque 100', () => {
      const h = hierarchie('001', '100', '400', '100', '405');
      const evenements = h.dossiers[0]?.evenements;
      expect(evenements?.[0]?.beneficiaires[0]?.e405).toBeNull();
      expect(evenements?.[1]?.beneficiaires).toEqual([]);
      expect(indicesRattaches(h)).not.toContain(4);
    });

    it('ne rattache pas une fille de bénéficiaire sans 400 dans l évènement', () => {
      const h = hierarchie('001', '100', '405', '485', '700', '800');
      expect(h.dossiers[0]?.evenements[0]?.beneficiaires).toEqual([]);
      expect(indicesRattaches(h)).toEqual([0, 1]);
    });

    it('ne rattache pas une fille de bénéficiaire sans évènement', () => {
      const h = hierarchie('001', '405', '485');
      expect(indicesRattaches(h)).toEqual([0]);
    });
  });

  describe('nature de la ligne', () => {
    it('se fonde sur le code, pas sur la nature : une 100 brute rattache ses filles', () => {
      const lignes = depuisCodes(['001', '100', '110']);
      const h = construireHierarchie(lignes);
      expect(h.dossiers[0]?.evenements[0]).toMatchObject({ e100: 1, e110: 2 });
    });

    it('rattache aussi une ligne décrite', () => {
      const decrite: LigneDecrite = {
        nature: 'decrite',
        code: '100',
        valeurs: {},
        numero: 2,
        origine: '' as Octets,
        finDeLigne: '\r\n',
      };
      const [d, , f] = depuisCodes(['001', '100', '110']);
      const h = construireHierarchie([d!, decrite, f!]);
      expect(h.dossiers[0]?.evenements[0]).toMatchObject({ e100: 1, e110: 2 });
    });

    it('rattache une 100 de 699 octets lue par lireAc056, avec ses filles', () => {
      const ligne100 = ligneSynthetique('100').slice(0, 699);
      const { fichier } = lireAc056(
        fichierSynthetique([ligneSynthetique('001'), ligne100, ligneSynthetique('110')]),
      );
      expect(fichier.lignes[1]?.nature).toBe('brute');
      expect(fichier.dossiers[0]?.evenements[0]).toMatchObject({ e100: 1, e110: 2 });
    });

    it('ne rattache pas une ligne de code inconnu lue par lireAc056', () => {
      const inconnue = ligneSynthetique('110', { numEntite: '123' });
      const { fichier } = lireAc056(
        fichierSynthetique([ligneSynthetique('001'), ligneSynthetique('100'), inconnue]),
      );
      expect(indicesRattaches(fichier)).toEqual([0, 1]);
    });
  });

  describe('fichier synthétique complet', () => {
    it('rattache chaque indice exactement une fois', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesCompletes()));
      const indices = indicesRattaches(fichier);
      expect(indices).toHaveLength(138);
      expect([...indices].sort((a, b) => a - b)).toEqual(Array.from({ length: 138 }, (_, i) => i));
    });

    it('reproduit la structure 2 dossiers x 2 évènements x 2 bénéficiaires', () => {
      const h = lireAc056(fichierSynthetique(lignesCompletes())).fichier;
      expect(h.e000).toBe(0);
      expect(h.e999).toBe(137);
      expect(h.dossiers.map((d) => [d.e001, d.e995, d.evenements.length])).toEqual([
        [1, 68, 2],
        [69, 136, 2],
      ]);
      expect(h.dossiers[0]?.evenements.map((e) => [e.e100, e.e990])).toEqual([
        [2, 34],
        [35, 67],
      ]);
      expect(h.dossiers.flatMap((d) => d.evenements).map((e) => e.beneficiaires.length)).toEqual([
        2, 2, 2, 2,
      ]);
    });

    it('range le premier évènement du premier dossier comme attendu', () => {
      const h = lireAc056(fichierSynthetique(lignesCompletes())).fichier;
      expect(h.dossiers[0]?.evenements[0]).toEqual({
        e100: 2,
        e110: 3,
        e115: 4,
        e120: 5,
        e125: [6, 7],
        e130: 8,
        e135: 9,
        e155: 10,
        e180: 11,
        beneficiaires: [
          {
            e400: 12,
            e405: 13,
            e410: 14,
            e411: 15,
            e485: [16, 17],
            e490: [18, 19],
            e700: [20, 21],
            e800: 22,
          },
          {
            e400: 23,
            e405: 24,
            e410: 25,
            e411: 26,
            e485: [27, 28],
            e490: [29, 30],
            e700: [31, 32],
            e800: 33,
          },
        ],
        e990: 34,
      });
    });
  });
});
