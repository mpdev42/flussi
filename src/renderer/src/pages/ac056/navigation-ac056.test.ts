import { describe, expect, it } from 'vitest';
import {
  compterLignesRejetees,
  compterParLigne,
  indexerLignes,
  type CodeEntite,
  type FichierAc056,
} from '@shared/domain/ac056';
import {
  REPERES_REJET_VARIE,
  lignesCompletes,
  lignesRejetVarie,
} from '@shared/test/ac056-synthetique';
import { analyseSynthetique } from '@/test/ac056';

import {
  choisirBeneficiaire,
  choisirElement,
  choisirEvenement,
  choisirOnglet,
  choisirOngletBeneficiaire,
  ficheCourante,
  selectionInitiale,
  type ContexteNavigation,
  type SelectionAc056,
} from './navigation-ac056';

// Fichier fictif : 4 évènements (0 à 3), 2 bénéficiaires chacun (ASSPRI puis CONJOI), 2 coordonnées
// (125) par évènement, 2 critères (485), 2 variables (490) et 2 garanties (700) par bénéficiaire.

interface Cible {
  evenement: number;
  beneficiaire?: number;
  entite: CodeEntite;
  rang?: number;
}

function numeroLigne(fichier: FichierAc056, contexte: ContexteNavigation, cible: Cible): number {
  const indice = contexte.index.rattachements.findIndex(
    (r) =>
      r !== null &&
      r.evenement === cible.evenement &&
      r.beneficiaire === (cible.beneficiaire ?? null) &&
      r.entite === cible.entite &&
      r.rang === (cible.rang ?? 0),
  );
  if (indice < 0) throw new Error(`Ligne introuvable : ${JSON.stringify(cible)}`);
  return fichier.lignes[indice]!.numero;
}

/** Contexte dont les erreurs sont posées sur les lignes désignées (sans passer par les règles). */
function avecErreurs(lignes: readonly string[] = lignesCompletes(), cibles: Cible[] = []) {
  const { fichier } = analyseSynthetique(lignes);
  const index = indexerLignes(fichier);
  const sansErreur: ContexteNavigation = { index, compteurs: compterParLigne(index, []) };
  const numeros = cibles.map((cible) => numeroLigne(fichier, sansErreur, cible));
  const contexte: ContexteNavigation = { index, compteurs: compterParLigne(index, numeros) };
  return { fichier, contexte };
}

/** Lignes du fichier fictif sans celles pour lesquelles `ecarter` répond vrai. */
function sans(
  ecarter: (ligne: { code: string; dossier: string; evenement: string; rang: string }) => boolean,
): string[] {
  return lignesCompletes().filter(
    (ligne) =>
      !ecarter({
        code: ligne.slice(22, 25),
        dossier: ligne.slice(9, 17),
        evenement: ligne.slice(17, 20),
        rang: ligne.slice(20, 22),
      }),
  );
}

const SELECTION: SelectionAc056 = {
  evenement: 0,
  onglet: '100',
  beneficiaire: 0,
  ongletBeneficiaire: '400',
  elements: { e125: 0, e485: 0, e490: 0, e700: 0 },
};

describe('selectionInitiale', () => {
  it('ouvre le premier évènement sur la fiche 100 quand rien n’est en erreur', () => {
    const { contexte } = avecErreurs();

    expect(selectionInitiale(contexte)).toEqual(SELECTION);
  });

  it('ouvre la première fiche en erreur du premier évènement', () => {
    const { contexte } = avecErreurs(undefined, [{ evenement: 0, entite: '130' }]);

    expect(selectionInitiale(contexte).onglet).toBe('130');
  });
});

