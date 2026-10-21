import type { CodeErreurStockage, Emplacement, ErreurStockage } from './types';

// Traduction des codes système en erreurs typées et messages lisibles. Pur.
// Jamais le contenu d'un fichier dans une erreur : seulement l'emplacement, le chemin et la cause.

const CODES_RESEAU = ['ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'ENOTCONN'];

/** Nom affiché d'un emplacement (boîte de démarrage). */
export const NOMS_EMPLACEMENTS: Record<Emplacement, string> = {
  in: 'IN',
  out: 'OUT',
  journal: 'Journal',
};

/** Contexte d'une erreur : l'emplacement, la racine de son dossier et le chemin visé. */
export interface ContexteErreur {
  emplacement: Emplacement;
  /** Racine de l'emplacement (dossier configuré). */
  racine: string;
  /** Chemin absolu visé par l'opération. */
  chemin: string;
}

/** Code système d'une exception (`EBUSY`, `ENOENT`…), `undefined` s'il manque. */
export function codeSysteme(erreur: unknown): string | undefined {
  if (typeof erreur !== 'object' || erreur === null) return undefined;
  const code = (erreur as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** Erreurs réseau : le lecteur ou le partage ne répond plus. */
export function estCodeReseau(code: string | undefined): boolean {
  return code !== undefined && CODES_RESEAU.includes(code);
}

/** `EBUSY` et `EPERM` : seuls codes qui justifient une nouvelle tentative (verrou OneDrive). */
export function estCodeVerrou(code: string | undefined): boolean {
  return code === 'EBUSY' || code === 'EPERM';
}

/**
 * Message de `lecteur-indisponible` d'après la racine du lecteur (`win32.parse(racine).root` :
 * `P:\` ou `\\serveur\partage\`).
 */
export function messageLecteurIndisponible(racineLecteur: string): string {
  if (/^[A-Za-z]:/.test(racineLecteur)) {
    return `lecteur ${racineLecteur.slice(0, 2)} non monté ou déconnecté.`;
  }
  return `partage réseau ${racineLecteur.replace(/\\+$/, '')} inaccessible.`;
}

export function creerErreur(
  code: CodeErreurStockage,
  emplacement: Emplacement,
  chemin: string,
  message: string,
): ErreurStockage {
  return { code, emplacement, chemin, message };
}

/**
 * Traduit un code système en erreur typée. `ENOENT` n'est pas traité ici : il demande un
 * diagnostic (`stat` de la racine puis du lecteur), fait par l'implémentation disque. Pour
 * `EBUSY` et `EPERM`, l'appelant ne traduit qu'après les nouvelles tentatives.
 *
 * `racineLecteur` n'est utilisée que pour les erreurs réseau (`lecteur-indisponible`).
 * `nouvellesTentatives` : nombre de nouvelles tentatives faites avant cet échec ; le message d'un
 * verrou ne les cite que s'il y en a eu.
 */
export function traduireCodeSysteme(
  code: string | undefined,
  contexte: ContexteErreur,
  racineLecteur: string,
  nouvellesTentatives = 0,
): ErreurStockage {
  const { emplacement, racine, chemin } = contexte;

  if (estCodeReseau(code)) {
    return creerErreur(
      'lecteur-indisponible',
      emplacement,
      racine,
      messageLecteurIndisponible(racineLecteur),
    );
  }

  switch (code) {
    case 'EACCES':
      return creerErreur(
        'acces-refuse',
        emplacement,
        chemin,
        'accès refusé : droits insuffisants.',
      );
    case 'EPERM':
      return creerErreur(
        'acces-refuse',
        emplacement,
        chemin,
        'accès refusé : droits insuffisants, ou fichier verrouillé par la synchronisation OneDrive.',
      );
    case 'EBUSY':
      return creerErreur(
        'verrou',
        emplacement,
        chemin,
        nouvellesTentatives > 0
          ? `fichier verrouillé (synchronisation OneDrive ou autre programme), toujours occupé après ${nouvellesTentatives} nouvelles tentatives.`
          : 'fichier verrouillé (synchronisation OneDrive ou autre programme).',
      );
    case 'ENOTDIR':
      return creerErreur('introuvable', emplacement, chemin, 'fichier ou dossier introuvable.');
    case 'EISDIR':
      return creerErreur('introuvable', emplacement, chemin, "ce chemin n'est pas un fichier.");
    default:
      return creerErreur(
        'erreur-systeme',
        emplacement,
        chemin,
        `erreur système inattendue (code ${code ?? 'inconnu'}).`,
      );
  }
}

/** Texte du détail de la boîte de démarrage : emplacement, chemin et cause probable de chaque erreur. */
export function formaterErreursStockage(erreurs: ErreurStockage[]): string {
  const blocs = erreurs.map(
    (e) => `- ${NOMS_EMPLACEMENTS[e.emplacement]} : ${e.chemin}\n  Cause probable : ${e.message}`,
  );

  return [
    blocs.join('\n'),
    'Vérifiez que le lecteur est connecté, puis cliquez sur « Réessayer ». Si le problème persiste, contactez le service informatique.',
  ].join('\n\n');
}
