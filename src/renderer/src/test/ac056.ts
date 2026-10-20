// Fabriques de données AC056 pour les tests du renderer (valeurs fictives). Jamais importées hors
// des tests.

import {
  analyserAc056,
  bilanAnalyse,
  type AnalyseAc056,
  type AnomalieAc056,
  type Provenance,
} from '@shared/domain/ac056';
import {
  fichierSynthetique,
  lignesCompletes,
  ligneSynthetique,
} from '@shared/test/ac056-synthetique';
import type { FichierListeAc056, OuvertureAc056 } from '@shared/types';

export const NOM_VEOS = 'AC056COUR_20261017.txt';
export const NOM_REJET = 'AC056COUR_REJ_20261017.txt';

export function fichierListe(surcharge: Partial<FichierListeAc056> = {}): FichierListeAc056 {
  return {
    emplacement: 'in',
    nom: NOM_VEOS,
    taille: 626_688,
    modification: new Date(2026, 9, 17, 8, 5).toISOString(),
    provenance: 'veos',
    ...surcharge,
  };
}

/** Analyse minimale : seuls les compteurs et les anomalies lus par l'écran sont renseignés. */
export function analyse(
  surcharge: Partial<Omit<AnalyseAc056, 'fichier'>> & { provenance?: Provenance } = {},
): AnalyseAc056 {
  const { provenance = 'veos', ...reste } = surcharge;
  return {
    fichier: { provenance, bom: false, lignes: [], e000: null, dossiers: [], e999: null },
    anomalies: [],
    erreurs: 0,
    nonBloquantes: 0,
    structure: 0,
    lignesRejetees: 0,
    ...reste,
  };
}

/**
 * Analyse réelle (`analyserAc056`) d'un fichier synthétique, clonée comme après l'IPC : objets non
 * gelés, ce que reçoit l'écran.
 */
export function analyseSynthetique(
  lignes: readonly string[],
  provenance: Provenance = 'veos',
): AnalyseAc056 {
  return structuredClone(analyserAc056(fichierSynthetique(lignes), provenance));
}

/** Ouverture réussie d'un fichier synthétique (analyse réelle, clonée). */
export function ouvertureSynthetique(
  nom: string,
  lignes: readonly string[],
  emplacement: 'in' | 'out' = 'in',
): OuvertureAc056 {
  const provenance: Provenance = nom.startsWith('AC056COUR_REJ_') ? 'rejet' : 'veos';
  return {
    ok: true,
    emplacement,
    nom,
    provenance,
    analyse: analyseSynthetique(lignes, provenance),
  };
}

export function anomalieFichierVide(): AnomalieAc056 {
  return {
    code: 'fichier-vide',
    ligne: null,
    message: 'Le fichier est vide : aucune ligne AC056.',
    bloquante: true,
  };
}

export function ouvertureReussie(
  nom: string,
  surcharge: Partial<Omit<AnalyseAc056, 'fichier'>> = {},
  emplacement: 'in' | 'out' = 'in',
): OuvertureAc056 {
  const provenance: Provenance = nom.startsWith('AC056COUR_REJ_') ? 'rejet' : 'veos';
  return { ok: true, emplacement, nom, provenance, analyse: analyse({ provenance, ...surcharge }) };
}

/**
 * Fichier complet fictif (4 évènements : dossiers 1 et 2, évènements 1 et 2) avec deux erreurs de
 * contrôle : code postal de 4 caractères dans la 120 de l'évènement 2 du dossier 1 (évènement 1 de
 * la liste), `!` dans le nom de la 405 du second bénéficiaire de l'évènement 1 du dossier 2
 * (évènement 2 de la liste).
 */
export function lignesAvecErreurs(): string[] {
  return lignesCompletes().map((ligne) => {
    const code = ligne.slice(22, 25);
    const dossier = ligne.slice(9, 17);
    const evenement = ligne.slice(17, 20);
    const rang = ligne.slice(20, 22);
    const entete = { numEmetteur: 'TEST', numDossier: dossier, numEvt: evenement, rang };
    if (code === '120' && dossier === '00000001' && evenement === '002') {
      return ligneSynthetique('120', {
        ...entete,
        libelleVoie: 'RUE DE TEST',
        codePostalLocalite: '7500',
        libelleLocalite: 'TESTVILLE',
      });
    }
    if (code === '405' && dossier === '00000002' && evenement === '001' && rang === '02') {
      return ligneSynthetique('405', {
        ...entete,
        nom: 'DUP!ONT',
        prenom1: 'TEST',
        numInsee: '1000000000000',
      });
    }
    return ligne;
  });
}

/**
 * Ouverture réussie dont l'analyse reçoit des anomalies en plus (cas que les règles ne produisent
 * pas facilement). Le bilan est refait par le domaine (`bilanAnalyse` : tri, erreurs, structure),
 * puis cloné comme après l'IPC. Des anomalies de CONTRÔLE (par exemple `caractere-interdit`, avec
 * `champ` et `consigne`) : un code de structure ferait de l'ajout un fichier mal formé, et le domaine
 * ne porte jamais de `champ` sur une anomalie de structure.
 */
export function ouvertureAvecAnomalies(
  nom: string,
  lignes: readonly string[],
  ajout: (analyse: AnalyseAc056) => readonly AnomalieAc056[],
): OuvertureAc056 {
  const ouverture = ouvertureSynthetique(nom, lignes);
  if (!ouverture.ok) return ouverture;
  const { fichier, anomalies } = ouverture.analyse;
  const analyse = structuredClone(
    bilanAnalyse(fichier, [...anomalies, ...ajout(ouverture.analyse)]),
  );
  return { ...ouverture, analyse };
}
