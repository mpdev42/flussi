// Bilan des messages de rejet MSP (outil de développement, `npm run bilan:rejets`) : logique pure,
// sans entrée-sortie. L'exécution (lecture de OUT, écriture du rapport) est dans
// `bilan-rejets.bilan.ts`.
//
// Les noms des sous-dossiers et des fichiers illisibles cités dans les totaux ne sont pas masqués.
//
// Données personnelles : un message MSP peut citer un numéro de contrat, un rang, une date ou un
// nom. Tout mot qui contient un chiffre est masqué (`masquerMessage`) ; un nom sans chiffre ne
// l'est pas, d'où l'avertissement du rapport et la colonne « À relire ». Le rapport n'est relu que
// par l'utilisateur avant tout autre usage.

/** Remplace un mot masqué. */
export const MASQUE = '…';

/** Code affiché pour un message non reconnu (`code` null). */
export const SANS_CODE = 'aucun';

/** Entité d'une ligne au code inconnu (ligne brute de moins de 25 octets ou code hors table). */
export const ENTITE_INCONNUE = 'inconnue';

/** Entité d'une anomalie de niveau fichier (`ligne` null). */
export const NIVEAU_FICHIER = 'fichier';

/** Script npm qui lance le bilan (`npm_lifecycle_event` posé par npm). */
export const SCRIPT_BILAN = 'bilan:rejets';

/**
 * Garde-fou : le bilan lit le dossier OUT de production. Il ne s'exécute que lancé par
 * `npm run bilan:rejets` (et non `npm test -- --mode bilan` ni `npx vitest --mode bilan`), d'après
 * `npm_lifecycle_event`, que npm pose et dont héritent le wrapper `scripts/test.mjs` et les workers
 * de Vitest. Lève sinon, avant toute lecture.
 */
export function verifierLancementBilan(evenementNpm: string | undefined): void {
  if (evenementNpm === SCRIPT_BILAN) return;
  throw new Error(
    `Lancez le bilan par npm run ${SCRIPT_BILAN} (script npm reçu : ${evenementNpm || 'aucun'}).`,
  );
}

// Mot : suite de lettres, chiffres, marques combinantes, `_`, `-`, `/` et `.` collés, qui commence
// et finit par une lettre ou un chiffre. La ponctuation en bordure (point final, tiret isolé) n'en
// fait pas partie et reste en place.
const MOT = /[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}_\-/.]*[\p{L}\p{M}\p{N}])?/gu;
const CHIFFRE = /\p{N}/u;
// Masques séparés seulement par des espaces ou des virgules (nombre avec séparateur de milliers
// ou décimale à la française : « 1 234,56 »), fusionnés en un seul.
const MASQUES_CONSECUTIFS = /…(?:[\s,]+…)+/gu;
const ESPACES = /\s+/gu;

/**
 * Masque les mots d'un message MSP sans toucher aux autres espaces (forme affichée par le rapport,
 * pour qu'une recherche puisse être écrite exactement) :
 * 1. tout mot qui contient un chiffre devient `…` (« CI9101M », « SANTE1 », « 12/03/2026 »,
 *    « 1.234 ») ; les lettres accentuées et la ponctuation hors mot sont gardées ;
 * 2. les `…` séparés seulement par des espaces ou des virgules sont fusionnés (« 1 234,56 » donne
 *    `…`, comme « 12 ») : deux messages qui ne diffèrent que par un nombre se regroupent.
 * Limite : un mot sans chiffre (nom, prénom, ville) n'est jamais masqué.
 */
export function masquerMots(message: string): string {
  return message
    .replace(MOT, (mot) => (CHIFFRE.test(mot) ? MASQUE : mot))
    .replace(MASQUES_CONSECUTIFS, MASQUE);
}

/**
 * Clé de regroupement d'un message MSP : `masquerMots`, puis les suites d'espaces deviennent une
 * espace et le message est rogné.
 */
export function masquerMessage(message: string): string {
  return masquerMots(message).replace(ESPACES, ' ').trim();
}

