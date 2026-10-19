// Fabriques de données AC056 pour les tests du renderer (valeurs fictives). Jamais importées hors
// des tests.

import type { AnalyseAc056, AnomalieAc056, Provenance } from '@shared/domain/ac056';
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
