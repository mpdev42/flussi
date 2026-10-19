import type { Stockage } from '../../adapters/stockage';
import { analyserAc056, provenanceDepuisNom, type AnalyseAc056 } from '@shared/domain/ac056';
import type {
  EmplacementAc056,
  ErreurAc056,
  FichierListeAc056,
  ListeAc056,
  OuvertureAc056,
} from '@shared/types/ac056';
import { nomFichierAc056Schema } from '@shared/schemas/ac056';
import type { CodeErreurStockage, ErreurStockage } from '@shared/types/stockage';
import type { SessionEcriture } from '../journal';

// Service Ac056 : liste des fichiers de `IN` et de `OUT`, lecture et analyse d'un fichier (domaine
// AC056), trace au journal. Rien n'est écrit sur le stockage. Le journal ne reçoit que le nom du
// fichier, des nombres et des résultats : jamais une valeur AC056 (données personnelles).

export interface DependancesAc056 {
  stockage: Pick<Stockage, 'lister' | 'lire'>;
  journal: Pick<SessionEcriture, 'ajouter'>;
}

export interface ServiceAc056 {
  /** Fichiers `.txt` ouvrables de `IN` et de `OUT`, du plus récent au plus ancien. */
  lister(): Promise<ListeAc056>;
  /** Lit le fichier une seule fois, l'analyse (lecture et contrôle) et trace le résultat. */
  ouvrir(emplacement: EmplacementAc056, nom: string): Promise<OuvertureAc056>;
}

/**
 * Cause de l'échec, en français, sans chemin : le message de l'adapter peut citer le lecteur ou le
 * partage (`lecteur-indisponible`) ou la raison d'un chemin refusé, donc il n'est jamais repris.
 * Phrase sans majuscule ni point final : l'écran la place après une phrase d'introduction.
 */
const MESSAGES_ERREUR: Record<CodeErreurStockage, string> = {
  'lecteur-indisponible': 'lecteur de travail non monté ou déconnecté',
  'dossier-absent': 'dossier de travail absent ou inaccessible',
  'acces-refuse': 'accès refusé, droits insuffisants ou fichier verrouillé par la synchronisation',
  verrou:
    'fichier verrouillé (synchronisation OneDrive ou autre programme), toujours occupé après plusieurs tentatives',
  introuvable: 'fichier introuvable',
  'chemin-refuse': 'nom de fichier refusé',
  'erreur-systeme': 'erreur système inattendue',
};

function versErreurAc056(erreur: ErreurStockage): ErreurAc056 {
  return { code: erreur.code, message: MESSAGES_ERREUR[erreur.code] };
}

const MESSAGE_ANALYSE_IMPOSSIBLE = "erreur inattendue à l'analyse du fichier";

/** `1 erreur`, `3 erreurs` (0 et 1 au singulier, comme `pluralize` du renderer). */
function compter(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n <= 1 ? singulier : pluriel}`;
}

/** Plus récent d'abord ; sans date en dernier ; à date égale, ordre alphabétique des noms. */
function comparerFichiers(a: FichierListeAc056, b: FichierListeAc056): number {
  if (a.modification !== b.modification) {
    if (a.modification === null) return 1;
    if (b.modification === null) return -1;
    // Même format ISO UTC partout : l'ordre des chaînes est l'ordre chronologique
    return a.modification < b.modification ? 1 : -1;
  }
  return a.nom.localeCompare(b.nom, 'fr');
}

/** Message de réussite du chargement (nom du fichier, nombres seulement). */
function messageChargement(nom: string, analyse: AnalyseAc056, rejet: boolean): string {
  if (rejet) {
    const lignes =
      analyse.lignesRejetees === 0
        ? 'aucune ligne rejetée'
        : compter(analyse.lignesRejetees, 'ligne rejetée', 'lignes rejetées');
    return `Fichier ${nom} chargé : ${lignes}`;
  }
  const erreurs =
    analyse.erreurs === 0 ? 'aucune erreur' : compter(analyse.erreurs, 'erreur', 'erreurs');
  const nonBloquantes =
    analyse.nonBloquantes > 0
      ? `, ${compter(analyse.nonBloquantes, 'anomalie non bloquante', 'anomalies non bloquantes')}`
      : '';
  return `Fichier ${nom} chargé : ${erreurs}${nonBloquantes}`;
}

export function creerServiceAc056({ stockage, journal }: DependancesAc056): ServiceAc056 {
  async function listerEmplacement(
    emplacement: EmplacementAc056,
  ): Promise<{ ok: true; fichiers: FichierListeAc056[] } | { ok: false; erreur: ErreurAc056 }> {
    const resultat = await stockage.lister(emplacement, '', { avecInfos: true });
    if (!resultat.ok) return { ok: false, erreur: versErreurAc056(resultat.erreur) };

    // Même règle que `ac056:ouvrir` : tout fichier listé peut être ouvert
    const fichiers = resultat.valeur
      .filter((e) => e.type === 'fichier' && nomFichierAc056Schema.safeParse(e.nom).success)
      .map((e): FichierListeAc056 => ({
        emplacement,
        nom: e.nom,
        taille: e.taille,
        modification: e.modification,
        // Un rejet peut se trouver dans IN, un fichier VEOS dans OUT : seul le nom compte
        provenance: provenanceDepuisNom(e.nom),
      }))
      .sort(comparerFichiers);
    return { ok: true, fichiers };
  }

  return {
    async lister() {
      const [entrees, sorties] = await Promise.all([
        listerEmplacement('in'),
        listerEmplacement('out'),
      ]);
      if (!entrees.ok) return entrees;
      if (!sorties.ok) return sorties;
      return { ok: true, in: entrees.fichiers, out: sorties.fichiers };
    },

    async ouvrir(emplacement, nom) {
      // Pas d'attente : l'ordre des lignes est garanti par le journal, la lecture démarre aussitôt
      void journal.ajouter('TITRE', 'Charger');

      const lecture = await stockage.lire(emplacement, nom);
      if (!lecture.ok) {
        const erreur = versErreurAc056(lecture.erreur);
        void journal.ajouter('ERREUR', `Fichier ${nom} non chargé : ${erreur.message}`);
        return { ok: false, erreur };
      }

      const provenance = provenanceDepuisNom(nom);
      let analyse: AnalyseAc056;
      try {
        analyse = analyserAc056(lecture.valeur, provenance);
      } catch {
        // Jamais le message de l'exception : il pourrait citer un extrait du fichier
        void journal.ajouter('ERREUR', `Fichier ${nom} non chargé : ${MESSAGE_ANALYSE_IMPOSSIBLE}`);
        return {
          ok: false,
          erreur: { code: 'erreur-systeme', message: MESSAGE_ANALYSE_IMPOSSIBLE },
        };
      }

      if (analyse.anomalies.some((a) => a.code === 'fichier-vide')) {
        // L'écran affiche « Ce fichier n'est pas un fichier AC056 lisible » : pas de « chargé »
        void journal.ajouter('ERREUR', `Fichier ${nom} illisible : fichier vide`);
      } else {
        void journal.ajouter('SUCCES', messageChargement(nom, analyse, provenance === 'rejet'));
        if (provenance === 'veos' && analyse.structure > 0) {
          void journal.ajouter('ERREUR', `Fichier ${nom} mal formé : relancez l'export VEOS`);
        }
      }

      return { ok: true, emplacement, nom, provenance, analyse };
    },
  };
}