describe('choisirEvenement', () => {
  it('ouvre le premier onglet en erreur, dans l’ordre de Lazarus', () => {
    const { contexte } = avecErreurs(undefined, [
      { evenement: 1, entite: '180' },
      { evenement: 1, entite: '120' },
      { evenement: 1, entite: '130' },
    ]);

    const suivante = choisirEvenement(contexte, { ...SELECTION, onglet: '110' }, 1);

    expect(suivante.evenement).toBe(1);
    expect(suivante.onglet).toBe('120');
  });

  it('place Bénéficiaires avant 100 : un évènement en erreur dans les deux ouvre le bénéficiaire', () => {
    const { contexte } = avecErreurs(undefined, [
      { evenement: 1, entite: '100' },
      { evenement: 1, beneficiaire: 1, entite: '405' },
    ]);

    const suivante = choisirEvenement(contexte, SELECTION, 1);

    expect(suivante.onglet).toBe('beneficiaires');
    expect(suivante.beneficiaire).toBe(1);
    expect(suivante.ongletBeneficiaire).toBe('405');
  });

  it('dans Bénéficiaires : premier bénéficiaire, premier sous-onglet et premier élément en erreur', () => {
    const { contexte } = avecErreurs(undefined, [
      { evenement: 2, beneficiaire: 1, entite: '410' },
      { evenement: 2, beneficiaire: 1, entite: '700', rang: 1 },
      { evenement: 2, beneficiaire: 1, entite: '490', rang: 1 },
    ]);

    const suivante = choisirEvenement(contexte, SELECTION, 2);

    expect(suivante.onglet).toBe('beneficiaires');
    expect(suivante.beneficiaire).toBe(1);
    expect(suivante.ongletBeneficiaire).toBe('garanties');
    expect(suivante.elements).toEqual({ e125: 0, e485: 0, e490: 1, e700: 1 });
  });

  it('ouvre le premier élément en erreur de Coordonnées', () => {
    const { contexte } = avecErreurs(undefined, [{ evenement: 1, entite: '125', rang: 1 }]);

    const suivante = choisirEvenement(contexte, SELECTION, 1);

    expect(suivante.onglet).toBe('coordonnees');
    expect(suivante.elements.e125).toBe(1);
  });

  it('garde l’onglet courant d’un évènement sans erreur quand il y existe', () => {
    const { contexte } = avecErreurs();

    const suivante = choisirEvenement(contexte, { ...SELECTION, onglet: '120' }, 3);

    expect(suivante.evenement).toBe(3);
    expect(suivante.onglet).toBe('120');
  });

  it('garde l’onglet courant d’un évènement dont seule la 990 est en erreur', () => {
    const { contexte } = avecErreurs(undefined, [{ evenement: 1, entite: '990' }]);

    const suivante = choisirEvenement(contexte, { ...SELECTION, onglet: '135' }, 1);

    expect(suivante.onglet).toBe('135');
  });

  it('ouvre la 100 quand l’onglet courant n’existe pas dans l’évènement', () => {
    // Évènement 1 (dossier 1, évènement 2) sans 120 ni 125
    const lignes = sans(
      (l) =>
        l.dossier === '00000001' && l.evenement === '002' && (l.code === '120' || l.code === '125'),
    );
    const { contexte } = avecErreurs(lignes);

    expect(choisirEvenement(contexte, { ...SELECTION, onglet: '120' }, 1).onglet).toBe('100');
    expect(choisirEvenement(contexte, { ...SELECTION, onglet: 'coordonnees' }, 1).onglet).toBe(
      '100',
    );
    // Témoin : l'évènement 0 a une 120. La sélection part d'un autre évènement (choisir l'évènement
    // déjà sélectionné ne change rien, ce qui ne prouverait rien)
    const depuisLUn = { ...SELECTION, evenement: 1, onglet: '120' as const };
    const versLeZero = choisirEvenement(contexte, depuisLUn, 0);
    expect(versLeZero.evenement).toBe(0);
    expect(versLeZero.onglet).toBe('120');
  });

  it('garde le sous-onglet courant du premier bénéficiaire quand rien n’y est en erreur', () => {
    const { contexte } = avecErreurs();

    const suivante = choisirEvenement(contexte, { ...SELECTION, ongletBeneficiaire: '410' }, 2);

    expect(suivante.beneficiaire).toBe(0);
    expect(suivante.ongletBeneficiaire).toBe('410');
  });

  it('ne change rien pour un évènement inexistant', () => {
    const { contexte } = avecErreurs();

    expect(choisirEvenement(contexte, SELECTION, 99)).toBe(SELECTION);
  });

  it('ne change rien pour l’évènement déjà sélectionné, même s’il a une erreur dans un autre onglet', () => {
    const { contexte } = avecErreurs(undefined, [{ evenement: 0, entite: '130' }]);
    const surLa100 = { ...SELECTION, onglet: '100' as const };

    expect(choisirEvenement(contexte, surLa100, 0)).toBe(surLa100);
  });
});

