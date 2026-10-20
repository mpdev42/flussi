// Aides des tests de parité `*.lazarus.test.ts` : lecture des sources Lazarus de référence
// (`docs/reference/lazarus/`, copies conformes, sans donnée personnelle), littéraux Pascal, nom
// Flussi d'une variable Pascal et analyse de la fiche `fmain.lfm`. Jamais importé hors tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Encodage de lecture d'une source : `utf8` est vérifié (sans BOM ni octet invalide). */
export type EncodageSource = 'utf8' | 'latin1';

/**
 * Contenu d'un fichier de `docs/reference/lazarus/`. En `utf8` (par défaut), lève si le fichier a
 * un BOM ou n'est pas de l'UTF-8 valide. `latin1` lit un octet par caractère (`uac056.pas`).
 */
export function lireSourceLazarus(nom: string, encodage: EncodageSource = 'utf8'): string {
  const chemin = fileURLToPath(new URL(`../../../docs/reference/lazarus/${nom}`, import.meta.url));
  const octets = readFileSync(chemin);
  if (encodage === 'latin1') return octets.toString('latin1');
  const texte = octets.toString('utf8');
  if (texte.startsWith('\uFEFF') || texte.includes('\uFFFD')) {
    throw new Error(`${nom} : UTF-8 sans BOM attendu`);
  }
  return texte;
}

/** Littéral Pascal `'...'` (apostrophe doublée) vers sa valeur. */
export function valeurLitteral(litteral: string): string {
  return litteral.slice(1, -1).replaceAll("''", "'");
}

/**
 * Nom Flussi d'une variable Pascal (règle mécanique) : retire le préfixe `s_` et le suffixe final
 * `_n` ou `_d`, puis passe en camelCase. `s_num_dossier_n` → `numDossier`, `s_prenom_1` → `prenom1`.
 */
export function nomFlussi(variable: string): string {
  return variable
    .replace(/^s_/, '')
    .replace(/_[nd]$/, '')
    .split('_')
    .map((mot, i) => (i === 0 ? mot : mot.charAt(0).toUpperCase() + mot.slice(1)))
    .join('');
}

/** Messages littéraux des appels `ajouter_controle_erreur` de `ucontrole.pas` (28 distincts). */
export function messagesControleLazarus(): ReadonlySet<string> {
  const source = lireSourceLazarus('ucontrole.pas');
  const motif = /ajouter_controle_erreur\([^;]*?,\s*('(?:[^']|'')*')\);/g;
  return new Set([...source.matchAll(motif)].map((m) => valeurLitteral(m[1]!)));
}

// ---------------------------------------------------------------------------------------------
// Analyse de `fmain.lfm` (format texte des fiches LCL)
// ---------------------------------------------------------------------------------------------

/** Valeur d'une propriété LFM. `symbole` : nombre, identifiant, ensemble `[…]` ou binaire `{…}`. */
export type ValeurLfm =
  | { readonly nature: 'chaine'; readonly valeur: string }
  | { readonly nature: 'liste'; readonly elements: readonly ValeurLfm[] }
  | { readonly nature: 'symbole'; readonly valeur: string };

/** Objet LFM : `object Nom: TType`, ses propriétés (dans l'ordre) et ses objets imbriqués. */
export interface ObjetLfm {
  readonly nom: string;
  readonly type: string;
  readonly proprietes: ReadonlyMap<string, ValeurLfm>;
  readonly enfants: readonly ObjetLfm[];
}

const MOTIF_OBJET = /^(?:object|inherited|inline)\s+(\w+)\s*:\s*(\w+)$/;
const MOTIF_PROPRIETE = /^([\w.]+)\s*=\s*(.*)$/;

/** Lecteur de lignes rognées, avec numéro (base 1) pour les messages d'erreur. */
class Lignes {
  private indice = 0;
  constructor(private readonly lignes: readonly string[]) {}

