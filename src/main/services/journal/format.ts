import { NIVEAUX_JOURNAL, type NiveauJournal } from '@shared/schemas/journal';
import type { LigneJournal } from '@shared/types/journal';

// Format du fichier de session du journal. Pur : aucun accès au système de fichiers.
// UTF-8 sans BOM, fins de ligne CRLF, une ligne par évènement : `HH:MM:SS<TAB>NIVEAU<TAB>message`.

const SEPARATEUR_LIGNE = '\r\n';
const CARACTERES_INTERDITS_NOM = '<>:"|?*/\\';
const LIGNE_CONFORME = new RegExp(
  `^(\\d{2}:\\d{2}:\\d{2})\\t(${NIVEAUX_JOURNAL.join('|')})\\t(.*)$`,
);

const encodeur = new TextEncoder();

function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

/** `HH:MM:SS`, heure locale. */
export function formaterHeure(date: Date): string {
  return `${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}:${deuxChiffres(date.getSeconds())}`;
}

/** `JJ/MM/AAAA`, date locale. */
function formaterDate(date: Date): string {
  return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Compte nettoyé pour le NOM de fichier : `< > : " | ? * / \` et caractères de contrôle remplacés
 * par `_`, points et espaces de fin retirés, `inconnu` si le résultat est vide.
 */
export function nettoyerComptePourNom(compte: string): string {
  let nettoye = '';
  for (const caractere of compte) {
    const interdit = caractere.charCodeAt(0) < 0x20 || CARACTERES_INTERDITS_NOM.includes(caractere);
    nettoye += interdit ? '_' : caractere;
  }
  nettoye = nettoye.replace(/[. ]+$/, '');
  return nettoye === '' ? 'inconnu' : nettoye;
}

/** `AAAAMMJJ-HHMMSS-{compte}.txt`, heure locale du démarrage. */
export function nomFichierSession(debut: Date, compte: string): string {
  const jour = `${debut.getFullYear()}${deuxChiffres(debut.getMonth() + 1)}${deuxChiffres(debut.getDate())}`;
  const heure = `${deuxChiffres(debut.getHours())}${deuxChiffres(debut.getMinutes())}${deuxChiffres(debut.getSeconds())}`;
  return `${jour}-${heure}-${nettoyerComptePourNom(compte)}.txt`;
}

/** `AAAA/MM/nom.txt` : chemin relatif dans l'emplacement `journal` (barres obliques `/`). */
export function cheminFichierSession(debut: Date, compte: string): string {
  const annee = String(debut.getFullYear());
  const mois = deuxChiffres(debut.getMonth() + 1);
  return `${annee}/${mois}/${nomFichierSession(debut, compte)}`;
}

/** Un évènement tient toujours sur une ligne : `\r`, `\n` et `\t` deviennent une espace. */
function nettoyerMessage(message: string): string {
  return message.replace(/[\r\n\t]/g, ' ');
}

/** Une ligne du fichier, fin de ligne CRLF comprise. */
export function formaterLigne(date: Date, niveau: NiveauJournal, message: string): string {
  return `${formaterHeure(date)}\t${niveau}\t${nettoyerMessage(message)}${SEPARATEUR_LIGNE}`;
}

export interface ParametresEntete {
  debut: Date;
  /** Compte brut (nettoyé seulement des tabulations et sauts de ligne). */
  compte: string;
  poste: string;
  mode: string;
  version: string;
}

/** Les 5 lignes d'en-tête, horodatées au début de la session. */
export function formaterEntete({
  debut,
  compte,
  poste,
  mode,
  version,
}: ParametresEntete): string[] {
  return [
    formaterLigne(
      debut,
      'TITRE',
      `Début de session le ${formaterDate(debut)} à ${formaterHeure(debut)}`,
    ),
    formaterLigne(debut, 'INFO', `Compte Windows : ${compte}`),
    formaterLigne(debut, 'INFO', `Poste : ${poste}`),
    formaterLigne(debut, 'INFO', `Mode : ${mode}`),
    formaterLigne(debut, 'INFO', `Version de Flussi : ${version}`),
  ];
}

/** UTF-8 sans BOM. */
export function encoderLignes(lignes: readonly string[]): Uint8Array {
  return encodeur.encode(lignes.join(''));
}

/**
 * Analyse le contenu d'un fichier de session. Décodage UTF-8 non fatal ; une ligne non conforme
 * est gardée telle quelle (`heure` et `niveau` à `null`). La dernière ligne vide est ignorée.
 */
export function analyserContenu(octets: Uint8Array): LigneJournal[] {
  const lignes = new TextDecoder('utf-8').decode(octets).split(/\r?\n/);
  if (lignes[lignes.length - 1] === '') lignes.pop();

  return lignes.map((ligne): LigneJournal => {
    const m = LIGNE_CONFORME.exec(ligne);
    if (!m) return { heure: null, niveau: null, message: ligne };
    return { heure: m[1] as string, niveau: m[2] as NiveauJournal, message: m[3] as string };
  });
}
