// Codes de rejet MSP `ERR001` à `ERR027` : parité de `uRejetsDescription.pas` (Lazarus), table
// `charger_rejets_description` et recherche `get_description`. Utilisé par la lecture des rejets
// MSP (`rejet.ts`). Le message attendu est préparé par l'appelant comme Lazarus le fait (espaces de
// tête conservés, espaces de fin retirés, à partir de l'octet 719) : ce n'est pas le rôle de cette
// fonction, qui compare le message tel quel (aucun Trim, aucune normalisation, casse et doubles
// espaces compris). La table est gelée en profondeur.
//
// Les explications sont celles de `Rejets - Explications.txt` : textes provisoires repris tels
// quels (parité). Le fichier texte n'est plus lu, une évolution éventuelle se fera dans ce code.

export const CODES_REJET = [
  'ERR001',
  'ERR002',
  'ERR003',
  'ERR004',
  'ERR005',
  'ERR006',
  'ERR007',
  'ERR008',
  'ERR009',
  'ERR010',
  'ERR011',
  'ERR012',
  'ERR013',
  'ERR014',
  'ERR015',
  'ERR016',
  'ERR017',
  'ERR018',
  'ERR019',
  'ERR020',
  'ERR021',
  'ERR022',
  'ERR023',
  'ERR024',
  'ERR025',
  'ERR026',
  'ERR027',
] as const;

export type CodeRejet = (typeof CODES_REJET)[number];

/** `REJET_START`, `REJET_IN`, `REJET_END` et `REJET_ALL` de Lazarus. */
export type ModeRecherche = 'debut' | 'contenu' | 'fin' | 'egalite';

export interface RechercheRejet {
  readonly texte: string;
  readonly mode: ModeRecherche;
}

/** 1 à 3 recherches, toutes à satisfaire (les `REJET_NONE` de Lazarus sont absentes). */
export interface DescriptionRejet {
  readonly code: CodeRejet;
  readonly recherches: readonly RechercheRejet[];
  readonly explication: string;
}

export const MESSAGE_REJET_INCONNU = 'Erreur inconnue. Contactez le service informatique.';

function debut(texte: string): RechercheRejet {
  return Object.freeze({ texte, mode: 'debut' });
}

function contenu(texte: string): RechercheRejet {
  return Object.freeze({ texte, mode: 'contenu' });
}

function fin(texte: string): RechercheRejet {
  return Object.freeze({ texte, mode: 'fin' });
}

function egalite(texte: string): RechercheRejet {
  return Object.freeze({ texte, mode: 'egalite' });
}

function rejet(code: CodeRejet, ...recherches: RechercheRejet[]): DescriptionRejet {
  return Object.freeze({
    code,
    recherches: Object.freeze(recherches),
    explication: `Aide ${code}`,
  });
}

