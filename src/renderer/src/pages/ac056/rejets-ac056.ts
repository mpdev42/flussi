// Lignes rejetées d'un fichier de rejet MSP que l'écran range hors des évènements (pur, testable
// sans écran).
import type {
  CodeEntite,
  FichierAc056,
  IndexLignesAc056,
  MessageRejet,
} from '@shared/domain/ac056';

/** Ligne rejetée : numéro d'origine, entité (null : code illisible) et message de MSP. */
export interface LigneRejetee {
  readonly numero: number;
  readonly code: CodeEntite | null;
  readonly rejet: MessageRejet;
}

/**
 * Lignes qui portent un message de MSP et qu'aucun évènement ne contient : 000, 001, 995, 999,
 * lignes perdues ou mal placées. Dans l'ordre du fichier. Leur nombre vaut
 * `CompteursAc056.horsEvenement` de `compterLignesRejetees`.
 */
export function lignesRejeteesHorsEvenement(
  fichier: FichierAc056,
  index: IndexLignesAc056,
): readonly LigneRejetee[] {
  const lignes: LigneRejetee[] = [];
  fichier.lignes.forEach((ligne, indice) => {
    if (ligne.rejet === undefined) return;
    const rattachement = index.rattachements[indice];
    if (rattachement !== null && rattachement !== undefined) return;
    lignes.push({ numero: ligne.numero, code: ligne.code, rejet: ligne.rejet });
  });
  return lignes;
}