function espaceVisible(caractere: string): string {
  if (caractere === ' ') return '␠';
  if (caractere === '\t') return '␉';
  return `⟨U+${caractere.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}⟩`;
}

/**
 * Rend visibles les espaces qu'une recherche doit reprendre exactement : une espace simple entre
 * deux caractères reste telle quelle ; toute autre espace (en double, en tête, en fin) devient `␠`,
 * une tabulation `␉`, un autre blanc (espace insécable…) son code (`⟨U+00A0⟩`).
 */
export function espacesVisibles(texte: string): string {
  return texte.replace(ESPACES, (suite: string, position: number) => {
    const interieure = position > 0 && position + suite.length < texte.length;
    return suite === ' ' && interieure ? suite : [...suite].map(espaceVisible).join('');
  });
}

export interface AnneeRejet {
  readonly annee: number;
  /** `nom` : date AAAAMMJJ trouvée dans le nom ; `modification` : date de modification. */
  readonly source: 'nom' | 'modification';
}

const ANNEE_MIN = 2000;
const ANNEE_MAX = 2099;

/** Date AAAAMMJJ réelle (année 2000 à 2099, jour existant dans le mois). */
function dateValide(chiffres: string): number | null {
  const annee = Number(chiffres.slice(0, 4));
  const mois = Number(chiffres.slice(4, 6));
  const jour = Number(chiffres.slice(6, 8));
  if (annee < ANNEE_MIN || annee > ANNEE_MAX || mois < 1 || mois > 12 || jour < 1) return null;
  const joursDuMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return jour <= joursDuMois ? annee : null;
}

/**
 * Année de la première date AAAAMMJJ valide du nom (huit chiffres consécutifs pris à chaque
 * position, de gauche à droite) ; null sans date valide.
 */
export function anneeDuNom(nom: string): number | null {
  for (let i = 0; i + 8 <= nom.length; i++) {
    const morceau = nom.slice(i, i + 8);
    if (!/^\d{8}$/.test(morceau)) continue;
    const annee = dateValide(morceau);
    if (annee !== null) return annee;
  }
  return null;
}

/**
 * Année d'un fichier de rejet : celle du nom (`anneeDuNom`), sinon l'année locale de la date de
 * modification. `dateModification` n'est appelée qu'en repli : un fichier daté par son nom n'est
 * jamais interrogé (un fichier d'une autre année d'après son nom ne peut pas devenir illisible).
 */
export function anneeRejet(nom: string, dateModification: () => Date): AnneeRejet {
  const annee = anneeDuNom(nom);
  if (annee !== null) return { annee, source: 'nom' };
  return { annee: dateModification().getFullYear(), source: 'modification' };
}

/** Fichier repéré par son dossier relatif et son nom. */
export interface FichierRetenu {
  readonly dossier: string;
  readonly nom: string;
}

export interface Doublons {
  /** Noms de fichiers présents dans plusieurs dossiers. */
  readonly noms: number;
  /** Fichiers qui portent ces noms. */
  readonly fichiers: number;
}

/** Noms de fichiers présents dans plusieurs dossiers (nombres seulement, jamais les noms). */
export function compterDoublons(fichiers: readonly FichierRetenu[]): Doublons {
  const dossiers = new Map<string, Set<string>>();
  for (const { dossier, nom } of fichiers) {
    const ensemble = dossiers.get(nom) ?? new Set<string>();
    ensemble.add(dossier);
    dossiers.set(nom, ensemble);
  }
  let noms = 0;
  let total = 0;
  for (const ensemble of dossiers.values()) {
    if (ensemble.size < 2) continue;
    noms++;
    total += ensemble.size;
  }
  return { noms, fichiers: total };
}

/** Message MSP d'une ligne de rejet, tel que lu (jamais affiché avant masquage). */
export interface EntreeRejet {
  readonly fichier: string;
  /** Code de l'entité de la ligne (`ENTITE_INCONNUE` si inconnu). */
  readonly entite: string;
  readonly message: string;
  /** Code `ERRxxx` identifié sur le message brut ; null : non reconnu. */
  readonly code: string | null;
}

