# Bilan des messages de rejet MSP de 2026

Bilan établi le 2026-10-22 (v0.3.0, item 4) par `npm run bilan:rejets`. Il porte sur les fichiers `AC056COUR_REJ_*` de 2026 du dossier `OUT` de production et de ses sous-dossiers. Les mots qui contiennent un chiffre sont remplacés par « … ». Le tableau a été relu par l'utilisateur, qui a vérifié qu'il ne contient aucune donnée personnelle.

## Totaux

- 96 fichiers de rejet en 2026, tous lisibles ; 5 047 lignes, dont 623 avec un message MSP.
- 28 messages distincts une fois masqués : 19 reconnus par un code existant, 9 sans code.
- 14 des 27 codes de Lazarus sont apparus en 2026 : `ERR001`, `ERR002`, `ERR005`, `ERR006`, `ERR007`, `ERR010`, `ERR012`, `ERR013`, `ERR017`, `ERR019`, `ERR023`, `ERR025`, `ERR026`, `ERR027`. Les 13 autres n'ont pas servi en 2026.
- Le message le plus fréquent n'a pas de code : « L'acte de gestion ACRE … n'est pas autorisé (traversabilité) », 279 occurrences dans 45 fichiers, soit 45 % des messages.
- Anomalies de structure : un seul fichier, qui contient en double une 000, une 405, une 410 et une 999. Aucune 700 sans 400 en 2026 : le bénéficiaire implicite n'est couvert que par des fichiers synthétiques.

## Messages

| Message (masqué) | Occurrences | Fichiers | Entités | Code |
| --- | ---: | ---: | --- | --- |
| L'acte de gestion ACRE en date d'effet … n'est pas autorisé (traversabilité) pour le contrat … | 279 | 45 | 100 | aucun → `ERR028` |
| Acte de gestion Radiation d assure non traversable pour l'assuré de rang : … ,contrat : … | 88 | 43 | 400 | `ERR002` |
| Dans le cadre d'une souscription, le contrat … existe déjà (…) | 79 | 27 | 100 | `ERR005` |
| La garantie … de l'assuré de rang … ne peut etre radiée car elle n'est pas valide pour le contrat … | 60 | 7 | 700 | `ERR010` |
| La garantie … de l'assuré de rang … ne peut etre radiée car elle n'existe pas pour le contrat … | 24 | 6 | 700 | `ERR027` |
| L'assuré de rang … existe déjà pour l'adjonction d'assuré | 19 | 12 | 400 | `ERR013` |
| L'acte de gestion ACRC en date d'effet … n'est pas autorisé (traversabilité) pour le contrat … | 14 | 11 | 100 | aucun → `ERR028` |
| L'adresse présente pour le role PERSONNE PRINCIPALE est incorrecte pour la personne de rang dans l'evenement … du contrat … | 8 | 8 | 120 | `ERR012` |
| Les données RO de la personne de rang dans l'evenement … du contrat … | 8 | 6 | 100 | `ERR019` |
| Acte de gestion Modification d assure non traversable pour l'assuré de rang : … ,contrat : … | 5 | 3 | 400 | `ERR001` |
| La garantie ASIMAMMA de l'assuré de rang … ne peut etre radiée car elle n'est pas valide pour le contrat … | 4 | 1 | 700 | `ERR010` |
| La garantie ASIMAMMA de l'assuré de rang … ne peut etre radiée car elle n'existe pas pour le contrat … | 4 | 1 | 700 | `ERR027` |
| Acte de gestion Changement de couverture non traversable pour l'assuré de rang : … ,contrat : … | 3 | 1 | 400 | aucun → `ERR031` |
| Doublon role ASSURE (ENTITE …) pour la personne de rang evt … du contrat … | 3 | 1 | 400 | aucun → `ERR032` |
| Le contrat … n'existe pas, ou bien n'est pas valide à la date d'effet de l'opération … | 3 | 3 | 100 | aucun → `ERR029` |
| Pour l'assure … du contrat … radiation impossible, c'est le seul assure valide a la date d'effet de l'operation | 3 | 2 | 100 | aucun → `ERR030` |
| Pour le contrat … et l'assuré de rang … on ne peut re-souscrire a la meme garantie SPRIMO | 3 | 3 | 100 | `ERR023` |
| Role ASSURE (ENTITE …) absent dans l'evenement souscription du contrat … de la personne de rang evt … | 3 | 2 | 100 | `ERR026` |
| L'acte de gestion ACMC en date d'effet … n'est pas autorisé (traversabilité) pour le contrat … | 2 | 1 | 100 | aucun → `ERR028` |
| Pour le contrat … et l'assuré de rang … on ne peut re-souscrire a la meme garantie ASIMAMATH | 2 | 1 | 100 | `ERR023` |
| Pour le contrat … et l'assuré de rang … on ne peut re-souscrire a la meme garantie SNAISECO | 2 | 1 | 100 | `ERR023` |
| Contrat … , échec de la réactivation du contrat. Valeur du code retour du SAD de réactivation contrat … | 1 | 1 | 100 | aucun → `ERR033` |
| Département tarifaire invalide | 1 | 1 | 400 | `ERR006` |
| Evenement rejeté, pour le contrat … il existe des doublons pour la personne de rang dans l'evenement … … … | 1 | 1 | 100 | `ERR007` |
| Le nom présent pour le role ACAS , , , , de la personne de rang … | 1 | 1 | 100 | `ERR017` |
| Pour le contrat … et l'assuré de rang … on ne peut re-souscrire a la meme garantie … | 1 | 1 | 100 | `ERR023` |
| Rang de naissance RO identique pour même date de naissance / numéro RO | 1 | 1 | 100 | `ERR025` |
| Sélection de la personne interdite … | 1 | 1 | 100 | aucun → `ERR034` |

