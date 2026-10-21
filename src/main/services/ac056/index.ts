import { createHash } from 'node:crypto';
import type { Stockage } from '../../adapters/stockage';
import {
  analyserAc056,
  preparerEnregistrement,
  provenanceDepuisNom,
  type AnalyseAc056,
} from '@shared/domain/ac056';
import type {
  CodeErreurEnregistrementAc056,
  EmplacementAc056,
  EnregistrementAc056,
  ErreurAc056,
  ErreurEnregistrementAc056,
  FichierListeAc056,
  ListeAc056,
  OuvertureAc056,
} from '@shared/types/ac056';
import { nomFichierAc056Schema, type DemandeEnregistrementAc056 } from '@shared/schemas/ac056';
import type { CodeErreurStockage, ErreurStockage } from '@shared/types/stockage';
import type { SessionEcriture } from '../journal';

// Service Ac056 : liste des fichiers de `IN` et de `OUT`, lecture et analyse d'un fichier (domaine
// AC056), trace au journal. L'ouverture n'écrit rien ; l'enregistrement rejoue les corrections de
// l'écran sur les octets relus, copie l'original puis remplace le fichier. Le journal ne reçoit que
// le nom du fichier, des nombres et des résultats : jamais une valeur AC056 (données personnelles).

export interface DependancesAc056 {
  stockage: Pick<Stockage, 'lister' | 'lire' | 'ecrire'>;
  journal: Pick<SessionEcriture, 'ajouter'>;
}