describe('choisirBeneficiaire', () => {
  const SUR_BENEFICIAIRES: SelectionAc056 = {
    evenement: 1,
    onglet: 'beneficiaires',
    beneficiaire: 0,
    ongletBeneficiaire: '405',
    elements: { e125: 1, e485: 0, e490: 0, e700: 0 },
  };

  it('ouvre le premier sous-onglet en erreur du bénéficiaire', () => {
    const { contexte } = avecErreurs(undefined, [
      { evenement: 1, beneficiaire: 1, entite: '800' },
      { evenement: 1, beneficiaire: 1, entite: '410' },
    ]);

    const suivante = choisirBeneficiaire(contexte, SUR_BENEFICIAIRES, 1);

    expect(suivante.beneficiaire).toBe(1);
    expect(suivante.ongletBeneficiaire).toBe('410');
    expect(suivante.onglet).toBe('beneficiaires');
  });

  it('garde le sous-onglet courant s’il existe chez le bénéficiaire, et les coordonnées', () => {
    const { contexte } = avecErreurs();

    const suivante = choisirBeneficiaire(contexte, SUR_BENEFICIAIRES, 1);

    expect(suivante.ongletBeneficiaire).toBe('405');
    expect(suivante.elements.e125).toBe(1);
  });

  it('revient à 400 quand le sous-onglet courant n’existe pas chez le bénéficiaire', () => {
    // Le second bénéficiaire de l'évènement 1 n'a pas de 800
    const lignes = sans(
      (l) =>
        l.code === '800' && l.dossier === '00000001' && l.evenement === '002' && l.rang === '02',
    );
    const { contexte } = avecErreurs(lignes);

    const suivante = choisirBeneficiaire(
      contexte,
      { ...SUR_BENEFICIAIRES, ongletBeneficiaire: '800' },
      1,
    );

    expect(suivante.ongletBeneficiaire).toBe('400');
  });

  it('ouvre le premier élément en erreur des listes du bénéficiaire, sinon le premier', () => {
    const { contexte } = avecErreurs(undefined, [
      { evenement: 1, beneficiaire: 1, entite: '485', rang: 1 },
    ]);

    const suivante = choisirBeneficiaire(
      contexte,
      { ...SUR_BENEFICIAIRES, elements: { e125: 1, e485: 1, e490: 1, e700: 1 } },
      1,
    );

    expect(suivante.elements).toEqual({ e125: 1, e485: 1, e490: 0, e700: 0 });
    expect(suivante.ongletBeneficiaire).toBe('criteres');
  });

  it('ne change rien pour un bénéficiaire inexistant', () => {
    const { contexte } = avecErreurs();

    expect(choisirBeneficiaire(contexte, SUR_BENEFICIAIRES, 5)).toBe(SUR_BENEFICIAIRES);
  });

  it('ne change rien pour le bénéficiaire déjà sélectionné, même s’il a une erreur dans un autre sous-onglet', () => {
    const { contexte } = avecErreurs(undefined, [{ evenement: 1, beneficiaire: 0, entite: '410' }]);

    expect(choisirBeneficiaire(contexte, SUR_BENEFICIAIRES, 0)).toBe(SUR_BENEFICIAIRES);
  });
});

describe('choix manuels', () => {
  it('change d’onglet, de sous-onglet et d’élément', () => {
    expect(choisirOnglet(SELECTION, '120').onglet).toBe('120');
    expect(choisirOngletBeneficiaire(SELECTION, 'variables').ongletBeneficiaire).toBe('variables');
    expect(choisirElement(SELECTION, 'e700', 1).elements).toEqual({
      e125: 0,
      e485: 0,
      e490: 0,
      e700: 1,
    });
  });

  it('renvoie la même sélection quand rien ne change', () => {
    expect(choisirOnglet(SELECTION, '100')).toBe(SELECTION);
    expect(choisirOngletBeneficiaire(SELECTION, '400')).toBe(SELECTION);
    expect(choisirElement(SELECTION, 'e125', 0)).toBe(SELECTION);
  });
});