Le tableau reprend la sortie de l'outil à la première relecture : colonne « À relire » retirée, codes ajoutés annotés « aucun → `ERRxxx` ». La version actuelle du masquage fusionne les « … » consécutifs (« … … … » de la ligne `ERR007` deviendrait « … »), sans changer le décompte.

## Nouveaux codes ajoutés

Ils sont ajoutés après `ERR027`. L'ordre de Lazarus est gardé : le premier code qui correspond l'emporte. Les recherches ne portent que sur les parties constantes des messages. Les parties masquées, ou celles où une double espace est possible (« Acte de gestion  … »), sont évitées.

| Code | Messages couverts | Recherches |
| --- | --- | --- |
| `ERR028` | L'acte de gestion ACRE, ACRC, ACMC (et tout autre code d'acte) … n'est pas autorisé (traversabilité) — 295 occurrences | début `L'acte de gestion` ; contient `en date d'effet` ; contient `n'est pas autorisé (traversabilité) pour le contrat`. `ERR011` (ACMA) passe avant et reste inchangé. |
| `ERR029` | Le contrat … n'existe pas, ou bien n'est pas valide **à** la date d'effet — variante accentuée d'`ERR015` (« a ») | début `Le contrat` ; contient `n'existe pas, ou bien n'est pas valide à la date d'effet de l'opération` |
| `ERR030` | Pour l'assure … du contrat … radiation impossible, c'est le seul assure valide | début `Pour l'assure` ; contient `du contrat` ; fin `radiation impossible, c'est le seul assure valide a la date d'effet de l'operation` |
| `ERR031` | Acte de gestion Changement de couverture non traversable | début `Acte de gestion` ; contient `Changement de couverture non traversable pour l'assuré de rang` |
| `ERR032` | Doublon role ASSURE (ENTITE …) | début `Doublon role ASSURE (ENTITE` ; contient `pour la personne de rang evt` |
| `ERR033` | Contrat … , échec de la réactivation du contrat. Valeur du code retour du SAD de réactivation contrat … | début `Contrat` ; contient `échec de la réactivation du contrat. Valeur du code retour du SAD de réactivation contrat` (ne correspond pas à `ERR004`, dont le texte diffère) |
| `ERR034` | Sélection de la personne interdite … | début `Sélection de la personne interdite` |

