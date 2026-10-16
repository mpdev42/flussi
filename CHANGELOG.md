# Changelog

## [0.2.0] — 2026-10-16

### Socle applicatif

- **Dependabot encadré** — seulement les mises à jour de sécurité, regroupées en une seule PR, avec des règles `ignore` qui reprennent les contraintes de versions ; procédure « traite les PR Dependabot » dans `CLAUDE.md`.
- **Configuration et démarrage de l'application** — modes `recette` et `prod` (`FLUSSI_ENV`, `%ProgramData%\Flussi\config.json` pour l'application installée, `.env` seul en dev, `prod` refusé en dev), refus de démarrer sur une configuration invalide sans jamais de repli sur `prod`, instance unique, cadre de l'application (titre, bandeau Recette, navigation, version).
- **Adapter `stockage` et `P:` instable** — emplacements logiques `in`, `out`, `journal` dérivés de la racine de travail, octets bruts, chemins contrôlés, nouvelles tentatives sur les verrous OneDrive, copies de conflit signalées, boîte « Réessayer » / « Quitter » au démarrage.
- **Module `Journal`** — un fichier de session par lancement (`Journal\AAAA\MM\AAAAMMJJ-HHMMSS-{compte}.txt`), écrit au fil de l'eau en UTF-8 sans BOM et CRLF, jamais de perte silencieuse (bandeau « Journal non enregistré ») ; écran d'historique par année et mois, avec le détail d'une session.
- **Premier installeur NSIS** — installeur par machine, droits de `%ProgramData%\Flussi`, nouvelle icône ; déploiement, mise à jour et désinstallation par Intune validés sur le poste pilote, sans blocage de la solution de sécurité ; procédure dans `docs/deploiement-intune.md`.
- **Écran Paramètres** — mode, racine de travail, `IN`, `OUT`, `Journal` et version en lecture seule, avec l'origine de chaque valeur et un bouton « Ouvrir dans l'Explorateur » par dossier.
- **Secrets techniques** — mots de passe FTP IGA et SFTP MSP et clé privée MSP saisis une fois par poste depuis Paramètres, chiffrés par DPAPI au niveau de la machine (`secrets.bin`), écrits par Flussi relancé élevé (une seule invite UAC, sans PowerShell ni `cmd.exe`) ; jamais relus ni affichés, chaque enregistrement tracé au journal sans la valeur.

## [0.1.0] — 2026-10-14

### Domaine AC056

- **Corpus de référence AC056 (hors dépôt)** — accès des tests aux fichiers réels sur `P:` (`npm run test:corpus`, comparaisons par SHA-256 sans jamais afficher de valeur) et copie des sources Lazarus de référence.
- **Description des entités AC056 (000 à 999)** — 22 entités en largeur fixe : positions, longueurs, types, bourrage, champs affichés et modifiables, valeurs autorisées, vérifiés contre `uac056.pas` et `fmain.lfm`.
- **Lecteur et écrivain AC056** — lecture, écriture et modification d'un champ ; un fichier relu puis réécrit sans modification est identique à l'original, octet par octet.
- **Fichiers AC056 mal formés** — anomalies de structure localisées par numéro de ligne, sans perte de ligne, le reste du fichier restant consultable.
- **Règles de contrôle, jeu de caractères et codes de rejet ERRxxx** — portage à l'identique des contrôles de Lazarus, contrôle du jeu de caractères sur tous les champs, table des 27 codes `ERRxxx` et de leur explication.
- **Fichiers de rejet MSP (Windows-1252)** — lecture seule des rejets, décodage des messages et rattachement de chaque message à son code `ERRxxx`.