export interface GroupeRejet {
  /** Message masqué commun au groupe (clé de regroupement, espaces normalisées). */
  readonly modele: string;
  /**
   * Forme la plus fréquente du groupe (la première vue à égalité) : mots masqués (`masquerMots`),
   * espaces d'origine gardées.
   */
  readonly exemple: string;
  /** Nombre de formes distinctes du groupe une fois les mots masqués (espaces différentes). */
  readonly variantes: number;
  readonly occurrences: number;
  /** Nombre de fichiers distincts. */
  readonly fichiers: number;
  /** Codes triés, `SANS_CODE` pour un message non reconnu. */
  readonly codes: readonly string[];
  /** Entités triées. */
  readonly entites: readonly string[];
}

/** Ordre des unités de code (stable d'un poste à l'autre, contrairement à `localeCompare`). */
function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function trier(valeurs: Iterable<string>): string[] {
  return [...valeurs].sort(comparer);
}

/** Regroupe les messages par message masqué, du plus fréquent au moins fréquent, puis par modèle. */
export function regrouperRejets(entrees: readonly EntreeRejet[]): GroupeRejet[] {
  const groupes = new Map<
    string,
    {
      occurrences: number;
      formes: Map<string, number>;
      fichiers: Set<string>;
      codes: Set<string>;
      entites: Set<string>;
    }
  >();
  for (const { fichier, entite, message, code } of entrees) {
    const forme = masquerMots(message);
    const modele = masquerMessage(message);
    let groupe = groupes.get(modele);
    if (groupe === undefined) {
      groupe = {
        occurrences: 0,
        formes: new Map(),
        fichiers: new Set(),
        codes: new Set(),
        entites: new Set(),
      };
      groupes.set(modele, groupe);
    }
    groupe.occurrences++;
    groupe.formes.set(forme, (groupe.formes.get(forme) ?? 0) + 1);
    groupe.fichiers.add(fichier);
    groupe.codes.add(code ?? SANS_CODE);
    groupe.entites.add(entite);
  }
  return [...groupes]
    .map(([modele, g]) => ({
      modele,
      // Tri stable : à égalité, la première forme vue reste en tête.
      exemple: [...g.formes].sort(([, a], [, b]) => b - a)[0]![0],
      variantes: g.formes.size,
      occurrences: g.occurrences,
      fichiers: g.fichiers.size,
      codes: trier(g.codes),
      entites: trier(g.entites),
    }))
    .sort((a, b) => b.occurrences - a.occurrences || comparer(a.modele, b.modele));
}

/** Anomalie de lecture d'un rejet : code d'anomalie et entité de la ligne, jamais le message. */
export interface EntreeAnomalie {
  readonly fichier: string;
  readonly code: string;
  /** Code de l'entité de la ligne, `ENTITE_INCONNUE` ou `NIVEAU_FICHIER`. */
  readonly entite: string;
}

export interface GroupeAnomalie {
  readonly code: string;
  readonly entite: string;
  readonly nombre: number;
  /** Nombre de fichiers distincts. */
  readonly fichiers: number;
}

/** Compte les anomalies par code d'anomalie puis entité (ordre alphabétique). */
export function regrouperAnomalies(entrees: readonly EntreeAnomalie[]): GroupeAnomalie[] {
  const groupes = new Map<string, { code: string; entite: string; fichiers: string[] }>();
  for (const { fichier, code, entite } of entrees) {
    const cle = `${code}\u0000${entite}`;
    const groupe = groupes.get(cle) ?? { code, entite, fichiers: [] };
    groupe.fichiers.push(fichier);
    groupes.set(cle, groupe);
  }
  return [...groupes]
    .sort(([a], [b]) => comparer(a, b))
    .map(([, { code, entite, fichiers }]) => ({
      code,
      entite,
      nombre: fichiers.length,
      fichiers: new Set(fichiers).size,
    }));
}