export interface ServiceAc056 {
  /** Fichiers `.txt` ouvrables de `IN` et de `OUT`, du plus récent au plus ancien. */
  lister(): Promise<ListeAc056>;
  /** Lit le fichier une seule fois, l'analyse (lecture et contrôle) et trace le résultat. */
  ouvrir(emplacement: EmplacementAc056, nom: string): Promise<OuvertureAc056>;
  /**
   * Relit le fichier, vérifie son empreinte, rejoue les corrections de l'écran, copie l'original
   * (une seule fois) puis remplace le fichier. Un seul enregistrement à la fois.
   */
  enregistrer(demande: DemandeEnregistrementAc056): Promise<EnregistrementAc056>;
  /** Résolue quand aucun enregistrement n'est en cours (tout de suite sinon) ; ne rejette jamais. */
  attendreEnregistrement(): Promise<void>;
  /** Fichier aux corrections non enregistrées, signalé par l'écran ; `null` : aucun. */
  signalerModifications(fichier: { emplacement: EmplacementAc056; nom: string } | null): void;
  /** Nom du fichier aux corrections non enregistrées (boîte de fermeture), sinon `null`. */
  fichierModifie(): string | null;
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

/** Refus propres à l'enregistrement, même présentation que `MESSAGES_ERREUR`. */
const MESSAGES_REFUS_ENREGISTREMENT: Record<
  Exclude<CodeErreurEnregistrementAc056, CodeErreurStockage>,
  string
> = {
  'fichier-modifie':
    'le fichier a changé depuis son ouverture : rechargez-le puis refaites les corrections',
  'fichier-mal-forme': "fichier mal formé : relancez l'export VEOS",
  'fichier-rejet': 'un fichier de rejet est en lecture seule',
  'correction-refusee': "une correction n'a pas pu être appliquée : rechargez le fichier",
  'enregistrement-en-cours': 'un enregistrement est déjà en cours',
};

/** Dossier de la copie de l'original, dans celui du fichier. */
const DOSSIER_ORIGINAUX = 'Originaux';

const MESSAGE_ANALYSE_IMPOSSIBLE = "erreur inattendue à l'analyse du fichier";

function empreinteDe(octets: Uint8Array): string {
  return createHash('sha256').update(octets).digest('hex');
}

/** `1 erreur`, `3 erreurs` (0 et 1 au singulier, comme `pluralize` du renderer). */
function compter(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n <= 1 ? singulier : pluriel}`;
}

/** `aucun champ modifié`, `1 champ modifié`, puis `, 2 erreurs restantes` s'il en reste. */
function messageEnregistre(nom: string, champsModifies: number, erreurs: number): string {
  const champs =
    champsModifies === 0
      ? 'aucun champ modifié'
      : compter(champsModifies, 'champ modifié', 'champs modifiés');
  const restantes =
    erreurs > 0 ? `, ${compter(erreurs, 'erreur restante', 'erreurs restantes')}` : '';
  return `Fichier ${nom} enregistré : ${champs}${restantes}`;
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

  // Enregistrement en cours (sa promesse ne rejette jamais) et fichier aux corrections non écrites
  let enCours: Promise<EnregistrementAc056> | null = null;
  let fichierSignale: { emplacement: EmplacementAc056; nom: string } | null = null;

  /** Trace l'échec (cause sans chemin ni valeur AC056) et le renvoie à l'écran. */
  function echec(
    nom: string,
    code: CodeErreurEnregistrementAc056,
    message: string,
  ): { ok: false; erreur: ErreurEnregistrementAc056 } {
    void journal.ajouter('ERREUR', `Fichier ${nom} non enregistré : ${message}`);
    return { ok: false, erreur: { code, message } };
  }

  function echecStockage(nom: string, erreur: ErreurStockage) {
    return echec(nom, erreur.code, MESSAGES_ERREUR[erreur.code]);
  }

  async function enregistrerFichier(
    demande: DemandeEnregistrementAc056,
  ): Promise<EnregistrementAc056> {
    // Pas d'attente : l'ordre des lignes est garanti par le journal
    void journal.ajouter('TITRE', 'Enregistrer');
    try {
      return await enregistrerOctets(demande);
    } catch (erreur) {
      // Seul le nom de l'exception est tracé en console : son message pourrait citer un extrait du
      // fichier ou un chemin, jamais repris
      console.error(
        "[ac056] Exception inattendue à l'enregistrement :",
        erreur instanceof Error ? erreur.name : typeof erreur,
      );
      return echec(demande.nom, 'erreur-systeme', MESSAGES_ERREUR['erreur-systeme']);
    }
  }

  /** Les corrections de ce fichier sont écrites (ou déjà écrites) : la fermeture ne pose plus la question. */
  function effacerSignal(emplacement: EmplacementAc056, nom: string): void {
    if (fichierSignale?.emplacement === emplacement && fichierSignale.nom === nom) {
      fichierSignale = null;
    }
  }

  async function enregistrerOctets(
    demande: DemandeEnregistrementAc056,
  ): Promise<EnregistrementAc056> {
    const { emplacement, nom } = demande;

    const lecture = await stockage.lire(emplacement, nom);
    if (!lecture.ok) return echecStockage(nom, lecture.erreur);
    const octetsLus = lecture.valeur;

    if (empreinteDe(octetsLus) !== demande.empreinte) {
      return echec(nom, 'fichier-modifie', MESSAGES_REFUS_ENREGISTREMENT['fichier-modifie']);
    }

    const preparation = preparerEnregistrement(
      octetsLus,
      provenanceDepuisNom(nom),
      demande.corrections,
    );
    if (!preparation.ok) {
      return echec(nom, preparation.code, MESSAGES_REFUS_ENREGISTREMENT[preparation.code]);
    }

    if (preparation.identique) {
      // Rien à écrire : les corrections de l'écran sont déjà dans le fichier
      effacerSignal(emplacement, nom);
      void journal.ajouter('INFO', `Fichier ${nom} déjà à jour : rien à enregistrer`);
      return {
        ok: true,
        ecrit: false,
        analyse: preparation.analyse,
        empreinte: demande.empreinte,
        champsModifies: 0,
        copieOriginal: false,
      };
    }

    // Copie de l'original d'abord, jamais écrasée ensuite : on garde la version reçue de VEOS. Si
    // elle échoue, le fichier n'est pas touché.
    const copie = await stockage.ecrire(
      emplacement,
      `${DOSSIER_ORIGINAUX}/${nom}`,
      octetsLus,
      'creer',
    );
    if (!copie.ok) return echecStockage(nom, copie.erreur);
    const copieEcrite = copie.valeur === 'ecrit';
    if (copieEcrite) {
      void journal.ajouter(
        'INFO',
        `Original de ${nom} copié dans ${emplacement.toUpperCase()}\\${DOSSIER_ORIGINAUX}`,
      );
    }

    const ecriture = await stockage.ecrire(emplacement, nom, preparation.octets, 'remplacer');
    if (!ecriture.ok) return echecStockage(nom, ecriture.erreur);

    if (preparation.lignesVides > 0) {
      const lignes = compter(preparation.lignesVides, 'ligne vide', 'lignes vides');
      const suppression = preparation.lignesVides <= 1 ? 'supprimée' : 'supprimées';
      void journal.ajouter('INFO', `Fichier ${nom} : ${lignes} ${suppression}`);
    }
    if (preparation.ctrlZ) {
      void journal.ajouter(
        'INFO',
        `Fichier ${nom} : caractère de fin de fichier (Ctrl-Z) supprimé`,
      );
    }
    void journal.ajouter(
      'SUCCES',
      messageEnregistre(nom, preparation.champsModifies, preparation.analyse.erreurs),
    );

    // Les corrections sont écrites : la fermeture ne pose plus la question pour ce fichier
    effacerSignal(emplacement, nom);

    return {
      ok: true,
      ecrit: true,
      analyse: preparation.analyse,
      empreinte: empreinteDe(preparation.octets),
      champsModifies: preparation.champsModifies,
      copieOriginal: copieEcrite,
    };
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

      // Empreinte des octets lus : l'enregistrement refusera d'écrire si le fichier a changé
      const empreinte = empreinteDe(lecture.valeur);
      return { ok: true, emplacement, nom, provenance, analyse, empreinte };
    },

    async enregistrer(demande) {
      // Contrôle et prise du verrou dans le même tour : deux appels ne peuvent pas passer ensemble
      if (enCours !== null) {
        return {
          ok: false,
          erreur: {
            code: 'enregistrement-en-cours',
            message: MESSAGES_REFUS_ENREGISTREMENT['enregistrement-en-cours'],
          },
        };
      }
      const execution = enregistrerFichier(demande);
      enCours = execution;
      try {
        return await execution;
      } finally {
        enCours = null;
      }
    },

    async attendreEnregistrement() {
      // `enregistrerFichier` ne rejette jamais
      await enCours;
    },

    signalerModifications(fichier) {
      fichierSignale = fichier;
    },

    fichierModifie() {
      return fichierSignale?.nom ?? null;
    },
  };
}
