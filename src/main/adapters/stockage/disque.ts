import * as fsPromises from 'node:fs/promises';
import { win32 } from 'node:path';
import { setTimeout as attendreTimer } from 'node:timers/promises';
import type { Configuration } from '@shared/schemas/config';
import { decouperCheminRelatif } from './chemins';
import { trouverCopiesConflit } from './conflits';
import {
  codeSysteme,
  creerErreur,
  estCodeVerrou,
  messageLecteurIndisponible,
  traduireCodeSysteme,
  type ContexteErreur,
} from './erreurs';
import type {
  ElementStockage,
  Emplacement,
  ErreurStockage,
  InfosFichier,
  OptionsStockageDisque,
  ResultatStockage,
  Stockage,
  SystemeFichiers,
} from './types';

// Implémentation disque de l'adapter `stockage` : les emplacements logiques pointent vers des
// dossiers configurés (le lecteur `P:` en v1.0). Les entrées-sorties passent par `SystemeFichiers`,
// injectable pour simuler un lecteur absent ou un verrou OneDrive dans les tests.

/** Contexte d'une erreur, plus les segments du nom relatif (vide pour la racine). */
interface CibleStockage extends ContexteErreur {
  segments: string[];
}

const EMPLACEMENTS: readonly Emplacement[] = ['in', 'out', 'journal'];

/** Attentes avant chaque nouvelle tentative : 3 nouvelles tentatives, environ 3,5 s au total. */
const DELAIS_NOUVELLES_TENTATIVES_MS = [500, 1000, 2000];

const systemeFichiersDisque: SystemeFichiers = {
  stat: (chemin) => fsPromises.stat(chemin),
  readdir: (chemin) => fsPromises.readdir(chemin, { withFileTypes: true }),
  opendir: (chemin) => fsPromises.opendir(chemin),
  readFile: (chemin) => fsPromises.readFile(chemin),
  appendFile: (chemin, octets) => fsPromises.appendFile(chemin, octets),
  mkdir: async (chemin) => {
    await fsPromises.mkdir(chemin);
  },
};

/**
 * Crée le stockage disque. Seuls `in`, `out` et `journal` de `dossiers` servent (`travail` est
 * ignoré : les trois dossiers sont déjà résolus par la configuration).
 */