export interface ComptesGroupes {
  /** Groupes dont tous les messages ont le même code. */
  readonly reconnus: number;
  /** Groupes dont tous les messages ont un code, mais pas tous le même. */
  readonly ambigus: number;
  /** Groupes dont aucun message n'a de code. */
  readonly sansCode: number;
  /** Groupes aux messages avec et sans code (un ou plusieurs codes). */
  readonly mixtes: number;
}

/**
 * Comptes des groupes reconnus (un seul code), ambigus (plusieurs codes), sans code ou mixtes
 * (avec et sans code) : chaque groupe est compté une seule fois.
 */
export function compterGroupes(groupes: readonly GroupeRejet[]): ComptesGroupes {
  let reconnus = 0;
  let ambigus = 0;
  let sansCode = 0;
  let mixtes = 0;
  for (const { codes } of groupes) {
    if (codes.includes(SANS_CODE)) {
      if (codes.length === 1) sansCode++;
      else mixtes++;
    } else if (codes.length === 1) reconnus++;
    else ambigus++;
  }
  return { reconnus, ambigus, sansCode, mixtes };
}

/** Ligne des messages distincts, commune à la console et au rapport (nombres seulement). */
export function ligneMessagesDistincts(groupes: readonly GroupeRejet[]): string {
  const c = compterGroupes(groupes);
  return `Messages masqués distincts : ${groupes.length} (${c.reconnus} reconnus, ${c.ambigus} ambigus à plusieurs codes, ${c.sansCode} sans code, ${c.mixtes} mixtes avec et sans code)`;
}

/** Ligne des doublons, commune à la console et au rapport (nombres seulement, jamais les noms). */
export function ligneDoublons({ noms, fichiers }: Doublons): string {
  return `Noms de fichiers retenus présents dans plusieurs sous-dossiers : ${noms} (${fichiers} fichiers)`;
}

/** Nombre d'occurrences d'une valeur (extension, sous-dossier). */
export interface Repartition {
  readonly valeur: string;
  readonly nombre: number;
}

/** Compte chaque valeur distincte, dans l'ordre des valeurs. */
export function repartir(valeurs: readonly string[]): Repartition[] {
  const nombres = new Map<string, number>();
  for (const valeur of valeurs) nombres.set(valeur, (nombres.get(valeur) ?? 0) + 1);
  return [...nombres]
    .sort(([a], [b]) => comparer(a, b))
    .map(([valeur, nombre]) => ({ valeur, nombre }));
}

export interface TotauxBilan {
  readonly dossier: string;
  readonly annee: number;
  /** Sous-dossiers parcourus sous le dossier lu (lui-même exclu). */
  readonly sousDossiers: number;
  /** Sous-dossiers impossibles à lister (non parcourus). */
  readonly sousDossiersIllisibles: number;
  /** Fichiers vus dans le dossier et ses sous-dossiers. */
  readonly fichiersVus: number;
  /** Fichiers écartés parce qu'ils ne sont pas des rejets `.txt`, par extension en minuscules. */
  readonly nonRejets: readonly Repartition[];
  /** Fichiers retenus par sous-dossier relatif au dossier lu (chemin du dossier seulement). */
  readonly retenusParSousDossier: readonly Repartition[];
  readonly retenusParNom: number;
  readonly retenusParModification: number;
  /** Noms de fichiers retenus présents dans plusieurs sous-dossiers. */
  readonly doublons: Doublons;
  readonly ecartes: number;
  /** Chemins relatifs des fichiers illisibles (jamais le texte de l'erreur). */
  readonly illisibles: readonly string[];
  readonly lignes: number;
  readonly lignesAvecMessage: number;
  readonly anomalies: readonly GroupeAnomalie[];
}

/** Échappe un texte Markdown (cellule ou liste) : `\`, `|`, `<` et sauts de ligne. */
export function echapperCellule(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/\r\n|\r|\n/g, '<br>');
}

function somme(repartition: readonly Repartition[]): number {
  return repartition.reduce((total, { nombre }) => total + nombre, 0);
}

function listeRepartition(repartition: readonly Repartition[]): string[] {
  return repartition.map(({ valeur, nombre }) => `  - ${echapperCellule(valeur)} : ${nombre}`);
}

