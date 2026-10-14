import type { Stockage } from '../../adapters/stockage';
import type { Mode } from '@shared/schemas/config';
import type { NiveauJournal } from '@shared/schemas/journal';
import type { EtatJournal } from '@shared/types/journal';
import type { ErreurStockage, ResultatStockage } from '@shared/types/stockage';
import { cheminFichierSession, encoderLignes, formaterEntete, formaterLigne } from './format';

export interface ParametresSessionJournal {
  stockage: Stockage;
  /** Horloge injectable pour les tests. */
  maintenant: () => Date;
  /** Compte Windows brut. */
  compte: string;
  poste: string;
  mode: Mode;
  version: string;
}

export type ResultatFinSession =
  { ok: true } | { ok: false; erreur: ErreurStockage; lignesPerdues: number };

export interface SessionEcriture {
  /** `AAAA/MM/nom.txt`, relatif à l'emplacement `journal`. */
  readonly chemin: string;
  /**
   * Écrit l'en-tête : c'est le test d'écriture du dossier `Journal`. Peut être rappelée après un
   * échec (« Réessayer ») : l'en-tête n'est jamais écrit deux fois, le nom reste le même.
   */
  ouvrir(): Promise<ResultatStockage<void>>;
  /**
   * Ajoute un évènement. Ne rejette jamais : en cas d'échec d'écriture, la ligne reste en mémoire
   * et sera réécrite à l'ajout suivant. Les écritures sont sérialisées pour garder l'ordre.
   *
   * Contenu interdit : aucun secret, aucun identifiant VEOS, aucune valeur lue dans un fichier
   * AC056 (données personnelles). Noms de fichiers, comptages et messages seulement.
   */
  ajouter(niveau: NiveauJournal, message: string): Promise<void>;
  /**
   * Ajoute « Fin de session » (une seule fois) et écrit ce qui reste en mémoire. Rappelée après un
   * échec, elle retente seulement l'écriture.
   */
  terminer(): Promise<ResultatFinSession>;
  etat(): EtatJournal;
  /** Notifié seulement quand l'état change. Renvoie la fonction de désabonnement. */
  surChangement(rappel: (etat: EtatJournal) => void): () => void;
}

/** Une exception inattendue du stockage (contrat : il renvoie des résultats) devient une erreur typée. */
function erreurInattendue(erreur: unknown): ErreurStockage {
  return {
    code: 'erreur-systeme',
    emplacement: 'journal',
    chemin: '',
    message: erreur instanceof Error ? erreur.message : String(erreur),
  };
}

/**
 * Session du journal : un fichier par lancement de Flussi, écrit en ajout seul au fil de l'eau.
 * Nom et heure de début fixés à la création de l'objet.
 */
export function creerSessionJournal(parametres: ParametresSessionJournal): SessionEcriture {
  const { stockage, maintenant, compte, poste, mode, version } = parametres;
  const debut = maintenant();
  const chemin = cheminFichierSession(debut, compte);

  /** Lignes déjà formatées, pas encore écrites (ou en cours d'écriture). */
  const tampon: string[] = [];
  let enteteAjoutee = false;
  let finAjoutee = false;
  let terminee = false;
  /** Vrai après un échec d'écriture, jusqu'à ce que le tampon soit vidé. */
  let enEchec = false;
  let chaine: Promise<unknown> = Promise.resolve();
  const ecouteurs = new Set<(etat: EtatJournal) => void>();
  let dernierEtat: EtatJournal = { enregistre: true, lignesEnAttente: 0 };

  function etat(): EtatJournal {
    return enEchec
      ? { enregistre: false, lignesEnAttente: tampon.length }
      : { enregistre: true, lignesEnAttente: 0 };
  }

  function notifierSiChangement(): void {
    const courant = etat();
    if (
      courant.enregistre === dernierEtat.enregistre &&
      courant.lignesEnAttente === dernierEtat.lignesEnAttente
    ) {
      return;
    }
    dernierEtat = courant;
    for (const rappel of ecouteurs) {
      try {
        rappel(courant);
      } catch (erreur) {
        console.error('[main] Écouteur du journal en erreur :', erreur);
      }
    }
  }

  /** Écrit tout le tampon en un seul ajout ; file de promesses pour garder l'ordre. */
  function vider(): Promise<ResultatStockage<void>> {
    const tache = chaine.then(async (): Promise<ResultatStockage<void>> => {
      if (tampon.length === 0) {
        enEchec = false;
        notifierSiChangement();
        return { ok: true, valeur: undefined };
      }
      // Les lignes ajoutées pendant l'écriture restent derrière celles-ci dans le tampon
      const nombre = tampon.length;
      let resultat: ResultatStockage<void>;
      try {
        resultat = await stockage.ajouter(
          'journal',
          chemin,
          encoderLignes(tampon.slice(0, nombre)),
        );
      } catch (erreur) {
        resultat = { ok: false, erreur: erreurInattendue(erreur) };
      }
      if (resultat.ok) {
        tampon.splice(0, nombre);
        enEchec = false;
      } else {
        enEchec = true;
      }
      notifierSiChangement();
      return resultat;
    });
    chaine = tache;
    return tache;
  }

  return {
    chemin,

    async ouvrir() {
      if (!enteteAjoutee) {
        enteteAjoutee = true;
        tampon.push(...formaterEntete({ debut, compte, poste, mode, version }));
      }
      return vider();
    },

    async ajouter(niveau, message) {
      if (terminee) return;
      try {
        tampon.push(formaterLigne(maintenant(), niveau, message));
        await vider();
      } catch (erreur) {
        console.error("[main] Erreur d'écriture du journal :", erreur);
      }
    },

    async terminer() {
      if (!finAjoutee) {
        finAjoutee = true;
        tampon.push(formaterLigne(maintenant(), 'TITRE', 'Fin de session'));
      }
      const resultat = await vider();
      if (resultat.ok) {
        terminee = true;
        return { ok: true };
      }
      return { ok: false, erreur: resultat.erreur, lignesPerdues: tampon.length };
    },

    etat,

    surChangement(rappel) {
      ecouteurs.add(rappel);
      return () => {
        ecouteurs.delete(rappel);
      };
    },
  };
}
