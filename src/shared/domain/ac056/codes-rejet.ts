// Codes de rejet MSP `ERR001` à `ERR034`. `ERR001` à `ERR027` : parité de `uRejetsDescription.pas`
// (Lazarus), table `charger_rejets_description` et recherche `get_description`. `ERR028` à `ERR034`
// : propres à Flussi (écart 4 de la v0.3.0), établis d'après les rejets MSP de 2026
// (`docs/bilan-rejets-2026.md`), ajoutés après `ERR027` pour garder l'ordre de Lazarus (le premier
// code qui correspond l'emporte). Utilisé par la lecture des rejets MSP (`rejet.ts`). Le message
// attendu est préparé par l'appelant comme Lazarus le fait (espaces de tête conservés, espaces de
// fin retirés, à partir de l'octet 719) : ce n'est pas le rôle de cette fonction, qui compare le
// message tel quel (aucun Trim, aucune normalisation, casse et doubles espaces compris). La table
// est gelée en profondeur.
//
// Explications : `Rejets - Explications.txt` de Lazarus ne contient que des textes provisoires
// (« Aide ERRxxx »), jamais affichés par Flussi. Divergence 12 : chaque explication est rédigée pour
// Flussi et validée par l'utilisateur (`docs/bilan-rejets-2026.md`, 2026-10-22). `ERR030` n'en a
// pas (décision de l'utilisateur) : l'écran n'affiche que le code et le message de MSP. Le fichier
// texte n'est plus lu : toute explication est écrite dans ce code.

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
  'ERR028',
  'ERR029',
  'ERR030',
  'ERR031',
  'ERR032',
  'ERR033',
  'ERR034',
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
  /** Texte validé pour Flussi (divergence 12) ; null : pas d'explication (`ERR030`). */
  readonly explication: string | null;
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

function rejet(
  code: CodeRejet,
  explication: string | null,
  ...recherches: RechercheRejet[]
): DescriptionRejet {
  return Object.freeze({
    code,
    recherches: Object.freeze(recherches),
    explication,
  });
}

