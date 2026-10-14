import { trouverCopiesConflit, type Stockage } from '../../adapters/stockage';
import { analyserNomSession } from '@shared/schemas/journal';
import type { LigneJournal, SessionJournal } from '@shared/types/journal';
import type { ResultatStockage } from '@shared/types/stockage';
import { analyserContenu } from './format';

export interface HistoriqueJournal {
  /** Sous-dossiers `AAAA` de la racine du journal, en ordre croissant. */
  annees(): Promise<ResultatStockage<string[]>>;
  /** Sessions Flussi du dossier `AAAA/MM`, de la plus récente à la plus ancienne. */
  sessions(annee: string, mois: string): Promise<ResultatStockage<SessionJournal[]>>;
  /** Contenu d'un fichier de session, lu à la demande. */
  lire(chemin: string): Promise<ResultatStockage<LigneJournal[]>>;
}

/** Plus récent d'abord (date, heure), puis compte dans l'ordre alphabétique. */
function comparerSessions(a: SessionJournal, b: SessionJournal): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.heure !== b.heure) return a.heure < b.heure ? 1 : -1;
  return a.compte.localeCompare(b.compte, 'fr');
}

/**
 * Historique construit à partir des seuls noms de fichiers. Les journaux de Lazarus (RTF, sans
 * compte dans le nom) et son index, présents dans le même dossier, sont ignorés.
 * `cheminEnCours` : chemin relatif de la session de ce lancement, toujours placée en tête.
 */
export function creerHistoriqueJournal(
  stockage: Stockage,
  cheminEnCours: string,
): HistoriqueJournal {
  return {
    async annees() {
      const resultat = await stockage.lister('journal');
      if (!resultat.ok) return resultat;
      const annees = resultat.valeur
        .filter((e) => e.type === 'dossier' && /^\d{4}$/.test(e.nom))
        .map((e) => e.nom)
        .sort();
      return { ok: true, valeur: annees };
    },

    async sessions(annee, mois) {
      const resultat = await stockage.lister('journal', `${annee}/${mois}`);
      if (!resultat.ok) {
        // Dossier du mois absent : pas de session, ce n'est pas une erreur
        return resultat.erreur.code === 'introuvable' ? { ok: true, valeur: [] } : resultat;
      }

      const fichiers = resultat.valeur.filter(
        (e) => e.type === 'fichier' && analyserNomSession(e.nom) !== null,
      );
      // Recalculé sur les seuls noms Flussi : le marquage de `lister` prendrait
      // `AAAAMMJJ-HHMMSS-compte.txt` pour une copie du journal Lazarus `AAAAMMJJ-HHMMSS.txt`
      const copies = trouverCopiesConflit(fichiers.map((e) => e.nom));

      const sessions: SessionJournal[] = [];
      for (const { nom } of fichiers) {
        const analyse = analyserNomSession(nom);
        if (!analyse) continue;
        const chemin = `${annee}/${mois}/${nom}`;
        sessions.push({
          chemin,
          ...analyse,
          enCours: chemin === cheminEnCours,
          copieConflitProbable: copies.has(nom),
        });
      }

      sessions.sort((a, b) => Number(b.enCours) - Number(a.enCours) || comparerSessions(a, b));
      return { ok: true, valeur: sessions };
    },

    async lire(chemin) {
      const resultat = await stockage.lire('journal', chemin);
      if (!resultat.ok) return resultat;
      return { ok: true, valeur: analyserContenu(resultat.valeur) };
    },
  };
}
