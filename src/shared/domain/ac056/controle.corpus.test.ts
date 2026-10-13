// Parité du contrôle avec Lazarus sur le corpus réel (P:). Aucune valeur du corpus n'est affichée :
// seuls fichier, numéro de ligne, entité, champ, code et message (qui ne contient jamais de valeur)
// sont rapportés, jamais un numéro de dossier. Pas de `toEqual` ni de snapshot sur un contenu du
// corpus : les écarts sont accumulés en texte, puis `expect(ecarts).toEqual([])`.
// Aucune E/S pendant la collecte : inventaire et lectures dans les `it`.
//
// - `IN\` : fichiers VEOS d'origine, sans erreur.
// - `MODIFIES\` : fichiers enregistrés par Lazarus, donc passés par son contrôle complet : sans erreur.
// - `PIEGES\` : `NOM.txt` (fichier piégé) et `NOM.erreurs.txt` (relevé manuel de Lazarus, en RTF
//   ou en texte) : mêmes erreurs, en multiensemble de (dossier, évènement, message), hors les
//   anomalies de divergence (`caractere-interdit`, `rang-non-numerique`) que Lazarus ne produit pas.
import { describe, expect, it } from 'vitest';
import {
  decrireCorpus,
  decrireSousDossierCorpus,
  listerCorpus,
  lireCorpus,
} from '@shared/test/corpus';
import { lireReleveLazarus } from '@shared/test/releve-lazarus';
import { controlerAc056 } from './controle';
import { lireAc056 } from './lecteur';
import type { AnomalieAc056, CodeAnomalie } from './modele';

const SUFFIXE_RELEVE = '.erreurs.txt';
const SUFFIXE_NOTE = '.modification.txt';

/** Anomalies que Lazarus ne produit jamais (divergences 4 et 5). */
const CODES_DIVERGENCE: readonly CodeAnomalie[] = ['caractere-interdit', 'rang-non-numerique'];

/** Description d'une anomalie sans valeur : fichier, ligne, champ, code et message. */
const decrireAnomalie = (nom: string, a: AnomalieAc056): string =>
  `${nom} : ligne ${a.ligne}, champ ${a.champ}, ${a.code}, « ${a.message} »`;

/** Anomalies de contrôle d'un fichier de IN\ ou de MODIFIES\ (appelé depuis les `it`). */
function ecartsDeControle(sousDossier: 'IN' | 'MODIFIES', noms: readonly string[]): string[] {
  return noms.flatMap((nom) => {
    const { fichier } = lireAc056(lireCorpus(sousDossier, nom));
    return controlerAc056(fichier).map((a) => decrireAnomalie(nom, a));
  });
}

decrireCorpus('Contrôle AC056 sur le corpus réel (IN)', () => {
  it('ne produit aucune anomalie de contrôle sur les fichiers VEOS de IN', () => {
    const noms = listerCorpus('IN').filter((nom) => nom.endsWith('.txt'));
    expect(noms.length).toBeGreaterThan(0);
    expect(ecartsDeControle('IN', noms)).toEqual([]);
  });
});

decrireSousDossierCorpus('MODIFIES', 'Contrôle AC056 sur le corpus réel (MODIFIES)', () => {
  it('ne produit aucune anomalie sur les fichiers enregistrés par Lazarus', () => {
    const noms = listerCorpus('MODIFIES').filter(
      (nom) => nom.endsWith('.txt') && !nom.endsWith(SUFFIXE_NOTE),
    );
    expect(noms.length).toBeGreaterThan(0);
    expect(ecartsDeControle('MODIFIES', noms)).toEqual([]);
  });
});

interface Paire {
  readonly base: string;
  readonly fichier: string;
  readonly releve: string;
}

/** Paires `NOM.txt` / `NOM.erreurs.txt` de PIEGES\ et moitiés de paire manquantes. */
function inventorierPieges(): { paires: Paire[]; ecarts: string[] } {
  const noms = listerCorpus('PIEGES');
  const releves = noms.filter((nom) => nom.endsWith(SUFFIXE_RELEVE));
  const fichiers = noms.filter((nom) => nom.endsWith('.txt') && !nom.endsWith(SUFFIXE_RELEVE));
  const basesReleves = releves.map((nom) => nom.slice(0, -SUFFIXE_RELEVE.length));
  const basesFichiers = fichiers.map((nom) => nom.slice(0, -'.txt'.length));

  const ecarts = [
    ...basesFichiers
      .filter((base) => !basesReleves.includes(base))
      .map((base) => `${base}.txt : relevé ${base}${SUFFIXE_RELEVE} absent`),
    ...basesReleves
      .filter((base) => !basesFichiers.includes(base))
      .map((base) => `${base}${SUFFIXE_RELEVE} : fichier ${base}.txt absent`),
  ];
  const paires = basesFichiers
    .filter((base) => basesReleves.includes(base))
    .map((base) => ({ base, fichier: `${base}.txt`, releve: `${base}${SUFFIXE_RELEVE}` }));
  return { paires, ecarts };
}

