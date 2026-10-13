// Écriture d'un fichier AC056 : parité de `EnregistrerFichierAc056` pour les lignes décrites
// (`AddCharR` de chaque champ, bourrage à droite, sans troncature), lignes brutes recopiées telles
// quelles, BOM et fins de ligne d'origine conservés.
import { ENTITES, LONGUEUR_LIGNE } from './entites';
import { addCharR } from './fpc';
import type { FichierAc056, FinDeLigne, LigneAc056 } from './modele';
import { joindreOctets, octetsDepuisTexte, tableauDepuisOctets, type Octets } from './octets';

const OCTETS_BOM = [0xef, 0xbb, 0xbf];

const FINS_DE_LIGNE: Readonly<Record<FinDeLigne, Octets>> = {
  '\r\n': octetsDepuisTexte('\r\n'),
  '\n': octetsDepuisTexte('\n'),
  '\r': octetsDepuisTexte('\r'),
  '': octetsDepuisTexte(''),
};

/** Octets de la ligne, sans fin de ligne. Lève une erreur si l'invariant des 700 octets est violé. */
export function contenuLigne(ligne: LigneAc056): Octets {
  if (ligne.nature === 'brute') return ligne.origine;

  const contenu = joindreOctets(
    ENTITES[ligne.code].champs.map((champ) => {
      const valeur: Octets | undefined = ligne.valeurs[champ.nom];
      if (valeur === undefined) {
        throw new Error(`Ligne ${ligne.numero} : valeur du champ ${champ.nom} absente.`);
      }
      return addCharR(champ.bourrage, valeur, champ.longueur);
    }),
  );
  if (contenu.length !== LONGUEUR_LIGNE) {
    throw new Error(
      `Ligne ${ligne.numero} (entité ${ligne.code}) : ${contenu.length} octets au lieu de ${LONGUEUR_LIGNE}.`,
    );
  }
  return contenu;
}

export function ecrireAc056(fichier: FichierAc056): Uint8Array {
  // Erreur de programmation (comme l'invariant des 700 octets) : l'écran ne propose jamais
  // d'enregistrer un rejet.
  if (fichier.provenance === 'rejet') {
    throw new Error('Un fichier de rejet est en lecture seule : il ne se réécrit jamais.');
  }
  const corps = tableauDepuisOctets(
    joindreOctets(
      fichier.lignes.flatMap((ligne) => [contenuLigne(ligne), FINS_DE_LIGNE[ligne.finDeLigne]]),
    ),
  );
  if (!fichier.bom) return corps;

  const resultat = new Uint8Array(OCTETS_BOM.length + corps.length);
  resultat.set(OCTETS_BOM, 0);
  resultat.set(corps, OCTETS_BOM.length);
  return resultat;
}