describe('ficheCourante', () => {
  it('désigne la ligne de l’onglet, de la liste ou du bénéficiaire sélectionné', () => {
    const { fichier, contexte } = avecErreurs();
    const fiche = (s: SelectionAc056) => {
      const courante = ficheCourante(contexte.index, s);
      return courante && { code: courante.code, ligne: fichier.lignes[courante.indice]!.numero };
    };
    const numero = (cible: Cible) => numeroLigne(fichier, contexte, cible);

    expect(fiche(SELECTION)).toEqual({
      code: '100',
      ligne: numero({ evenement: 0, entite: '100' }),
    });
    expect(
      fiche({ ...SELECTION, onglet: 'coordonnees', elements: { ...SELECTION.elements, e125: 1 } }),
    ).toEqual({ code: '125', ligne: numero({ evenement: 0, entite: '125', rang: 1 }) });
    expect(
      fiche({
        ...SELECTION,
        evenement: 2,
        onglet: 'beneficiaires',
        beneficiaire: 1,
        ongletBeneficiaire: '405',
      }),
    ).toEqual({ code: '405', ligne: numero({ evenement: 2, beneficiaire: 1, entite: '405' }) });
    expect(
      fiche({
        ...SELECTION,
        onglet: 'beneficiaires',
        ongletBeneficiaire: 'garanties',
        elements: { ...SELECTION.elements, e700: 1 },
      }),
    ).toEqual({
      code: '700',
      ligne: numero({ evenement: 0, beneficiaire: 0, entite: '700', rang: 1 }),
    });
  });

  it('renvoie null quand l’entité n’existe pas', () => {
    const { contexte } = avecErreurs(sans((l) => l.code === '155'));

    expect(ficheCourante(contexte.index, { ...SELECTION, onglet: '155' })).toBeNull();
  });
});

describe('fichier de rejet — lignes rejetées et bénéficiaire implicite', () => {
  // Évènement 0 : 400 et 700 rejetées du premier bénéficiaire, 990 rejetée. Évènement 1 : 700 d'un
  // bénéficiaire implicite (sans 400), rejetée.
  const { fichier } = analyseSynthetique(lignesRejetVarie(), 'rejet');
  const index = indexerLignes(fichier);
  const avecRejets: ContexteNavigation = {
    index,
    compteurs: compterLignesRejetees(index, fichier),
  };
  const sansRejet: ContexteNavigation = { index, compteurs: compterParLigne(index, []) };

  it('ouvre la première fiche rejetée : Bénéficiaires, Garanties, première garantie rejetée', () => {
    const selection = selectionInitiale(avecRejets);

    expect(selection.evenement).toBe(0);
    expect(selection.onglet).toBe('beneficiaires');
    expect(selection.beneficiaire).toBe(0);
    // Garanties avant 400 dans l'ordre de Lazarus : la 700 rejetée l'emporte sur la 400 rejetée
    expect(selection.ongletBeneficiaire).toBe('garanties');
  });

  it('ouvre les Garanties du bénéficiaire implicite d’un évènement rejeté', () => {
    const selection = choisirEvenement(avecRejets, SELECTION, 1);

    expect(selection.onglet).toBe('beneficiaires');
    expect(selection.beneficiaire).toBe(0);
    expect(index.evenements[1]!.noeud.beneficiaires[0]!.e400).toBeNull();
    expect(selection.ongletBeneficiaire).toBe('garanties');
  });

  it('retombe sur le premier onglet présent du bénéficiaire implicite quand la 400 manque', () => {
    // Aucune ligne rejetée : ni onglet en erreur, ni 400 (courant : 400 puis 405 absents)
    const depuis400 = choisirEvenement(sansRejet, SELECTION, 1);
    expect(depuis400.ongletBeneficiaire).toBe('garanties');

    const depuis405 = choisirEvenement(
      sansRejet,
      { ...SELECTION, onglet: 'beneficiaires', ongletBeneficiaire: '405' },
      1,
    );
    expect(depuis405.ongletBeneficiaire).toBe('garanties');
  });

  it('garde le sous-onglet courant s’il existe chez le bénéficiaire implicite', () => {
    const selection = choisirEvenement(
      sansRejet,
      { ...SELECTION, ongletBeneficiaire: 'garanties' },
      1,
    );

    expect(selection.ongletBeneficiaire).toBe('garanties');
  });

  it('désigne la 700 du bénéficiaire implicite, et aucune fiche sur sa 400', () => {
    const surGaranties: SelectionAc056 = {
      ...SELECTION,
      evenement: 1,
      onglet: 'beneficiaires',
      ongletBeneficiaire: 'garanties',
    };
    const fiche = ficheCourante(index, surGaranties);

    expect(fiche?.code).toBe('700');
    expect(fichier.lignes[fiche!.indice]!.numero).toBe(REPERES_REJET_VARIE.ligne700Implicite);
    expect(ficheCourante(index, { ...surGaranties, ongletBeneficiaire: '400' })).toBeNull();
  });
});