  get numero(): number {
    return this.indice + 1;
  }
  get fini(): boolean {
    return this.indice >= this.lignes.length;
  }
  courante(): string {
    return this.lignes[this.indice]!.trim();
  }
  avancer(): string {
    return this.lignes[this.indice++]!.trim();
  }
}

/**
 * Lit une expression de chaîne à partir du début de `texte` : segments `'…'` (apostrophe doublée)
 * et `#nnn` (code de caractère) juxtaposés. Renvoie la valeur et le reste du texte, ou null si le
 * texte ne commence pas par une chaîne.
 */
function lireSegments(texte: string): { valeur: string; reste: string } | null {
  let valeur = '';
  let i = 0;
  let lu = false;
  while (i < texte.length) {
    if (texte[i] === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= texte.length) throw new Error(`Chaîne LFM non terminée : ${texte}`);
        if (texte[j] === "'") {
          if (texte[j + 1] === "'") {
            valeur += "'";
            j += 2;
            continue;
          }
          break;
        }
        valeur += texte[j];
        j++;
      }
      i = j + 1;
      lu = true;
    } else if (texte[i] === '#') {
      const code = /^#(\d+)/.exec(texte.slice(i));
      if (code === null) break;
      valeur += String.fromCodePoint(Number(code[1]));
      i += code[0].length;
      lu = true;
    } else {
      break;
    }
  }
  return lu ? { valeur, reste: texte.slice(i).trim() } : null;
}

/**
 * Chaîne qui commence par `premiere` : concaténations `'…' + '…'` sur la même ligne, ou continuées
 * sur les lignes suivantes (ligne terminée par `+`, ou ligne suivante commençant par `+`).
 */
function lireChaine(premiere: string, lignes: Lignes): string {
  let valeur = '';
  let texte = premiere;
  for (;;) {
    const lue = lireSegments(texte);
    if (lue === null) throw new Error(`Chaîne LFM attendue ligne ${lignes.numero} : ${texte}`);
    valeur += lue.valeur;
    if (lue.reste.startsWith('+')) {
      texte = lue.reste.slice(1).trim();
      if (texte === '') {
        if (lignes.fini) throw new Error('Chaîne LFM continuée après la fin du fichier');
        texte = lignes.avancer();
      }
    } else if (lue.reste !== '') {
      throw new Error(`Suite inattendue après une chaîne LFM ligne ${lignes.numero}`);
    } else if (!lignes.fini && lignes.courante().startsWith('+')) {
      texte = lignes.avancer().slice(1).trim();
    } else {
      return valeur;
    }
  }
}

/** Élément d'une liste `( … )` : chaîne (éventuellement concaténée) ou symbole (nombre…). */
function lireElement(premiere: string, lignes: Lignes): ValeurLfm {
  if (premiere.startsWith("'") || premiere.startsWith('#')) {
    return { nature: 'chaine', valeur: lireChaine(premiere, lignes) };
  }
  return { nature: 'symbole', valeur: premiere };
}

/** Valeur d'une propriété dont le texte après `=` est `texte`. */
function lireValeur(texte: string, lignes: Lignes): ValeurLfm {
  if (texte === '(') {
    const elements: ValeurLfm[] = [];
    for (;;) {
      if (lignes.fini) throw new Error('Liste LFM non terminée');
      const ligne = lignes.avancer();
      if (ligne === ')') return { nature: 'liste', elements };
      // Dernier élément collé à la parenthèse fermante : `'x')` ou `12)`.
      if (ligne.endsWith(')')) {
        const avant = ligne.slice(0, -1).trim();
        elements.push(lireElement(avant, lignes));
        return { nature: 'liste', elements };
      }
      elements.push(lireElement(ligne, lignes));
    }
  }
  if (texte === '{' || (texte.startsWith('{') && !texte.endsWith('}'))) {
    let binaire = texte;
    while (!binaire.endsWith('}')) {
      if (lignes.fini) throw new Error('Binaire LFM non terminé');
      binaire += lignes.avancer();
    }
    return { nature: 'symbole', valeur: binaire };
  }
  if (texte.startsWith("'") || texte.startsWith('#')) {
    return { nature: 'chaine', valeur: lireChaine(texte, lignes) };
  }
  return { nature: 'symbole', valeur: texte };
}

