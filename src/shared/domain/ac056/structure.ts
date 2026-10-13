// Contrôle de structure d'un fichier AC056 : longueur des lignes, code d'entité connu, place de
// chaque entité dans la hiérarchie, 000/999 présentes, 990/995 de fin. Passe séparée de
// `construireHierarchie` (qui reste fidèle à Lazarus : le dernier gagne, aucun curseur fermé).
// Toutes les anomalies sont bloquantes. Les messages ne contiennent que des numéros de ligne,
// des codes d'entité connus et des longueurs, jamais une valeur lue dans le fichier.
import {
  LONGUEUR_CODE_ENTITE,
  LONGUEUR_LIGNE,
  POSITION_CODE_ENTITE,
  type CodeEntite,
} from './entites';
import type { AnomalieAc056, CodeAnomalie, LigneAc056 } from './modele';

type Parent = 'dossier' | 'evenement' | 'beneficiaire';

/**
 * Rôle d'une entité dans son parent :
 * - `ouvre` : ouvre un niveau (100, 400), toujours, même mal placée ;
 * - `unique` : au plus une fois par parent (le doublon est signalé) ;
 * - `multiple` : autant de fois que nécessaire ;
 * - `ferme` : ferme le niveau (990, 995).
 */
type Role = 'ouvre' | 'unique' | 'multiple' | 'ferme';

interface Regle {
  readonly parent: Parent;
  readonly role: Role;
}

/** Entités soumises à la table : tout sauf 000, 001 et 999 (cas particuliers). */
type CodeRegle = Exclude<CodeEntite, '000' | '001' | '999'>;

/** Ordre entre lignes sœurs non contrôlé (parité Lazarus) : seule la présence d'un parent compte. */
const REGLES: Readonly<Record<CodeRegle, Regle>> = {
  '100': { parent: 'dossier', role: 'ouvre' },
  '110': { parent: 'evenement', role: 'unique' },
  '115': { parent: 'evenement', role: 'unique' },
  '120': { parent: 'evenement', role: 'unique' },
  '125': { parent: 'evenement', role: 'multiple' },
  '130': { parent: 'evenement', role: 'unique' },
  '135': { parent: 'evenement', role: 'unique' },
  '155': { parent: 'evenement', role: 'unique' },
  '180': { parent: 'evenement', role: 'unique' },
  '400': { parent: 'evenement', role: 'ouvre' },
  '405': { parent: 'beneficiaire', role: 'unique' },
  '410': { parent: 'beneficiaire', role: 'unique' },
  '411': { parent: 'beneficiaire', role: 'unique' },
  '485': { parent: 'beneficiaire', role: 'multiple' },
  '490': { parent: 'beneficiaire', role: 'multiple' },
  '700': { parent: 'beneficiaire', role: 'multiple' },
  '800': { parent: 'beneficiaire', role: 'unique' },
  '990': { parent: 'evenement', role: 'ferme' },
  '995': { parent: 'dossier', role: 'ferme' },
};

const LIBELLE_PARENT: Readonly<Record<Parent, string>> = {
  dossier: "hors d'un dossier (entre une 001 et sa 995)",
  evenement: "hors d'un évènement (entre une 100 et sa 990)",
  beneficiaire: "hors d'un bénéficiaire (après une 400 et avant la 990)",
};

/** Dossier ou évènement courant. `numeroFin` : 990/995 qui l'a fermé, null si fermeture implicite. */
interface Niveau {
  readonly numero: number;
  ferme: boolean;
  numeroFin: number | null;
}

interface Evenement extends Niveau {
  readonly uniques: Map<CodeEntite, number>;
}

interface Beneficiaire {
  readonly uniques: Map<CodeEntite, number>;
}

function anomalie(code: CodeAnomalie, ligne: number | null, message: string): AnomalieAc056 {
  return Object.freeze({ code, ligne, message, bloquante: true });
}