Codes ajoutés le 2026-10-22 (lot E). `npm run bilan:rejets` relancé : 28 messages reconnus, 0 sans code. Le corpus `OUT` est lui aussi entièrement reconnu, ce que vérifie une assertion de `rejet.corpus.test.ts`.

## Explications validées (2026-10-22)

> Ce tableau est lu par `src/shared/domain/ac056/codes-rejet.test.ts`, qui vérifie que `codes-rejet.ts` en reprend chaque texte à l'identique. Garder une ligne par code, au format `` | `ERRxxx` | texte | ``. Tout nouveau code doit y figurer (« Aucune explication… » pour un code sans texte validé).

Elles remplacent les textes provisoires « Aide ERRxxx » de Lazarus (écart 6 de la v0.3.0, divergence 12 de la v0.1.0). Chacune dit ce que MSP refuse et ce qu'il faut vérifier. Pas de fin commune (question 3).

« Traversabilité » : un acte dont la date d'effet est antérieure à d'autres opérations déjà enregistrées chez MSP sur le contrat ne peut pas être inséré avant elles (confirmé par l'utilisateur).

| Code | Explication |
| --- | --- |
| `ERR001` | MSP refuse la modification de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR002` | MSP refuse la radiation de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR003` | MSP refuse la réactivation de l'assuré de ce rang : des opérations déjà enregistrées chez MSP sur ce contrat empêchent de l'appliquer à cette date d'effet (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR004` | MSP ne peut pas réactiver le contrat : aucune résiliation de ce contrat n'est enregistrée chez MSP. Vérifiez dans VEOS que la résiliation a bien été transmise à MSP avant la réactivation. |
| `ERR005` | MSP refuse la souscription : le contrat existe déjà chez MSP. La souscription a probablement déjà été transmise ; vérifiez dans VEOS qu'il ne s'agit pas d'un doublon. |
| `ERR006` | Le département tarifaire transmis n'est pas reconnu par MSP. Vérifiez l'adresse et le département dans VEOS. |
| `ERR007` | MSP refuse l'évènement : la même personne apparaît plusieurs fois sur ce contrat (même rang). Vérifiez les bénéficiaires de l'évènement dans VEOS. |
| `ERR008` | Un jumeau est déjà enregistré sur le contrat avec le même rang de naissance, la même date de naissance et le même numéro de Sécurité sociale que cette personne. Donnez à chacun un rang de naissance différent dans VEOS. |
| `ERR009` | Le centre de paiement transmis est incohérent pour MSP. Vérifiez le centre de paiement et le régime obligatoire de la personne dans VEOS. |
| `ERR010` | MSP ne peut pas radier cette garantie : elle n'est pas valide sur le contrat à la date d'effet de la radiation. Vérifiez la garantie et la date d'effet dans VEOS. |
| `ERR011` | L'acte de gestion ACMA n'est pas autorisé à cette date d'effet sur ce contrat : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR012` | MSP refuse l'adresse de l'assuré principal. Vérifiez l'adresse dans VEOS (voie, code postal, localité). |
| `ERR013` | MSP refuse l'ajout de cet assuré : un assuré de ce rang existe déjà sur le contrat. Vérifiez le rang du bénéficiaire dans VEOS. |
| `ERR014` | L'assuré de ce rang existe déjà sur le contrat chez MSP, avec une autre date d'effet. Vérifiez le rang et la date d'effet dans VEOS. |
| `ERR015` | Le contrat est inconnu de MSP, ou n'est pas valide à la date d'effet de l'opération. Vérifiez le numéro de contrat et la date d'effet dans VEOS ; la souscription a peut-être été rejetée ou n'a pas encore été transmise. |
| `ERR016` | Ce contrat Madelin exige une date de début d'exercice. Renseignez-la dans VEOS. |
| `ERR017` | MSP refuse le nom de cette personne pour le rôle indiqué dans le message. Vérifiez le nom dans VEOS. |
| `ERR018` | MSP refuse le RIB de l'assuré principal. Vérifiez le RIB dans VEOS. |
| `ERR019` | MSP refuse les données de régime obligatoire de cette personne (numéro de Sécurité sociale, régime, caisse). Vérifiez-les dans VEOS. |
| `ERR020` | Le mode de règlement est le prélèvement ou le virement, mais aucun RIB de remboursement des prestations n'est transmis. Renseignez le RIB dans VEOS. |
| `ERR021` | Le fichier reçu par MSP ne contenait pas la ligne de fin de l'évènement (990) : le fichier envoyé était incomplet. |
| `ERR022` | MSP ne peut pas radier cette garantie : l'assuré n'aurait plus aucune garantie valide à la date d'effet. Gardez au moins une garantie, ou radiez l'assuré, dans VEOS. |
| `ERR023` | L'assuré a déjà cette garantie (code dans le message) : MSP refuse de la souscrire une seconde fois. Vérifiez dans VEOS qu'il ne s'agit pas d'un doublon. |
| `ERR024` | MSP n'a pas pu enregistrer les caractéristiques de cette personne (date de naissance, sexe…). Vérifiez-les dans VEOS ; si elles sont justes, contactez MSP. |
| `ERR025` | Deux personnes ont la même date de naissance, le même numéro de Sécurité sociale et le même rang de naissance (jumeaux). Donnez à chacune un rang de naissance différent dans VEOS. |
| `ERR026` | L'évènement de souscription ne contient pas l'assuré (entité 400) de cette personne. Vérifiez les bénéficiaires de l'évènement dans VEOS. |
| `ERR027` | MSP ne peut pas radier cette garantie : elle n'existe pas sur le contrat. Vérifiez la garantie radiée dans VEOS. |
| `ERR028` | L'acte de gestion indiqué dans le message n'est pas autorisé à cette date d'effet sur ce contrat : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR029` | Le contrat est inconnu de MSP, ou n'est pas valide à la date d'effet de l'opération. Vérifiez le numéro de contrat et la date d'effet dans VEOS ; la souscription a peut-être été rejetée ou n'a pas encore été transmise. |
| `ERR030` | Aucune explication : l'écran n'affiche que le code et le message de MSP (décision de l'utilisateur, 2026-10-22, démarche inconnue). |
| `ERR031` | Le changement de couverture de l'assuré de ce rang n'est pas autorisé à cette date d'effet : des opérations déjà enregistrées chez MSP l'en empêchent (traversabilité). Vérifiez la date d'effet dans VEOS ; si elle est juste, contactez MSP. |
| `ERR032` | Le même assuré figure deux fois (entité 400) dans l'évènement. Vérifiez les bénéficiaires de l'évènement dans VEOS. |
| `ERR033` | MSP n'a pas pu réactiver le contrat (erreur interne de MSP). Contactez MSP. |
| `ERR034` | MSP interdit la sélection de cette personne. Contactez MSP pour en connaître la raison. |

## Questions tranchées

1. ~~`ERR028` : un seul code ou un code par acte ?~~ **Un seul code** (réponse de l'utilisateur, 2026-10-22).
2. ~~`ERR029` : code distinct pour la variante accentuée d'`ERR015` ?~~ **Code distinct**, même explication (2026-10-22).
3. ~~Fin commune des explications ?~~ **Pas de fin commune** (2026-10-22) : la suite dépend du cas. Tantôt l'utilisateur corrige dans VEOS, ce qui produit un nouvel évènement dans le prochain fichier AC056 ; tantôt une liste de corrections est envoyée à MSP, qui corrige de son côté, pendant que le service corrige dans VEOS. Les explications s'arrêtent donc à ce qu'il faut vérifier.
4. ~~Sens de la « traversabilité » ?~~ **Hypothèse confirmée** (2026-10-22). Le sens des codes d'acte ACMA, ACRE, ACRC et ACMC n'est pas connu : les explications ne les détaillent pas.
