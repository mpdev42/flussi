// Aide des tests de parité sur `PIEGES\` : lecture du relevé `NOM.erreurs.txt`, journal de Lazarus
// copié-collé à la main par l'utilisateur, soit en RTF (WordPad), soit en texte UTF-8.
// Ce n'est pas une donnée AC056 : le RTF est décodé en Windows-1252 (`\'xx`) et en Unicode (`\uN`).
// Seules les lignes d'erreur sont retenues :
//   `Dossier/Evènement DDDDDDDD/EEE : Entité NNN : message`
// Les titres, « Contrôle des données… », « Fin des contrôles » et le chemin du fichier sont ignorés.

export interface ErreurReleve {
  /** Numéro de dossier tel quel (8 caractères). */
  readonly dossier: string;
  /** Numéro d'évènement tel quel (3 caractères). */
  readonly evenement: string;
  /** Message depuis « Entité », sans les espaces de fin. */
  readonly message: string;
}

const MOTIF_ERREUR = /^Dossier\/Evènement (.{8})\/(.{3}) : (Entité .*)$/;
const DEBUT_RTF = '{\\rtf';

/** Début (après `{`) des groupes RTF sans texte de document : `\*`, `\fonttbl`, `\colortbl`. */
const GROUPES_IGNORES = /^\\(?:\*|(?:fonttbl|colortbl)(?![a-z]))/i;

interface EtatGroupe {
  /** Nombre de caractères de repli qui suivent un `\uN` (`\ucN`). */
  uc: number;
  ignore: boolean;
}

/** Texte brut d'un document RTF (extraction minimale). */
function extraireTexteRtf(source: string): string {
  const windows1252 = new TextDecoder('windows-1252');
  const piles: EtatGroupe[] = [];
  let etat: EtatGroupe = { uc: 1, ignore: false };
  let texte = '';
  let i = 0;

  const emettre = (valeur: string): void => {
    if (!etat.ignore) texte += valeur;
  };

  while (i < source.length) {
    const c = source[i]!;

    if (c === '{') {
      piles.push(etat);
      const ignore = GROUPES_IGNORES.test(source.slice(i + 1, i + 12));
      etat = { uc: etat.uc, ignore: etat.ignore || ignore };
      i++;
    } else if (c === '}') {
      etat = piles.pop() ?? etat;
      i++;
    } else if (c === '\\') {
      const suivant = source[i + 1] ?? '';

      if (suivant === '\\' || suivant === '{' || suivant === '}') {
        emettre(suivant);
        i += 2;
      } else if (suivant === "'") {
        const octet = Number.parseInt(source.slice(i + 2, i + 4), 16);
        if (!Number.isNaN(octet)) emettre(windows1252.decode(new Uint8Array([octet])));
        i += 4;
      } else if (suivant === '\r' || suivant === '\n') {
        emettre('\n');
        i += 2;
      } else if (/[a-z]/i.test(suivant)) {
        const mot = /^[a-z]+/i.exec(source.slice(i + 1))![0];
        i += 1 + mot.length;
        const nombre = /^-?\d+/.exec(source.slice(i))?.[0];
        if (nombre !== undefined) i += nombre.length;
        if (source[i] === ' ') i++;

        if (mot === 'par' || mot === 'line') {
          emettre('\n');
        } else if (mot === 'uc' && nombre !== undefined) {
          etat.uc = Number(nombre);
        } else if (mot === 'u' && nombre !== undefined) {
          const valeur = Number(nombre);
          emettre(String.fromCharCode(valeur < 0 ? valeur + 65536 : valeur));
          // Caractères de repli : un `\'xx` ou un caractère ordinaire chacun.
          for (let k = 0; k < etat.uc; k++) {
            if (source[i] === '\\' && source[i + 1] === "'") i += 4;
            else if (i < source.length && !'\\{}'.includes(source[i]!)) i++;
          }
        }
      } else {
        // Symbole de contrôle sans effet sur le texte (`\~`, `\-`, `\_`…).
        i += 2;
      }
    } else {
      // Les fins de ligne du source RTF ne sont pas du texte.
      if (c !== '\r' && c !== '\n') emettre(c);
      i++;
    }
  }
  return texte;
}

function decoderTexte(octets: Uint8Array): string {
  const debut = String.fromCharCode(...octets.subarray(0, DEBUT_RTF.length));
  if (debut === DEBUT_RTF) {
    return extraireTexteRtf(new TextDecoder('windows-1252').decode(octets));
  }
  return new TextDecoder('utf-8').decode(octets);
}

/** Erreurs du relevé Lazarus (RTF ou UTF-8, BOM éventuel), dans l'ordre du relevé. */
export function lireReleveLazarus(octets: Uint8Array): ErreurReleve[] {
  const erreurs: ErreurReleve[] = [];
  for (const ligne of decoderTexte(octets).split(/\r\n|\n|\r/)) {
    const m = MOTIF_ERREUR.exec(ligne);
    if (m) erreurs.push({ dossier: m[1]!, evenement: m[2]!, message: m[3]!.trimEnd() });
  }
  return erreurs;
}
