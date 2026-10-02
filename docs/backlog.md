# Backlog — Flussi

> Ce fichier centralise les idées d'évolution, bugs connus et questions ouvertes.
> Quand un item est planifié dans une version, il est déplacé dans `docs/roadmap.md`.
> Centraliser toutes les notes ici. Ne pas créer d'autre fichier de notes.

---

## Améliorations

- Journal : arborescence de Lazarus conservée (`Journal\AAAA\MM\`, mois de `01` à `12`), un fichier par session, sans index commun. Nom `AAAAMMJJ-HHMMSS.txt` suffixé du compte Windows (ex. `20261002-141425-c.mathevon.txt`), écrit en ajout seul. L'historique se lit en parcourant les dossiers.
- Succès du lancement VEOS = fait observé : après le déclenchement d'`EXPORT_APIVIA`, Flussi surveille le FTP IGA jusqu'à l'apparition du fichier du jour (délai configurable). Sinon, échec explicite qui renvoie à la procédure manuelle (couvre MFA, SSO, page de connexion modifiée).
- Anti-doublon avant le dépôt MSP : l'empreinte SHA-256 du fichier est comparée à celles des dépôts du journal. Si elle est connue, avertissement bloquant (date et auteur du dépôt précédent), et dépôt possible seulement après confirmation explicite.
- Erreurs de connexion VEOS, FTP IGA et SFTP MSP différenciées : cause probable (identifiants, hôte injoignable, port fermé, certificat TLS du proxy, clé refusée, délai) et action conseillée, au lieu d'un « échec de connexion » générique ou d'une erreur brute de `ssh2-sftp-client`.
- Secrets MSP jamais saisis par les utilisateurs : l'administrateur les renseigne une fois après le déploiement (mot de passe au clavier, clé `.ppk` FileZilla importée par un sélecteur de fichier, convertie avec PuTTYgen si elle est au format PPK v3). Stockage chiffré choisi à l'implémentation, jamais affiché, utilisable par les utilisateurs du service. Pas de procédure de rotation (remplace la règle `safeStorage` par utilisateur du `CLAUDE.md`).
- Écran AC056 : liste récapitulative des erreurs (ligne, entité, champ, message ou `ERRxxx`). Un clic ouvre directement le champ concerné, et des raccourcis clavier passent à l'erreur suivante ou précédente. Objectif : corriger quinze erreurs au moins aussi vite que dans Lazarus.
- Mode « fenêtre visible » pour le pilotage VEOS, activable par l'utilisateur ou en repli automatique quand le pilotage caché échoue : diagnostic, saisie d'un code MFA, lancement manuel du workflow.
- Rattachement automatique de chaque rejet de `/Retrait` à son dépôt d'origine dans le journal (par le nom, la date ou l'empreinte). L'historique affiche l'état de chaque dépôt : en attente de rejet, sans rejet, ou rejeté avec N lignes.
- Bouton « Tester les connexions » dans Paramètres : FTP IGA, SFTP MSP (hôte, port 10022, mot de passe, clé), page VEOS, lecture et écriture dans IN, OUT et Journal, avec un résultat clair pour chaque point.
- Avertissement « fichier non du jour » conservé (parité Lazarus) : l'utilisateur peut choisir n'importe quel fichier sur le FTP IGA. Le message reste utile malgré la surveillance après lancement et l'anti-doublon.
- Version de l'application visible dans l'interface et inscrite dans chaque fichier de session du journal, pour vérifier le déploiement Intune et savoir avec quelle version un fichier a été déposé.

## Bugs probables / cas limites

- Jeu de caractères AC056 autorisé, ASCII uniquement : `0`-`9`, `A`-`Z`, espace, `-`, `'`, `/`, `.`, ainsi que `a`-`z`, `_` et `@` pour la validation des e-mails (hypothèse de travail). Tout octet hors de ce jeu (accent, caractère multi-octets venu de VEOS) est signalé en erreur sur son champ, sans décaler les champs suivants. Tests avec un caractère interdit à différentes positions.
- Fichier VEOS enregistré sans modification identique à l'octet près : CRLF ou LF, BOM UTF-8, saut de ligne final, espaces de bourrage, ligne vide finale. Test de non-régression par SHA-256 sur un corpus réel rangé sur `P:`, pas dans le dépôt.
- `config.json` absent, partiel ou illisible, ou `FLUSSI_ENV` vide ou invalide : l'application refuse de démarrer avec un message clair, sans repli sur `prod`. Le garde-fou hôte/mode de `sftp-msp` est testé dans les deux sens.
- Rejets MSP en ANSI (Windows-1252), dont les messages peuvent contenir des accents : décodage en Windows-1252 sans confusion avec l'UTF-8, et signalement d'un fichier dont l'encodage ne correspond pas à son origine.
- `P:` indisponible ou instable (non monté, déconnecté, verrou OneDrive `EBUSY`/`EPERM`, copies de conflit `*-NOMPOSTE*`) : vérification des trois dossiers au démarrage, signalement du dossier inaccessible et courte nouvelle tentative en cas de verrou. Jamais d'échec silencieux ni d'écrasement.
- FTP IGA (workflow lancé habituellement entre 17 h et 18 h 30, parfois en rattrapage le lendemain matin) : un fichier pas encore apparu ou en cours d'écriture n'est téléchargé qu'une fois sa taille stable. Plusieurs fichiers le même jour (cas rare, contenus distincts) sont tous listés et traitables, sans sélection automatique du dernier.
- Dépôt SFTP interrompu : les tailles distante et locale sont comparées après le dépôt. En cas d'écart, le dépôt est signalé incomplet et n'est pas tracé comme réussi. Refus d'écraser un fichier du même nom dans `/Depot_AMM_NAS`.
- Fichiers AC056 mal formés (vide, tronqué, longueur de ligne incorrecte, entité hors 000 à 800, ordre inattendu, en-tête 000 ou pied absent) : erreurs localisées par numéro de ligne, et le reste du fichier reste consultable. Mesurer le chargement et la navigation sur le plus gros fichier réel.
- Instance unique : un second lancement remet au premier plan la fenêtre déjà ouverte, pour éviter deux sessions simultanées sur le même poste.

## Questions ouvertes

- L'installeur non signé, déployé par Intune, est-il bloqué par Defender ou par une règle ASR ? Test tôt sur un poste pilote avec un compte standard (installation, premier lancement, mise à jour). En cas de blocage, aucun achat : installation manuelle sur les postes, qui se trouvent dans les mêmes locaux que la DSI, en confirmant l'alerte SmartScreen éventuelle à chaque installation et mise à jour.
- Critère de validation de Flussi, qui déclenche le renommage du dossier Lazarus sur `P:` : l'acceptation par les utilisateurs du service administratif. Les prérequis techniques ne changent pas : un fichier écrit par Flussi passe les contrôles de Lazarus, et un fichier VEOS enregistré sans modification reste identique à l'octet près.
- Rétention : Flussi ne purge ni n'archive les fichiers IN, OUT et Journal. Le nettoyage reste manuel.