/** Dans l'ordre de Lazarus : le premier code qui correspond l'emporte. */
export const REJETS: readonly DescriptionRejet[] = Object.freeze([
  rejet(
    'ERR001',
    debut("Acte de gestion  Modification d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR002',
    debut("Acte de gestion  Radiation d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR003',
    debut("Acte de gestion  Reactivation d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR004',
    debut('Contrat'),
    contenu(
      "échec de la réactivation du contrat, pas d'opération de résiliation trouvée. Valeur du code retour du SAD de recherche d'une opération CI0042A",
    ),
  ),
  rejet(
    'ERR005',
    debut("Dans le cadre d'une souscription, le contrat"),
    fin('existe déjà (CI9101M)'),
  ),
  rejet('ERR006', debut('Département tarifaire'), fin('invalide')),
  rejet(
    'ERR007',
    debut('Evenement rejeté, pour le contrat'),
    contenu("il existe des doublons pour la personne de rang dans l'evenement"),
  ),
  rejet(
    'ERR008',
    debut('Existence dans le contrat'),
    contenu("d'un  jumeau qui a les mêmes rang naissance/date de naissance/numéro RO :"),
    contenu("que la personne de rang dans l'événement"),
  ),
  rejet('ERR009', debut('Incohérence du centre de paiement')),
  rejet(
    'ERR010',
    debut('La garantie'),
    contenu("de l'assuré de rang"),
    contenu("ne peut etre radiée car elle n'est pas valide pour le contrat"),
  ),
  rejet(
    'ERR011',
    debut("L'acte de gestion ACMA en date d'effet"),
    contenu("n'est pas autorisé (traversabilité) pour le contrat"),
  ),
  rejet(
    'ERR012',
    debut(
      "L'adresse présente pour le role PERSONNE PRINCIPALE est incorrecte pour la personne de rang dans l'evenement",
    ),
  ),
  rejet('ERR013', debut("L'assuré de rang"), fin("existe déjà pour l'adjonction d'assuré")),
  rejet(
    'ERR014',
    debut("L'assuré de rang"),
    contenu('pour le contrat'),
    contenu("existe deja à une date d'effet différente"),
  ),
  rejet(
    'ERR015',
    debut('Le contrat'),
    contenu("n'existe pas, ou bien n'est pas valide a la date d'effet de l'opération"),
  ),
  rejet('ERR016', debut("Le début d'exercice madelin est obligatoire pour le contrat")),
  rejet('ERR017', debut('Le nom présent pour le role'), contenu('de la personne de rang')),
  rejet(
    'ERR018',
    debut(
      "Le rib présent pour le role PERSONNE PRINCIPALE est incorrect pour la personne de rang dans l'evenement",
    ),
  ),
  rejet('ERR019', debut("Les données RO de la personne de rang dans l'evenement")),
  rejet(
    'ERR020',
    debut(
      'Mode de règlement = prélèvement ou versement et RIB DEST PREST CONTRAT absent pour le contrat',
    ),
  ),
  rejet('ERR021', egalite("Pas d'enregistrement de fin d'évènement")),
  rejet(
    'ERR022',
    debut("Pour l'assuré"),
    contenu('du contrat'),
    fin(
      "radiation de garantie impossible, un assuré doit avoir au moins une garantie valide a la date d'effet de l'operation",
    ),
  ),
  rejet(
    'ERR023',
    debut('Pour le contrat'),
    contenu("et l'assuré de rang"),
    contenu('on ne peut re-souscrire a la meme garantie'),
  ),
  rejet(
    'ERR024',
    debut(
      'Probleme lors de la création ou mise à jour des caractéristiques physiques de la personne de rang evt',
    ),
  ),
  rejet(
    'ERR025',
    egalite('Rang de naissance RO identique pour même date de naissance / numéro RO'),
  ),
  rejet(
    'ERR026',
    debut(
      "Role ASSURE (ENTITE 400) absent dans l'evenement souscription du contrat 00 de la personne de rang evt",
    ),
  ),
  rejet(
    'ERR027',
    debut('La garantie'),
    contenu("de l'assuré de rang"),
    contenu("ne peut etre radiée car elle n'existe pas pour le contrat"),
  ),
]);

function correspond(message: string, recherche: RechercheRejet): boolean {
  switch (recherche.mode) {
    case 'debut':
      return message.startsWith(recherche.texte);
    case 'contenu':
      return message.includes(recherche.texte);
    case 'fin':
      return message.endsWith(recherche.texte);
    case 'egalite':
      return message === recherche.texte;
  }
}

/**
 * Code et explication d'un message de rejet MSP. Le premier code (ERR001 à ERR027) dont toutes les
 * recherches correspondent l'emporte.
 *
 * Divergence 10 : message vide ou non reconnu → `code: null` et `MESSAGE_REJET_INCONNU` comme
 * explication. Lazarus passe ce texte à `get_explication` à la place d'un code et affiche une
 * description vide (bug).
 */
export function identifierRejet(message: string): {
  readonly code: CodeRejet | null;
  readonly explication: string;
} {
  const trouve =
    message === ''
      ? undefined
      : REJETS.find((description) =>
          description.recherches.every((recherche) => correspond(message, recherche)),
        );
  return Object.freeze(
    trouve === undefined
      ? { code: null, explication: MESSAGE_REJET_INCONNU }
      : { code: trouve.code, explication: trouve.explication },
  );
}