function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

function formaterDateHeure(date: Date): string {
  const jour = `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
  return `${jour} à ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
}

/** Document Markdown du bilan : totaux, avertissement, tableau des groupes, anomalies. */
export function tableauBilan(
  groupes: readonly GroupeRejet[],
  totaux: TotauxBilan,
  genereLe: Date,
): string {
  const lignes: string[] = [
    `# Bilan des messages de rejet MSP ${totaux.annee}`,
    '',
    `Généré le ${formaterDateHeure(genereLe)}, à partir de ${echapperCellule(totaux.dossier)} et de ses sous-dossiers.`,
    '',
    '> **À relire : données personnelles possibles (noms non masqués).** Seuls les mots des messages',
    '> contenant un chiffre sont remplacés par « … » : un nom sans chiffre reste lisible, comme les',
    '> noms des sous-dossiers et des fichiers illisibles cités dans les totaux. Relire chaque ligne,',
    '> en particulier celles marquées « À relire » (une seule occurrence), avant de partager ce',
    '> document.',
    '',
    '## Totaux',
    '',
    `- Sous-dossiers parcourus : ${totaux.sousDossiers}${totaux.sousDossiersIllisibles > 0 ? ` (${totaux.sousDossiersIllisibles} impossibles à lister)` : ''}`,
    `- Fichiers vus : ${totaux.fichiersVus}`,
    `- Fichiers écartés (pas un rejet .txt) : ${somme(totaux.nonRejets)}`,
    ...listeRepartition(totaux.nonRejets),
    `- Fichiers retenus : ${totaux.retenusParNom + totaux.retenusParModification} (${totaux.retenusParNom} par la date du nom, ${totaux.retenusParModification} par la date de modification)`,
    ...listeRepartition(totaux.retenusParSousDossier),
    `- ${ligneDoublons(totaux.doublons)}`,
    `- Fichiers écartés (autre année) : ${totaux.ecartes}`,
    `- Fichiers illisibles : ${totaux.illisibles.length}`,
    ...totaux.illisibles.map((chemin) => `  - ${echapperCellule(chemin)}`),
    `- Lignes lues : ${totaux.lignes}`,
    `- Lignes avec un message MSP : ${totaux.lignesAvecMessage}`,
    `- ${ligneMessagesDistincts(groupes)}`,
    '',
    '## Messages',
    '',
  ];

  if (groupes.length === 0) {
    lignes.push('Aucun message.');
  } else {
    lignes.push(
      "Message : forme la plus fréquente du groupe, espaces d'origine. `␠` : espace en double, en",
      'tête ou en fin de message ; `␉` : tabulation ; `⟨U+00A0⟩` : autre blanc (code Unicode). Une',
      'espace simple entre deux mots reste telle quelle. Variantes : nombre de formes du groupe aux',
      'espaces différentes (vide pour une seule).',
      '',
      '| Message (masqué, espaces visibles) | Variantes | Occurrences | Fichiers | Entités | Code | À relire |',
      '| --- | ---: | ---: | ---: | --- | --- | :---: |',
      ...groupes.map(
        (g) =>
          `| ${echapperCellule(espacesVisibles(g.exemple))} | ${g.variantes > 1 ? g.variantes : ''} | ${g.occurrences} | ${g.fichiers} | ${echapperCellule(g.entites.join(', '))} | ${echapperCellule(g.codes.join(', '))} | ${g.occurrences === 1 ? 'oui' : ''} |`,
      ),
    );
  }

  lignes.push('', '## Anomalies de lecture et de structure', '');
  if (totaux.anomalies.length === 0) {
    lignes.push('Aucune anomalie.');
  } else {
    lignes.push(
      '| Anomalie | Entité | Nombre | Fichiers |',
      '| --- | --- | ---: | ---: |',
      ...totaux.anomalies.map(
        (a) =>
          `| ${echapperCellule(a.code)} | ${echapperCellule(a.entite)} | ${a.nombre} | ${a.fichiers} |`,
      ),
    );
  }
  lignes.push('');
  return lignes.join('\n');
}
