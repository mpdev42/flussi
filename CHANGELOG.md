# Changelog

## [0.1.0] — 2026-10-14

### Domaine AC056

- **Corpus de référence AC056 (hors dépôt)** — accès des tests aux fichiers réels sur `P:` (`npm run test:corpus`, comparaisons par SHA-256 sans jamais afficher de valeur) et copie des sources Lazarus de référence.
- **Description des entités AC056 (000 à 999)** — 22 entités en largeur fixe : positions, longueurs, types, bourrage, champs affichés et modifiables, valeurs autorisées, vérifiés contre `uac056.pas` et `fmain.lfm`.
- **Lecteur et écrivain AC056** — lecture, écriture et modification d'un champ ; un fichier relu puis réécrit sans modification est identique à l'original, octet par octet.
- **Fichiers AC056 mal formés** — anomalies de structure localisées par numéro de ligne, sans perte de ligne, le reste du fichier restant consultable.
- **Règles de contrôle, jeu de caractères et codes de rejet ERRxxx** — portage à l'identique des contrôles de Lazarus, contrôle du jeu de caractères sur tous les champs, table des 27 codes `ERRxxx` et de leur explication.
- **Fichiers de rejet MSP (Windows-1252)** — lecture seule des rejets, décodage des messages et rattachement de chaque message à son code `ERRxxx`.
