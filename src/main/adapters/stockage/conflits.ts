import { win32 } from 'node:path';

// Copies de conflit OneDrive. Pur : travaille sur une liste de noms, sans système de fichiers.

// Nom de poste Windows : lettres, chiffres et tirets, 15 caractères au plus, jamais uniquement des
// chiffres (sinon `Rejets-20261014.txt` passerait pour une copie de `Rejets.txt`). Pas de point :
// le journal Flussi `20261014-091500-c.mathevon.txt` n'est pas pris pour une copie du journal
// Lazarus `20261014-091500.txt`.
const POSTE_MAX_CARACTERES = 15;
const CARACTERES_POSTE = /^[A-Za-z0-9-]+$/;
const UNE_LETTRE = /[A-Za-z]/;
const POSTE_PUIS_NUMERO = /^(.+)-\d+$/;

function estNomPoste(texte: string): boolean {
  return (
    texte.length <= POSTE_MAX_CARACTERES && CARACTERES_POSTE.test(texte) && UNE_LETTRE.test(texte)
  );
}

/**
 * SUITE (ce qui suit `base-`) vaut `POSTE` ou `POSTE-n` (n en chiffres). Un tiret dans le nom du
 * poste rend `PC-2` ambigu (poste `PC-2`, ou poste `PC` suivi de `-2`) : une des deux lectures
 * suffit.
 */
function estSuiteConflit(suite: string): boolean {
  if (estNomPoste(suite)) return true;
  const poste = POSTE_PUIS_NUMERO.exec(suite)?.[1];
  return poste !== undefined && estNomPoste(poste);
}

/**
 * Parmi les noms de fichiers d'un même dossier, ceux qui sont des copies de conflit probables :
 * `base-SUITE.ext` quand `base.ext` existe (casse ignorée). Le résultat contient des noms tels
 * qu'ils figurent dans la liste. Rien n'est supprimé ni fusionné.
 */
export function trouverCopiesConflit(noms: readonly string[]): Set<string> {
  const existants = new Set(noms.map((nom) => nom.toLowerCase()));
  const copies = new Set<string>();

  for (const nom of noms) {
    const extension = win32.extname(nom);
    const radical = nom.slice(0, nom.length - extension.length);

    // La base peut elle-même contenir des tirets : tous les points de coupure sont essayés,
    // à partir de l'indice 1 (une base vide n'a pas de sens)
    for (let i = radical.indexOf('-', 1); i > 0; i = radical.indexOf('-', i + 1)) {
      const suite = radical.slice(i + 1);
      if (
        estSuiteConflit(suite) &&
        existants.has((radical.slice(0, i) + extension).toLowerCase())
      ) {
        copies.add(nom);
        break;
      }
    }
  }
  return copies;
}