/** Dans l'ordre de Lazarus, puis les codes de Flussi : le premier code qui correspond l'emporte. */
export const REJETS: readonly DescriptionRejet[] = Object.freeze([
  rejet(
    'ERR001',
    "MSP refuse la modification de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut("Acte de gestion  Modification d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR002',
    "MSP refuse la radiation de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut("Acte de gestion  Radiation d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR003',
    "MSP refuse la réactivation de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut("Acte de gestion  Reactivation d assure non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR004',
    "MSP ne peut pas réactiver le contrat : aucune résiliation de ce contrat n'est enregistrée chez MSP. Vérifiez dans VEOS que la résiliation a bien été transmise à MSP avant la réactivation.",
    debut('Contrat'),
    contenu(
      "échec de la réactivation du contrat, pas d'opération de résiliation trouvée. Valeur du code retour du SAD de recherche d'une opération CI0042A",
    ),
  ),
  rejet(
    'ERR005',
    "MSP refuse la souscription : le contrat existe déjà chez MSP. La souscription a probablement déjà été transmise ; vérifiez dans VEOS qu'il ne s'agit pas d'un doublon.",
    debut("Dans le cadre d'une souscription, le contrat"),
    fin('existe déjà (CI9101M)'),
  ),
  rejet(
    'ERR006',
    "Le département tarifaire transmis n'est pas reconnu par MSP. Vérifiez l'adresse et le département dans VEOS.",
    debut('Département tarifaire'),
    fin('invalide'),
  ),
  rejet(
    'ERR007',
    "MSP refuse l'évènement : la même personne apparaît plusieurs fois sur ce contrat (même rang). Vérifiez les bénéficiaires de l'évènement dans VEOS.",
    debut('Evenement rejeté, pour le contrat'),
    contenu("il existe des doublons pour la personne de rang dans l'evenement"),
  ),
  rejet(
    'ERR008',
    'Un jumeau est déjà enregistré sur le contrat avec le même rang de naissance, la même date de naissance et le même numéro de Sécurité sociale que cette personne. Donnez à chacun un rang de naissance différent dans VEOS.',
    debut('Existence dans le contrat'),
    contenu("d'un  jumeau qui a les mêmes rang naissance/date de naissance/numéro RO :"),
    contenu("que la personne de rang dans l'événement"),
  ),
  rejet(
    'ERR009',
    'Le centre de paiement transmis est incohérent pour MSP. Vérifiez le centre de paiement et le régime obligatoire de la personne dans VEOS.',
    debut('Incohérence du centre de paiement'),
  ),
  rejet(
    'ERR010',
    "MSP ne peut pas radier cette garantie : elle n'est pas valide sur le contrat à la date d'effet de la radiation. Vérifiez la garantie et la date d'effet dans VEOS.",
    debut('La garantie'),
    contenu("de l'assuré de rang"),
    contenu("ne peut etre radiée car elle n'est pas valide pour le contrat"),
  ),
  rejet(
    'ERR011',
    "L'acte de gestion ACMA n'est pas autorisé à cette date d'effet sur ce contrat : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut("L'acte de gestion ACMA en date d'effet"),
    contenu("n'est pas autorisé (traversabilité) pour le contrat"),
  ),
  rejet(
    'ERR012',
    "MSP refuse l'adresse de l'assuré principal. Vérifiez l'adresse dans VEOS (voie, code postal, localité).",
    debut(
      "L'adresse présente pour le role PERSONNE PRINCIPALE est incorrecte pour la personne de rang dans l'evenement",
    ),
  ),
  rejet(
    'ERR013',
    "MSP refuse l'ajout de cet assuré : un assuré de ce rang existe déjà sur le contrat. Vérifiez le rang du bénéficiaire dans VEOS.",
    debut("L'assuré de rang"),
    fin("existe déjà pour l'adjonction d'assuré"),
  ),
  rejet(
    'ERR014',
    "L'assuré de ce rang existe déjà sur le contrat chez MSP, avec une autre date d'effet. Vérifiez le rang et la date d'effet dans VEOS.",
    debut("L'assuré de rang"),
    contenu('pour le contrat'),
    contenu("existe deja à une date d'effet différente"),
  ),
  rejet(
    'ERR015',
    "Le contrat est inconnu de MSP, ou n'est pas valide à la date d'effet de l'opération. Vérifiez le numéro de contrat et la date d'effet dans VEOS ; la souscription a peut-être été rejetée ou n'a pas encore été transmise.",
    debut('Le contrat'),
    contenu("n'existe pas, ou bien n'est pas valide a la date d'effet de l'opération"),
  ),
  rejet(
    'ERR016',
    "Ce contrat Madelin exige une date de début d'exercice. Renseignez-la dans VEOS.",
    debut("Le début d'exercice madelin est obligatoire pour le contrat"),
  ),
  rejet(
    'ERR017',
    'MSP refuse le nom de cette personne pour le rôle indiqué dans le message. Vérifiez le nom dans VEOS.',
    debut('Le nom présent pour le role'),
    contenu('de la personne de rang'),
  ),
  rejet(
    'ERR018',
    "MSP refuse le RIB de l'assuré principal. Vérifiez le RIB dans VEOS.",
    debut(
      "Le rib présent pour le role PERSONNE PRINCIPALE est incorrect pour la personne de rang dans l'evenement",
    ),
  ),
  rejet(
    'ERR019',
    'MSP refuse les données de régime obligatoire de cette personne (numéro de Sécurité sociale, régime, caisse). Vérifiez-les dans VEOS.',
    debut("Les données RO de la personne de rang dans l'evenement"),
  ),
  rejet(
    'ERR020',
    "Le mode de règlement est le prélèvement ou le virement, mais aucun RIB de remboursement des prestations n'est transmis. Renseignez le RIB dans VEOS.",
    debut(
      'Mode de règlement = prélèvement ou versement et RIB DEST PREST CONTRAT absent pour le contrat',
    ),
  ),
  rejet(
    'ERR021',
    "Le fichier reçu par MSP ne contenait pas la ligne de fin de l'évènement (990) : le fichier envoyé était incomplet.",
    egalite("Pas d'enregistrement de fin d'évènement"),
  ),
  rejet(
    'ERR022',
    "MSP ne peut pas radier cette garantie : l'assuré n'aurait plus aucune garantie valide à la date d'effet. Gardez au moins une garantie, ou radiez l'assuré, dans VEOS.",
    debut("Pour l'assuré"),
    contenu('du contrat'),
    fin(
      "radiation de garantie impossible, un assuré doit avoir au moins une garantie valide a la date d'effet de l'operation",
    ),
  ),
  rejet(
    'ERR023',
    "L'assuré a déjà cette garantie (code dans le message) : MSP refuse de la souscrire une seconde fois. Vérifiez dans VEOS qu'il ne s'agit pas d'un doublon.",
    debut('Pour le contrat'),
    contenu("et l'assuré de rang"),
    contenu('on ne peut re-souscrire a la meme garantie'),
  ),
  rejet(
    'ERR024',
    "MSP n'a pas pu enregistrer les caractéristiques de cette personne (date de naissance, sexe…). Vérifiez-les dans VEOS ; si elles sont justes, contactez MSP.",
    debut(
      'Probleme lors de la création ou mise à jour des caractéristiques physiques de la personne de rang evt',
    ),
  ),
  rejet(
    'ERR025',
    'Deux personnes ont la même date de naissance, le même numéro de Sécurité sociale et le même rang de naissance (jumeaux). Donnez à chacune un rang de naissance différent dans VEOS.',
    egalite('Rang de naissance RO identique pour même date de naissance / numéro RO'),
  ),
  rejet(
    'ERR026',
    "L'évènement de souscription ne contient pas l'assuré (entité 400) de cette personne. Vérifiez les bénéficiaires de l'évènement dans VEOS.",
    debut(
      "Role ASSURE (ENTITE 400) absent dans l'evenement souscription du contrat 00 de la personne de rang evt",
    ),
  ),
  rejet(
    'ERR027',
    "MSP ne peut pas radier cette garantie : elle n'existe pas sur le contrat. Vérifiez la garantie radiée dans VEOS.",
    debut('La garantie'),
    contenu("de l'assuré de rang"),
    contenu("ne peut etre radiée car elle n'existe pas pour le contrat"),
  ),
  // Codes propres à Flussi (écart 4 de la v0.3.0), après ceux de Lazarus.
  rejet(
    'ERR028',
    "L'acte de gestion indiqué dans le message n'est pas autorisé à cette date d'effet sur ce contrat : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut("L'acte de gestion"),
    contenu("en date d'effet"),
    contenu("n'est pas autorisé (traversabilité) pour le contrat"),
  ),
  rejet(
    'ERR029',
    "Le contrat est inconnu de MSP, ou n'est pas valide à la date d'effet de l'opération. Vérifiez le numéro de contrat et la date d'effet dans VEOS ; la souscription a peut-être été rejetée ou n'a pas encore été transmise.",
    debut('Le contrat'),
    contenu("n'existe pas, ou bien n'est pas valide à la date d'effet de l'opération"),
  ),
  rejet(
    'ERR030',
    null,
    debut("Pour l'assure"),
    contenu('du contrat'),
    fin("radiation impossible, c'est le seul assure valide a la date d'effet de l'operation"),
  ),
  rejet(
    'ERR031',
    "Le changement de couverture de l'assuré de ce rang n'est pas autorisé à cette date d'effet : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP.",
    debut('Acte de gestion'),
    contenu("Changement de couverture non traversable pour l'assuré de rang"),
  ),
  rejet(
    'ERR032',
    "Le même assuré figure deux fois (entité 400) dans l'évènement. Vérifiez les bénéficiaires de l'évènement dans VEOS.",
    debut('Doublon role ASSURE (ENTITE'),
    contenu('pour la personne de rang evt'),
  ),
  rejet(
    'ERR033',
    "MSP n'a pas pu réactiver le contrat (erreur interne de MSP). Contactez MSP.",
    debut('Contrat'),
    contenu(
      'échec de la réactivation du contrat. Valeur du code retour du SAD de réactivation contrat',
    ),
  ),
  rejet(
    'ERR034',
    'MSP interdit la sélection de cette personne. Contactez MSP pour en connaître la raison.',
    debut('Sélection de la personne interdite'),
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
 * Code et explication d'un message de rejet MSP. Le premier code (ERR001 à ERR034) dont toutes les
 * recherches correspondent l'emporte ; son explication est celle de la table (null sans
 * explication, `ERR030`).
 *
 * Divergence 10 : message vide ou non reconnu → `code: null` et `MESSAGE_REJET_INCONNU` comme
 * explication. Lazarus passe ce texte à `get_explication` à la place d'un code et affiche une
 * description vide (bug).
 */
export function identifierRejet(message: string): {
  readonly code: CodeRejet | null;
  readonly explication: string | null;
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