function lireObjet(nom: string, type: string, lignes: Lignes): ObjetLfm {
  const proprietes = new Map<string, ValeurLfm>();
  const enfants: ObjetLfm[] = [];
  for (;;) {
    if (lignes.fini) throw new Error(`Objet LFM ${nom} non terminé`);
    const ligne = lignes.avancer();
    if (ligne === '') continue;
    if (ligne === 'end') return { nom, type, proprietes, enfants };
    const objet = MOTIF_OBJET.exec(ligne);
    if (objet !== null) {
      enfants.push(lireObjet(objet[1]!, objet[2]!, lignes));
      continue;
    }
    const propriete = MOTIF_PROPRIETE.exec(ligne);
    if (propriete === null) {
      throw new Error(`Ligne LFM ${lignes.numero - 1} non reconnue dans ${nom}`);
    }
    proprietes.set(propriete[1]!, lireValeur(propriete[2]!.trim(), lignes));
  }
}

/** Analyse un texte LFM : l'objet racine et tout son arbre. */
export function analyserLfm(texte: string): ObjetLfm {
  const lignes = new Lignes(texte.split(/\r?\n/));
  while (!lignes.fini && lignes.courante() === '') lignes.avancer();
  const racine = MOTIF_OBJET.exec(lignes.fini ? '' : lignes.avancer());
  if (racine === null) throw new Error('LFM : objet racine attendu');
  const objet = lireObjet(racine[1]!, racine[2]!, lignes);
  while (!lignes.fini) {
    if (lignes.avancer() !== '') throw new Error('LFM : texte après la fin de l’objet racine');
  }
  return objet;
}

/** Objet racine de `fmain.lfm` (`frmMain`), lu en UTF-8 strict. */
export function lireLfm(): ObjetLfm {
  return analyserLfm(lireSourceLazarus('fmain.lfm'));
}

/** Objet `nom` de l'arbre de `racine` (la racine comprise) ; lève s'il est absent. */
export function trouverObjet(racine: ObjetLfm, nom: string): ObjetLfm {
  const pile: ObjetLfm[] = [racine];
  while (pile.length > 0) {
    const objet = pile.pop()!;
    if (objet.nom === nom) return objet;
    pile.push(...objet.enfants);
  }
  throw new Error(`Objet ${nom} absent de la fiche ${racine.nom}`);
}

/** Valeur d'une propriété chaîne, ou undefined si elle est absente ; lève si d'une autre nature. */
export function proprieteChaine(objet: ObjetLfm, nom: string): string | undefined {
  const valeur = objet.proprietes.get(nom);
  if (valeur === undefined) return undefined;
  if (valeur.nature !== 'chaine') throw new Error(`${objet.nom}.${nom} : chaîne attendue`);
  return valeur.valeur;
}

/** Valeur d'une propriété numérique entière, ou undefined si elle est absente. */
export function proprieteNombre(objet: ObjetLfm, nom: string): number | undefined {
  const valeur = objet.proprietes.get(nom);
  if (valeur === undefined) return undefined;
  if (valeur.nature !== 'symbole' || !/^-?\d+$/.test(valeur.valeur)) {
    throw new Error(`${objet.nom}.${nom} : nombre entier attendu`);
  }
  return Number(valeur.valeur);
}

/** Éléments d'une propriété liste de chaînes (`Items.Strings`), ou undefined si elle est absente. */
export function proprieteChaines(objet: ObjetLfm, nom: string): readonly string[] | undefined {
  const valeur = objet.proprietes.get(nom);
  if (valeur === undefined) return undefined;
  if (valeur.nature !== 'liste') throw new Error(`${objet.nom}.${nom} : liste attendue`);
  return valeur.elements.map((element) => {
    if (element.nature !== 'chaine') throw new Error(`${objet.nom}.${nom} : chaînes attendues`);
    return element.valeur;
  });
}
