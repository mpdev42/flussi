// Analyse complète d'un fichier AC056 au chargement, à parité de `ChargerFichierAc056`
// (`fmain.pas:2697-2766`) : lecture, puis contrôle complet si ce n'est pas un rejet
// (`if not FFichierRejet then ControlerEvenements`). `controlerAc056` renvoie déjà une liste vide
// pour un rejet. Le résultat traverse l'IPC Electron (clonage structuré) : il n'est fait que
// d'objets simples, de tableaux, de chaînes, de nombres, de booléens et de `null`.
import { controlerAc056 } from './controle';
import { lireAc056 } from './lecteur';
import type { AnomalieAc056, CodeAnomalie, FichierAc056, Provenance } from './modele';
import { CODES_STRUCTURE } from './structure';

export interface AnalyseAc056 {
  readonly fichier: FichierAc056;
  /**
   * Anomalies de lecture et de contrôle : niveau fichier (`ligne: null`) d'abord, puis par numéro
   * de ligne. À ligne égale, l'ordre d'origine est conservé (lecture avant contrôle).
   */
  readonly anomalies: readonly AnomalieAc056[];
  /** Nombre d'anomalies bloquantes. */
  readonly erreurs: number;
  readonly nonBloquantes: number;
  /** Nombre d'anomalies de structure (longueur, entité inconnue, mal placée, en double, absente). */
  readonly structure: number;
  /** Nombre de lignes qui portent un message MSP ; 0 pour un fichier VEOS. */
  readonly lignesRejetees: number;
}

const STRUCTURE: ReadonlySet<CodeAnomalie> = new Set(CODES_STRUCTURE);

export function analyserAc056(octets: Uint8Array, provenance: Provenance): AnalyseAc056 {
  const { fichier, anomalies: lecture } = lireAc056(octets, provenance);
  // Tri stable : à ligne égale, l'ordre de la concaténation (lecture puis contrôle) est gardé.
  const anomalies = [...lecture, ...controlerAc056(fichier)].sort(
    (a, b) => (a.ligne ?? 0) - (b.ligne ?? 0),
  );
  const erreurs = anomalies.filter((a) => a.bloquante).length;
  return Object.freeze({
    fichier,
    anomalies: Object.freeze(anomalies),
    erreurs,
    nonBloquantes: anomalies.length - erreurs,
    structure: anomalies.filter((a) => STRUCTURE.has(a.code)).length,
    lignesRejetees: fichier.lignes.filter((ligne) => ligne.rejet !== undefined).length,
  });
}