/** Comptes d'une erreur (dossier, évènement, message) dans le relevé et dans Flussi. */
interface Compte {
  readonly message: string;
  attendu: number;
  obtenu: number;
  readonly lignes: number[];
}

interface ResultatParite {
  readonly ecarts: string[];
  /** Erreurs de Lazarus (relevé). */
  readonly dansReleve: number;
  /** Anomalies de Flussi comparées (hors divergences). */
  readonly dansFlussi: number;
  readonly divergences: number;
}

/** Compare, en multiensemble, les erreurs de Flussi et celles du relevé Lazarus d'une paire. */
function comparerPaire(paire: Paire): ResultatParite {
  const { fichier } = lireAc056(lireCorpus('PIEGES', paire.fichier));
  const anomalies = controlerAc056(fichier);
  const releve = lireReleveLazarus(lireCorpus('PIEGES', paire.releve));
  const comptes = new Map<string, Compte>();
  const ecarts: string[] = [];

  const compte = (dossier: string, evenement: string, message: string): Compte => {
    // Le numéro de dossier ne sert que de clé : il n'est jamais affiché.
    const cle = `${dossier}/${evenement}\u0000${message}`;
    let c = comptes.get(cle);
    if (c === undefined) {
      c = { message, attendu: 0, obtenu: 0, lignes: [] };
      comptes.set(cle, c);
    }
    return c;
  };

  for (const erreur of releve) compte(erreur.dossier, erreur.evenement, erreur.message).attendu++;

  // Lazarus journalise le dossier et l'évènement de l'entité contrôlée : octets 10-17 et 18-20.
  const origines = new Map(fichier.lignes.map((ligne) => [ligne.numero, ligne.origine]));
  let divergences = 0;
  let dansFlussi = 0;
  for (const a of anomalies) {
    if (CODES_DIVERGENCE.includes(a.code)) {
      divergences++;
      continue;
    }
    dansFlussi++;
    const origine = a.ligne === null ? undefined : origines.get(a.ligne);
    if (origine === undefined) {
      ecarts.push(decrireAnomalie(paire.fichier, a) + ' (ligne introuvable)');
      continue;
    }
    const c = compte(origine.slice(9, 17), origine.slice(17, 20), a.message);
    c.obtenu++;
    c.lignes.push(a.ligne as number);
  }

  for (const c of comptes.values()) {
    if (c.attendu === c.obtenu) continue;
    const lignes = c.lignes.length === 0 ? 'aucune' : c.lignes.join(', ');
    ecarts.push(
      `${paire.base} : « ${c.message} » attendu ${c.attendu}, obtenu ${c.obtenu} (lignes Flussi ${lignes})`,
    );
  }
  return { ecarts: ecarts.sort(), dansReleve: releve.length, dansFlussi, divergences };
}

decrireSousDossierCorpus('PIEGES', 'Parité du contrôle AC056 avec Lazarus (PIEGES)', () => {
  describe('inventaire', () => {
    it('contient au moins une paire fichier piégé et relevé', () => {
      expect(inventorierPieges().paires.length).toBeGreaterThan(0);
    });

    it('associe chaque NOM.txt à un NOM.erreurs.txt et inversement', () => {
      expect(inventorierPieges().ecarts).toEqual([]);
    });

    it('lit au moins une erreur dans chaque relevé (sinon format non reconnu)', () => {
      const vides = inventorierPieges()
        .paires.filter((p) => lireReleveLazarus(lireCorpus('PIEGES', p.releve)).length === 0)
        .map((p) => `${p.releve} : aucune erreur lue`);
      expect(vides).toEqual([]);
    });
  });

  describe('parité', () => {
    it('produit les mêmes erreurs que le relevé de Lazarus, message par message', async ({
      annotate,
    }) => {
      const ecarts: string[] = [];
      for (const paire of inventorierPieges().paires) {
        const resultat = comparerPaire(paire);
        ecarts.push(...resultat.ecarts);
        await annotate(
          `${paire.base} : ${resultat.dansReleve} erreur(s) du relevé, ${resultat.dansFlussi} anomalie(s) de Flussi comparée(s), ${resultat.divergences} anomalie(s) de divergence écartée(s).`,
        );
      }
      expect(ecarts).toEqual([]);
    });
  });
});
