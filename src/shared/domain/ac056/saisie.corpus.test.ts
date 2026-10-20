// Saisie d'un champ (`saisirChamp`, recontrôle de la seule ligne modifiée) sur le corpus réel (P:) :
// après chaque saisie, l'analyse doit être exactement celle recalculée en entier sur le fichier
// modifié (lecture d'origine puis contrôle complet, `bilanAnalyse`).
// - IN\, PIEGES\ (NOM.txt) et MODIFIES\ (NOM.txt) : 50 saisies enchaînées par fichier, sur des
//   champs modifiables tirés avec une graine fixe, valeurs fictives tirées elles aussi ;
// - PIEGES\ : en plus, chaque champ modifiable en erreur reçoit une valeur corrigée, depuis
//   l'analyse d'origine ; aucune anomalie ne doit rester sur ce champ.
// Aucune valeur du corpus ni valeur saisie n'est affichée : un écart est décrit par le fichier, la
// saisie (rang), la ligne, le champ et le code. Aucune E/S pendant la collecte.
import { expect, it } from 'vitest';
import {
  decrireCorpus,
  decrireSousDossierCorpus,
  listerCorpus,
  lireCorpus,
  type SousDossierCorpus,
} from '@shared/test/corpus';
import { analyserAc056, bilanAnalyse, type AnalyseAc056 } from './analyse';
import { controlerAc056 } from './controle';
import { ENTITES } from './entites';
import { indexerLignes, type IndexLignesAc056 } from './index-lignes';
import { lireAc056 } from './lecteur';
import type { AnomalieAc056 } from './modele';
import type { CibleChamp } from './modification';
import { saisirChamp } from './saisie';

const SAISIES_PAR_FICHIER = 50;
const GRAINE = 0x5a15_2026;
/** Durée maximale d'un test : chaque saisie est suivie d'un contrôle complet de référence. */
const DELAI = 600_000;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RANGS = ['00', '01', '20', '21', '25', '39', '40', '99', 'X', ' 1', ''];
/** Caractères fictifs : autorisés, refusés par les jeux de Lazarus, interdits (divergence 5). */
const CARACTERES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'.#@!,_*éÉç\tab";

function texteFictif(aleatoire: () => number, champ: string, maxLength: number): string {
  if (champ === 'rang' || champ === 'rangPersonne') {
    return RANGS[Math.floor(aleatoire() * RANGS.length)]!;
  }
  const longueur = Math.floor(aleatoire() * (maxLength + 1));
  let texte = '';
  for (let i = 0; i < longueur; i++) {
    texte += CARACTERES[Math.floor(aleatoire() * CARACTERES.length)]!;
  }
  return texte;
}

/** Valeur conforme aux règles de Lazarus pour un champ modifiable en erreur. */
function texteCorrige(champ: string): string {
  if (champ === 'rang' || champ === 'rangPersonne') return '01';
  if (champ === 'codePostalLocalite') return '12345';
  if (champ === 'numInsee') return '1000000000000';
  return 'TEST';
}

interface Cible extends CibleChamp {
  readonly maxLength: number;
}

/** Champs modifiables de toutes les lignes découpées en champs. */
function cibles(analyse: AnalyseAc056): Cible[] {
  return analyse.fichier.lignes.flatMap((ligne) =>
    ligne.nature !== 'decrite'
      ? []
      : ENTITES[ligne.code].champs
          .filter((c) => c.modifiable)
          .map((c) => ({
            ligne: ligne.numero,
            champ: c.nom,
            maxLength: c.maxLength ?? c.longueur,
          })),
  );
}

const cleAnomalie = (a: AnomalieAc056) =>
  `${a.ligne}|${a.champ}|${a.code}|${a.bloquante}|${a.message}|${a.consigne}`;
/** Description sans valeur : ligne, champ et code. */
const decrire = (a: AnomalieAc056) => `ligne ${a.ligne}, champ ${a.champ ?? '-'}, ${a.code}`;

/** Écarts entre l'analyse obtenue et l'analyse recalculée en entier, sans aucune valeur. */
function ecarts(
  contexte: string,
  obtenue: AnalyseAc056,
  lecture: readonly AnomalieAc056[],
): string[] {
  const attendue = bilanAnalyse(obtenue.fichier, [...lecture, ...controlerAc056(obtenue.fichier)]);
  const resultat: string[] = [];
  const compteurs = (a: AnalyseAc056) =>
    [a.erreurs, a.nonBloquantes, a.structure, a.lignesRejetees].join('/');
  if (compteurs(obtenue) !== compteurs(attendue)) {
    resultat.push(
      `${contexte} : compteurs ${compteurs(obtenue)} au lieu de ${compteurs(attendue)}`,
    );
  }
  const n = Math.max(obtenue.anomalies.length, attendue.anomalies.length);
  for (let i = 0; i < n; i++) {
    const o = obtenue.anomalies[i];
    const a = attendue.anomalies[i];
    if (o !== undefined && a !== undefined && cleAnomalie(o) === cleAnomalie(a)) continue;
    resultat.push(
      `${contexte} : anomalie ${i + 1}, obtenue ${o ? decrire(o) : 'aucune'}, attendue ${a ? decrire(a) : 'aucune'}`,
    );
    break;
  }
  return resultat;
}

interface Charge {
  readonly analyse: AnalyseAc056;
  readonly lecture: readonly AnomalieAc056[];
  readonly index: IndexLignesAc056;
}