export function controlerStructure(lignes: readonly LigneAc056[]): AnomalieAc056[] {
  if (lignes.length === 0) {
    return [anomalie('fichier-vide', null, 'Le fichier est vide : aucune ligne AC056.')];
  }

  const anomalies: AnomalieAc056[] = [];
  const longueurMinimaleCode = POSITION_CODE_ENTITE - 1 + LONGUEUR_CODE_ENTITE;

  // Première et dernière ligne de code connu (indices dans `lignes`).
  let premierConnu = -1;
  let dernierConnu = -1;
  lignes.forEach((ligne, i) => {
    if (ligne.code === null) return;
    if (premierConnu === -1) premierConnu = i;
    dernierConnu = i;
  });

  let dossier: Niveau | null = null;
  let evt: Evenement | null = null;
  let benef: Beneficiaire | null = null;

  function fermerEvenement(): void {
    if (evt && !evt.ferme) {
      anomalies.push(
        anomalie(
          'entite-absente',
          evt.numero,
          `Ligne ${evt.numero} : évènement sans entité 990 de fin.`,
        ),
      );
      evt.ferme = true;
    }
    benef = null;
  }

  function fermerDossier(): void {
    fermerEvenement();
    if (dossier && !dossier.ferme) {
      anomalies.push(
        anomalie(
          'entite-absente',
          dossier.numero,
          `Ligne ${dossier.numero} : dossier sans entité 995 de fin.`,
        ),
      );
      dossier.ferme = true;
    }
  }

  function estOuvert(parent: Parent): boolean {
    if (parent === 'dossier') return dossier !== null && !dossier.ferme;
    if (parent === 'evenement') return evt !== null && !evt.ferme;
    return benef !== null;
  }

  lignes.forEach((ligne, i) => {
    const { numero, origine, code } = ligne;

    if (origine.length !== LONGUEUR_LIGNE) {
      anomalies.push(
        anomalie(
          'longueur-ligne',
          numero,
          `Ligne ${numero} : ${origine.length} octets au lieu de ${LONGUEUR_LIGNE}.`,
        ),
      );
    }

    if (code === null) {
      if (origine.length >= longueurMinimaleCode) {
        anomalies.push(
          anomalie(
            'entite-inconnue',
            numero,
            `Ligne ${numero} : code d'entité inconnu (octets ${POSITION_CODE_ENTITE} à ${longueurMinimaleCode}).`,
          ),
        );
      }
      return;
    }

    const malPlacee = (detail: string): void => {
      anomalies.push(
        anomalie(
          'entite-mal-placee',
          numero,
          `Ligne ${numero} : entité ${code} mal placée, ${detail}.`,
        ),
      );
    };

    const enDouble = (premiere: number): void => {
      anomalies.push(
        anomalie(
          'entite-en-double',
          numero,
          `Ligne ${numero} : entité ${code} en double (déjà ligne ${premiere}).`,
        ),
      );
    };

    /** Enregistre une entité unique dans `uniques`, ou signale le doublon (première occurrence). */
    const enregistrerUnique = (uniques: Map<CodeEntite, number>): void => {
      const premiere = uniques.get(code);
      if (premiere === undefined) uniques.set(code, numero);
      else enDouble(premiere);
    };

    switch (code) {
      case '000':
        if (i !== premierConnu) malPlacee('attendue en première ligne');
        return;
      case '999':
        if (i !== dernierConnu) malPlacee('attendue en dernière ligne');
        return;
      case '001':
        fermerDossier();
        dossier = { numero, ferme: false, numeroFin: null };
        evt = null;
        benef = null;
        return;
    }

    const { parent, role } = REGLES[code];
    const detailParent = LIBELLE_PARENT[parent];

    if (role === 'ferme') {
      const niveau = parent === 'dossier' ? dossier : evt;
      if (niveau === null) {
        malPlacee(detailParent);
      } else if (niveau.ferme && niveau.numeroFin !== null) {
        enDouble(niveau.numeroFin);
      } else if (niveau.ferme) {
        malPlacee(detailParent);
      } else {
        if (parent === 'dossier') fermerEvenement();
        niveau.ferme = true;
        niveau.numeroFin = numero;
        benef = null;
      }
      return;
    }

    if (!estOuvert(parent)) malPlacee(detailParent);

    if (role === 'ouvre') {
      if (parent === 'dossier') {
        fermerEvenement();
        evt = { numero, ferme: false, numeroFin: null, uniques: new Map() };
      } else {
        benef = { uniques: new Map() };
      }
      return;
    }

    if (role === 'unique' && estOuvert(parent)) {
      const uniques = parent === 'evenement' ? evt?.uniques : benef?.uniques;
      if (uniques) enregistrerUnique(uniques);
    }
  });

  fermerDossier();
  if (!lignes.some((ligne) => ligne.code === '000')) {
    anomalies.push(
      anomalie(
        'entite-absente',
        null,
        'Entité 000 absente : le fichier doit commencer par une 000.',
      ),
    );
  }
  if (!lignes.some((ligne) => ligne.code === '999')) {
    anomalies.push(
      anomalie(
        'entite-absente',
        null,
        'Entité 999 absente : le fichier doit se terminer par une 999.',
      ),
    );
  }
  return anomalies;
}