export function creerStockageDisque(
  dossiers: Configuration['dossiers'],
  options: OptionsStockageDisque = {},
): Stockage {
  const fs = options.fs ?? systemeFichiersDisque;
  const attendre = options.attendre ?? ((ms: number) => attendreTimer(ms));

  /**
   * Exécute l'opération ENTIÈRE ; sur `EBUSY` ou `EPERM` seulement, la rejoue après 500, 1 000
   * puis 2 000 ms (4 essais au plus). Toute autre erreur est relancée aussitôt.
   */
  async function avecNouvellesTentatives<T>(operation: () => Promise<T>): Promise<T> {
    for (let essai = 0; ; essai++) {
      try {
        return await operation();
      } catch (erreur) {
        const delai = DELAIS_NOUVELLES_TENTATIVES_MS[essai];
        if (delai === undefined || !estCodeVerrou(codeSysteme(erreur))) throw erreur;
        await attendre(delai);
      }
    }
  }

  /** Racine absente : lecteur indisponible, dossier absent, ou (racine présente) élément introuvable. */
  async function diagnostiquerAbsence(
    contexte: ContexteErreur,
    racineLecteur: string,
  ): Promise<ErreurStockage> {
    const { emplacement, racine, chemin } = contexte;

    try {
      const infos = await fs.stat(racine);
      return infos.isDirectory()
        ? creerErreur('introuvable', emplacement, chemin, 'fichier ou dossier introuvable.')
        : creerErreur('dossier-absent', emplacement, racine, "ce chemin n'est pas un dossier.");
    } catch (erreur) {
      const code = codeSysteme(erreur);
      if (code !== 'ENOENT') return traduireCodeSysteme(code, contexte, racineLecteur);
    }

    // Racine absente : est-ce le lecteur (ou le partage) qui manque ? Si la racine du lecteur
    // ne répond pas, quel que soit le code (ENOENT, réseau, UNKNOWN, EIO… sur un partage
    // injoignable), c'est le lecteur qui est en cause. Seul un stat réussi mène à dossier-absent.
    if (racineLecteur !== '') {
      try {
        await fs.stat(racineLecteur);
      } catch {
        return creerErreur(
          'lecteur-indisponible',
          emplacement,
          racine,
          messageLecteurIndisponible(racineLecteur),
        );
      }
    }
    return creerErreur(
      'dossier-absent',
      emplacement,
      racine,
      'dossier absent : Flussi ne le crée pas, vérifiez le chemin dans la configuration.',
    );
  }

  async function traduire(erreur: unknown, contexte: ContexteErreur): Promise<ErreurStockage> {
    const code = codeSysteme(erreur);
    const racineLecteur = win32.parse(contexte.racine).root;
    return code === 'ENOENT'
      ? diagnostiquerAbsence(contexte, racineLecteur)
      : traduireCodeSysteme(code, contexte, racineLecteur);
  }

  /** Opération avec nouvelles tentatives, dont l'échec devient une erreur typée (jamais d'exception). */
  async function executer<T>(
    contexte: ContexteErreur,
    operation: () => Promise<T>,
  ): Promise<ResultatStockage<T>> {
    try {
      return { ok: true, valeur: await avecNouvellesTentatives(operation) };
    } catch (erreur) {
      return { ok: false, erreur: await traduire(erreur, contexte) };
    }
  }

  function refuserChemin(emplacement: Emplacement, raison: string): ResultatStockage<never> {
    return {
      ok: false,
      erreur: creerErreur('chemin-refuse', emplacement, dossiers[emplacement], raison),
    };
  }

  /** Contrôle le nom relatif (sans appel au système de fichiers) et construit le chemin absolu. */
  function resoudre(
    emplacement: Emplacement,
    nom: string,
    autoriserRacine = false,
  ): ResultatStockage<CibleStockage> {
    const racine = dossiers[emplacement];
    if (autoriserRacine && nom === '') {
      return { ok: true, valeur: { emplacement, racine, chemin: racine, segments: [] } };
    }
    const decoupe = decouperCheminRelatif(nom);
    if (!decoupe.ok) return refuserChemin(emplacement, decoupe.raison);
    const chemin = win32.join(racine, ...decoupe.segments);
    return { ok: true, valeur: { emplacement, racine, chemin, segments: decoupe.segments } };
  }

  /**
   * `stat` d'une entrée que `readdir` ne présente ni comme fichier ni comme dossier. `null` pour
   * un lien cassé.
   */
  async function statEntreeInconnue(chemin: string): Promise<InfosFichier | null> {
    try {
      return await fs.stat(chemin);
    } catch (erreur) {
      // Seul un lien cassé (ENOENT) est ignoré. Toute autre erreur remonte : un verrou passe par
      // les nouvelles tentatives, le reste devient l'erreur typée de `lister`, pour qu'une entrée
      // illisible ne disparaisse jamais de la liste sans erreur.
      if (codeSysteme(erreur) !== 'ENOENT') throw erreur;
      return null;
    }
  }

  /**
   * Taille et date d'un fichier. Un `stat` en échec (verrou, droits, fichier disparu entre le
   * `readdir` et le `stat`) donne `null` et `null` : le fichier reste dans la liste, seule
   * l'information manque. Pas de nouvelle tentative pour ces deux champs secondaires.
   */
  async function taillesEtDate(
    chemin: string,
  ): Promise<Pick<ElementStockage, 'taille' | 'modification'>> {
    try {
      return infosVersElement(await fs.stat(chemin));
    } catch {
      return { taille: null, modification: null };
    }
  }

  function infosVersElement(infos: InfosFichier): Pick<ElementStockage, 'taille' | 'modification'> {
    return {
      taille: infos.size,
      modification: Number.isFinite(infos.mtimeMs) ? new Date(infos.mtimeMs).toISOString() : null,
    };
  }

  return {
    async verifierAcces() {
      const erreurs: ErreurStockage[] = [];

      for (const emplacement of EMPLACEMENTS) {
        const racine = dossiers[emplacement];
        const resultat = await executer({ emplacement, racine, chemin: racine }, async () => {
          const infos = await fs.stat(racine);
          if (!infos.isDirectory()) return false;
          // Vrai test de lecture (fs.access ne lit pas les ACL sous Windows)
          const dossier = await fs.opendir(racine);
          await dossier.close();
          return true;
        });

        if (!resultat.ok) erreurs.push(resultat.erreur);
        else if (!resultat.valeur) {
          erreurs.push(
            creerErreur('dossier-absent', emplacement, racine, "ce chemin n'est pas un dossier."),
          );
        }
      }

      return erreurs.length === 0 ? { ok: true } : { ok: false, erreurs };
    },

    async lister(emplacement, sousDossier = '', options = {}) {
      const avecInfos = options.avecInfos ?? false;
      const cible = resoudre(emplacement, sousDossier, true);
      if (!cible.ok) return cible;
      const contexte = cible.valeur;
      const sansInfos = { taille: null, modification: null };

      return executer(contexte, async () => {
        const entrees = await fs.readdir(contexte.chemin);

        // Avec `avecInfos` : un stat par fichier, en parallèle (l'ordre de `readdir` est conservé).
        // Sans : aucun stat pour un fichier ordinaire (le journal peut en compter des milliers).
        const classes = await Promise.all(
          entrees.map(async (entree): Promise<ElementStockage | null> => {
            const base = { nom: entree.name, copieConflitProbable: false };
            const chemin = win32.join(contexte.chemin, entree.name);
            if (entree.isFile()) {
              return {
                ...base,
                type: 'fichier',
                ...(avecInfos ? await taillesEtDate(chemin) : sansInfos),
              };
            }
            if (entree.isDirectory()) {
              return { ...base, type: 'dossier', taille: null, modification: null };
            }
            // Ni fichier ni dossier pour le Dirent : fichier OneDrive « à la demande » (point
            // d'analyse présenté comme un lien symbolique), classé par stat (dont on garde la taille
            // et la date) ; sinon ignoré
            const infos = await statEntreeInconnue(chemin);
            if (infos?.isFile()) {
              return {
                ...base,
                type: 'fichier',
                ...(avecInfos ? infosVersElement(infos) : sansInfos),
              };
            }
            if (infos?.isDirectory()) {
              return { ...base, type: 'dossier', taille: null, modification: null };
            }
            return null;
          }),
        );
        const elements = classes.filter((e): e is ElementStockage => e !== null);

        const copies = trouverCopiesConflit(
          elements.filter((e) => e.type === 'fichier').map((e) => e.nom),
        );
        return elements.map((e) => ({ ...e, copieConflitProbable: copies.has(e.nom) }));
      });
    },

    async lire(emplacement, chemin) {
      const cible = resoudre(emplacement, chemin);
      if (!cible.ok) return cible;
      return executer(cible.valeur, () => fs.readFile(cible.valeur.chemin));
    },

    async ajouter(emplacement, chemin, octets) {
      const cible = resoudre(emplacement, chemin);
      if (!cible.ok) return cible;
      const contexte = cible.valeur;
      // Sous-dossiers intermédiaires : tous les segments sauf le nom du fichier
      const dossiersIntermediaires = contexte.segments.slice(0, -1);

      return executer(contexte, async () => {
        // Niveau par niveau et non récursif : si la racine de l'emplacement disparaît, le
        // premier mkdir échoue en ENOENT au lieu de recréer une arborescence parallèle
        let courant = contexte.racine;
        for (const segment of dossiersIntermediaires) {
          courant = win32.join(courant, segment);
          try {
            await fs.mkdir(courant);
          } catch (erreur) {
            if (codeSysteme(erreur) !== 'EEXIST') throw erreur;
          }
        }
        await fs.appendFile(contexte.chemin, octets);
      });
    },
  };
}
