# Roadmap — Flussi

> Ce fichier liste les versions planifiées et leurs items. Chaque version est développée
> via `/version-start` et clôturée via `/version-finalize`.
> Les items terminés sont archivés dans `docs/archives/` à la fin de chaque version.

---

**Cible** : bascule en production (v1.0.0) **avant le 15 décembre 2026**. Les versions 0.x sont des étapes de développement internes.

---

## v0.3.0 — Écran AC056

Objectif : le service peut charger, contrôler et corriger un fichier AC056 local. C'est l'écran qui décidera de l'acceptation, face à la grille de Lazarus.

- Chargement d'un fichier issu de VEOS (UTF-8) ou de rejet (ANSI).
- Navigation par évènement, bénéficiaire, garantie et entité, avec contrôle à la sortie d'un champ et marquage des erreurs.
- Modification et enregistrement, même si le fichier contient encore des erreurs (le dépôt MSP les refuse).
- Rejets rattachés : message par ligne et explication `ERRxxx`.
- Liste récapitulative des erreurs (ligne, entité, champ, message ou `ERRxxx`). Un clic ouvre directement le champ concerné, et deux boutons passent à l'erreur précédente ou suivante.

## v0.4.0 — IGA et VEOS

Objectif : lancer l'export dans VEOS et récupérer le fichier AC056 sur le FTP IGA.

- Adapter `ftp-iga` et module `Iga` : liste des fichiers AC056 du dossier `APIVIA`, téléchargement vers IN.
- Avertissement « fichier non du jour » conservé (parité Lazarus) : l'utilisateur peut choisir n'importe quel fichier sur le FTP IGA. Le message reste utile malgré la surveillance après lancement et l'anti-doublon.
- FTP IGA (workflow lancé habituellement entre 17 h et 18 h 30, parfois en rattrapage le lendemain matin) : un fichier pas encore apparu ou en cours d'écriture n'est téléchargé qu'une fois sa taille stable. Plusieurs fichiers le même jour (cas rare, contenus distincts) sont tous listés et traitables, sans sélection automatique du dernier.
- Adapter `veos` et module `Veos` : saisie des identifiants personnels, pilotage de la fenêtre cachée, lancement d'`EXPORT_APIVIA`.
- Succès du lancement VEOS = fait observé : après le déclenchement d'`EXPORT_APIVIA`, Flussi surveille le FTP IGA jusqu'à l'apparition du fichier du jour (délai configurable). Sinon, échec explicite qui renvoie à la procédure manuelle (couvre MFA, SSO, page de connexion modifiée).
- Mode « fenêtre visible » pour le pilotage VEOS, activable par l'utilisateur ou en repli automatique quand le pilotage caché échoue : diagnostic, saisie d'un code MFA, lancement manuel du workflow.
- Erreurs de connexion VEOS et FTP IGA différenciées : cause probable (identifiants, hôte injoignable, port fermé, certificat TLS du proxy, délai) et action conseillée, au lieu d'un « échec de connexion » générique.

## v0.5.0 — MSP

Objectif : déposer l'AC056 chez MSP et récupérer les rejets.

- Adapter `sftp-msp` : connexion sur le port 10022 (mot de passe et clé), garde-fou hôte/mode testé dans les deux sens (aucun dépôt vers `mft.macif.fr` en recette, aucun vers `mft-hp.macif.fr` en prod).
- Module `Msp` : dépôt dans `/Depot_AMM_NAS` avec listing de vérification, liste et téléchargement des rejets de `/Retrait` vers OUT, empreinte SHA-256 de chaque dépôt tracée dans le journal.
- Anti-doublon avant le dépôt : l'empreinte SHA-256 du fichier est comparée à celles des dépôts du journal. Si elle est connue, avertissement bloquant (date et auteur du dépôt précédent), et dépôt possible seulement après confirmation explicite.
- Dépôt SFTP interrompu : les tailles distante et locale sont comparées après le dépôt. En cas d'écart, le dépôt est signalé incomplet et n'est pas tracé comme réussi. Refus d'écraser un fichier du même nom dans `/Depot_AMM_NAS`.
- Rattachement automatique de chaque rejet de `/Retrait` à son dépôt d'origine dans le journal (par le nom, la date ou l'empreinte). L'historique affiche l'état de chaque dépôt : en attente de rejet, sans rejet, ou rejeté avec N lignes.
- Erreurs de connexion SFTP MSP différenciées : cause probable (identifiants, hôte injoignable, port fermé, clé refusée, délai) et action conseillée, au lieu d'une erreur brute de `ssh2-sftp-client`.

## v0.6.0 — Parcours complet et recette

Objectif : le cycle complet tourne de bout en bout en mode recette, et le service administratif le teste.

- Enchaînement VEOS → IGA → AC056 → MSP → rejets en mode recette, sans intervention manuelle.
- Bouton « Tester les connexions » dans Paramètres : FTP IGA, SFTP MSP (hôte, port 10022, mot de passe, clé), page VEOS, lecture et écriture dans IN, OUT et Journal, avec un résultat clair pour chaque point.
- Recette avec le service administratif et correction des écarts relevés.

## v1.0.0 — Mise en production

Objectif : Flussi remplace Lazarus en production, avant le 15 décembre 2026.

- `config.json` de production déployé par Intune, avec `FLUSSI_ENV` explicite.
- Déploiement Intune (ou installation manuelle si l'installeur est bloqué).
- Contrôles de conformité AC056 : tout fichier écrit par Flussi est rechargé dans Lazarus et passe ses contrôles sans erreur ; un fichier VEOS enregistré sans modification reste identique à l'octet près sur le corpus.
- Critère de validation de Flussi : l'acceptation par les utilisateurs du service administratif. Elle déclenche le renommage du dossier Lazarus sur `P:` (`flussi_old`), conservé quelques semaines comme solution de repli, puis supprimé.