function charger(sousDossier: SousDossierCorpus, nom: string): Charge {
  const octets = lireCorpus(sousDossier, nom);
  const analyse = analyserAc056(octets, 'veos');
  return { analyse, lecture: lireAc056(octets).anomalies, index: indexerLignes(analyse.fichier) };
}

/** 50 saisies enchaînées, comparées après chacune ; renvoie les écarts et le nombre de saisies. */
function saisiesEnchainees(
  sousDossier: SousDossierCorpus,
  nom: string,
  rangFichier: number,
): { ecarts: string[]; saisies: number } {
  const { analyse, lecture, index } = charger(sousDossier, nom);
  const possibles = cibles(analyse);
  // Fichier sans évènement (export vide : 000 et 999 seules) : rien à saisir.
  if (possibles.length === 0) return { ecarts: [], saisies: 0 };
  const aleatoire = generateur(GRAINE + rangFichier);
  const resultat: string[] = [];
  let courante = analyse;
  let saisies = 0;
  for (let k = 1; k <= SAISIES_PAR_FICHIER && resultat.length === 0; k++) {
    const cible = possibles[Math.floor(aleatoire() * possibles.length)]!;
    const texte = texteFictif(aleatoire, cible.champ, cible.maxLength);
    const r = saisirChamp(courante, index, cible, texte);
    const contexte = `${nom}, saisie ${k} (ligne ${cible.ligne}, champ ${cible.champ})`;
    // Refus attendu : texte fictif de plus d'octets que le champ (caractères accentués).
    if (!r.ok) {
      if (r.erreur.code !== 'valeur-trop-longue') {
        resultat.push(`${contexte} : refusée, ${r.erreur.code}`);
      }
      continue;
    }
    saisies++;
    courante = r.analyse;
    resultat.push(...ecarts(contexte, courante, lecture));
  }
  return { ecarts: resultat, saisies };
}

function fichiersVeos(sousDossier: SousDossierCorpus): string[] {
  return listerCorpus(sousDossier).filter(
    (nom) =>
      nom.endsWith('.txt') && !nom.endsWith('.erreurs.txt') && !nom.endsWith('.modification.txt'),
  );
}

function verifierSousDossier(sousDossier: SousDossierCorpus): void {
  it(
    `${SAISIES_PAR_FICHIER} saisies enchaînées par fichier : égales à l'analyse recalculée`,
    async ({ annotate }) => {
      const noms = fichiersVeos(sousDossier);
      expect(noms.length).toBeGreaterThan(0);
      const resultat: string[] = [];
      let saisies = 0;
      noms.forEach((nom, rang) => {
        const r = saisiesEnchainees(sousDossier, nom, rang);
        resultat.push(...r.ecarts);
        saisies += r.saisies;
      });
      await annotate(
        `${sousDossier} : ${noms.length} fichier(s), ${saisies} saisie(s) comparée(s).`,
      );
      expect(saisies).toBeGreaterThan(0);
      expect(resultat).toEqual([]);
    },
    DELAI,
  );
}

decrireCorpus('Saisie AC056 sur le corpus réel (IN)', () => {
  verifierSousDossier('IN');
});

decrireSousDossierCorpus('MODIFIES', 'Saisie AC056 sur le corpus réel (MODIFIES)', () => {
  verifierSousDossier('MODIFIES');
});

decrireSousDossierCorpus('PIEGES', 'Saisie AC056 sur le corpus réel (PIEGES)', () => {
  verifierSousDossier('PIEGES');

  it(
    'corrige chaque champ modifiable en erreur : égal à l analyse recalculée',
    async ({ annotate }) => {
      const resultat: string[] = [];
      let corrections = 0;
      let disparues = 0;
      for (const nom of fichiersVeos('PIEGES')) {
        const { analyse, lecture, index } = charger('PIEGES', nom);
        const enErreur = new Map<string, CibleChamp>();
        for (const a of analyse.anomalies) {
          if (a.champ === undefined || a.ligne === null) continue;
          const indice = index.indices.get(a.ligne);
          const ligne = indice === undefined ? undefined : analyse.fichier.lignes[indice];
          if (ligne?.nature !== 'decrite') continue;
          const champ = ENTITES[ligne.code].champs.find((c) => c.nom === a.champ);
          if (champ?.modifiable)
            enErreur.set(`${a.ligne}|${a.champ}`, { ligne: a.ligne, champ: a.champ });
        }
        for (const cible of enErreur.values()) {
          const contexte = `${nom}, correction (ligne ${cible.ligne}, champ ${cible.champ})`;
          const r = saisirChamp(analyse, index, cible, texteCorrige(cible.champ));
          if (!r.ok) {
            resultat.push(`${contexte} : refusée, ${r.erreur.code}`);
            continue;
          }
          corrections++;
          const restantes = r.analyse.anomalies.filter(
            (a) => a.ligne === cible.ligne && a.champ === cible.champ,
          );
          if (restantes.length === 0) disparues++;
          else
            resultat.push(
              `${contexte} : erreur restante, ${restantes.map((x) => x.code).join(', ')}`,
            );
          resultat.push(...ecarts(contexte, r.analyse, lecture));
        }
      }
      await annotate(
        `PIEGES : ${corrections} correction(s) comparée(s), ${disparues} erreur(s) disparue(s).`,
      );
      expect(corrections).toBeGreaterThan(0);
      expect(resultat).toEqual([]);
      expect(disparues).toBe(corrections);
    },
    DELAI,
  );
});
